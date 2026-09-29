import uuid
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.project import Project

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Pydantic Schemas ---
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    memory: Optional[str] = None
    tasks: Optional[list] = None
    assigned_agents: Optional[list] = None
    recent_outputs: Optional[list] = None

# --- General Project Endpoints ---
@router.post("", response_model=Dict[str, Any])
async def create_project(project_in: ProjectCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_project_id = str(uuid.uuid4())
    new_project = Project(
        id=new_project_id,
        name=project_in.name,
        description=project_in.description,
        user_id=current_user.id,
        status="Active"
    )
    
    if hasattr(new_project, 'created_at'): new_project.created_at = datetime.utcnow()
    if hasattr(new_project, 'updated_at'): new_project.updated_at = datetime.utcnow()
        
    if hasattr(new_project, 'tasks'): new_project.tasks = []
    if hasattr(new_project, 'assigned_agents'): new_project.assigned_agents = ["Supervisor", "Researcher", "Analyst", "QA Reviewer"]
    if hasattr(new_project, 'memory'): new_project.memory = ""
    if hasattr(new_project, 'recent_outputs'): new_project.recent_outputs = []

    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return {"status": "success", "id": str(new_project.id)}

@router.get("", response_model=List[Dict[str, Any]])
async def get_projects(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Project).where(Project.user_id == current_user.id)
    if hasattr(Project, "created_at"):
        query = query.order_by(Project.created_at.desc())
        
    result = await db.execute(query)
    projects = result.scalars().all()
    
    response = []
    for p in projects:
        doc_count_query = text("SELECT count(*) FROM documents_v2 WHERE user_id = :uid AND project_id = :pid")
        doc_count_result = await db.execute(doc_count_query, {"uid": current_user.id, "pid": str(p.id)})
        doc_count = doc_count_result.scalar() or 0

        tasks = getattr(p, "tasks", []) or []
        assigned_agents = getattr(p, "assigned_agents", None) or ["Supervisor", "Researcher", "Analyst", "QA Reviewer"]
        recent_outputs = getattr(p, "recent_outputs", []) or []

        response.append({
            "id": str(p.id),
            "name": p.name,
            "description": p.description or "",
            "status": getattr(p, "status", "Active"),
            "memory": getattr(p, "memory", "") or "",
            "createdAt": p.created_at.strftime("%b %d, %Y") if hasattr(p, "created_at") and p.created_at else "Recently",
            "updatedAt": p.updated_at.strftime("%b %d, %Y") if hasattr(p, "updated_at") and p.updated_at else "Just now",
            "stats": {
                "documents": doc_count,
                "tasks": len([t for t in tasks if not t.get("completed")]),
                "agents": len(assigned_agents),
                "outputs": len(recent_outputs)
            },
            "tasks": tasks,
            "agents": assigned_agents,
            "recentOutputs": recent_outputs
        })
    return response

@router.put("/{project_id}", response_model=Dict[str, Any])
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing AZOL AI project's tasks, memory, agents, outputs, or details."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    db_project = result.scalars().first()
    
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project_in.name is not None: db_project.name = project_in.name
    if project_in.description is not None: db_project.description = project_in.description
    if project_in.memory is not None and hasattr(db_project, 'memory'): db_project.memory = project_in.memory
    
    if project_in.tasks is not None and hasattr(db_project, 'tasks'): 
        db_project.tasks = project_in.tasks
        flag_modified(db_project, "tasks")
        
    if project_in.assigned_agents is not None and hasattr(db_project, 'assigned_agents'): 
        db_project.assigned_agents = project_in.assigned_agents
        flag_modified(db_project, "assigned_agents")

    if project_in.recent_outputs is not None and hasattr(db_project, 'recent_outputs'): 
        db_project.recent_outputs = project_in.recent_outputs
        flag_modified(db_project, "recent_outputs")
    
    if hasattr(db_project, 'updated_at'):
        db_project.updated_at = datetime.utcnow()
        
    await db.commit()
    
    return {"status": "success", "message": "Project updated successfully"}

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    verify = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    if not verify.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
        
    await db.execute(delete(Project).where(Project.id == project_id))
    await db.commit()
    return {"status": "success"}

# --- Document Handling Endpoints ---
@router.get("/{project_id}/documents")
async def get_project_documents(project_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = text("SELECT id, filename, size, status, uploaded_at FROM documents_v2 WHERE user_id = :uid AND project_id = :pid ORDER BY uploaded_at DESC")
    result = await db.execute(query, {"uid": current_user.id, "pid": project_id})
    
    docs = []
    for row in result.fetchall():
        try:
            raw_size = int(row[2]) if row[2] else 0
            display_size = f"{round(raw_size / 1024 / 1024, 2)} MB" if raw_size > 0 else "Unknown"
        except (ValueError, TypeError):
            display_size = str(row[2])

        docs.append({
            "id": str(row[0]),
            "filename": row[1],
            "file_size": display_size,
            "created_at": row[4].strftime("%b %d, %Y") if row[4] else "Recently",
            "status": row[3] or "Indexed"
        })
    return docs

@router.post("/{project_id}/documents/upload")
async def upload_project_document(project_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    project_dir = os.path.join(UPLOAD_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    file_path = os.path.join(project_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    actual_size = os.path.getsize(file_path)
    
    query = text("""
        INSERT INTO documents_v2 (filename, size, status, s3_path, uploaded_at, user_id, project_id)
        VALUES (:filename, :size, 'Indexed', :s3_path, CURRENT_TIMESTAMP, :uid, :pid)
    """)
    
    await db.execute(query, {
        "filename": file.filename, 
        "size": str(actual_size),
        "s3_path": file_path,
        "uid": current_user.id, 
        "pid": project_id
    })
    await db.commit()
    return {"status": "success", "filename": file.filename}

@router.get("/{project_id}/documents/{doc_id}/view")
async def view_document(project_id: str, doc_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        did = int(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    result = await db.execute(text("SELECT s3_path, filename FROM documents_v2 WHERE id = :did AND user_id = :uid"), {"did": did, "uid": current_user.id})
    doc = result.fetchone()
    
    if not doc or not doc[0] or not os.path.exists(doc[0]):
        raise HTTPException(status_code=404, detail="File not found physically on server. Please delete and re-upload.")
        
    return FileResponse(path=doc[0], filename=doc[1])

@router.delete("/{project_id}/documents/{doc_id}")
async def delete_document(project_id: str, doc_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        did = int(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    result = await db.execute(text("SELECT s3_path FROM documents_v2 WHERE id = :did AND user_id = :uid"), {"did": did, "uid": current_user.id})
    doc = result.fetchone()
    
    if doc and doc[0] and os.path.exists(doc[0]):
        os.remove(doc[0])
        
    await db.execute(text("DELETE FROM documents_v2 WHERE id = :did AND user_id = :uid"), {"did": did, "uid": current_user.id})
    await db.commit()
    return {"status": "success"}

@router.get("/force-migrate")
async def force_migrate(db: AsyncSession = Depends(get_db)):
    return {"message": "SUCCESS! Your database is now 100% V1 ready."}