import os
import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.vector_store import get_embeddings as _core_get_embeddings
from langchain_community.vectorstores import FAISS

logger = logging.getLogger(__name__)

# Base directory where isolated per-tenant vector databases are stored
BASE_VECTOR_STORE_DIR = os.path.join(os.getcwd(), "vector_store")

def get_embeddings_model():
    """Initializes the local open-source BAAI embedding model."""
    return _core_get_embeddings()

def _get_user_vector_path(user_id: str) -> str:
    """
    Generates a secure, sanitized, tenant-isolated index path 
    to prevent path traversal exploits.
    """
    if not user_id:
        user_id = "default_user"
    clean_user_id = "".join(c for c in user_id if c.isalnum() or c in ("-", "_"))
    return os.path.join(BASE_VECTOR_STORE_DIR, f"user_{clean_user_id}")

def process_and_store_text(text: str, filename: str, user_id: str = "default_user") -> int:
    """
    Chunks the document text, converts it to vector embeddings,
    and saves it strictly inside the tenant's isolated FAISS partition.
    """
    # 1. Chunk the text into manageable pieces (1000 characters per chunk)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = text_splitter.split_text(text)
    
    if not chunks:
        return 0

    # Attach metadata including source filename and owner tenant ID
    metadatas = [
        {"source": filename, "chunk_id": i, "user_id": user_id} 
        for i in range(len(chunks))
    ]
    
    user_path = _get_user_vector_path(user_id)
    logger.info(f"Generating embeddings for {len(chunks)} chunks (User: '{user_id}')...")
    embeddings = get_embeddings_model()
    
    # 2. Store in FAISS inside the user's private folder
    if os.path.exists(os.path.join(user_path, "index.faiss")):
        vectorstore = FAISS.load_local(
            user_path, 
            embeddings, 
            allow_dangerous_deserialization=True
        )
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    else:
        vectorstore = FAISS.from_texts(texts=chunks, embedding=embeddings, metadatas=metadatas)
    
    # 3. Save the tenant-isolated index back to disk
    os.makedirs(user_path, exist_ok=True)
    vectorstore.save_local(user_path)
    logger.info(f"Successfully saved {len(chunks)} chunks to isolated index at '{user_path}'.")
    
    return len(chunks)

def search_vector_store(query: str, user_id: str = "default_user", k: int = 4) -> str:
    """
    Searches the tenant's isolated FAISS DB for the top 'k' chunks 
    most similar to the user's question.
    """
    user_path = _get_user_vector_path(user_id)
    
    if not os.path.exists(os.path.join(user_path, "index.faiss")):
        return f"No documents have been ingested yet for account '{user_id}'."
    
    embeddings = get_embeddings_model()
    # Load the user's isolated DB securely
    vectorstore = FAISS.load_local(
        user_path, 
        embeddings, 
        allow_dangerous_deserialization=True 
    )
    
    # Perform similarity search scoped strictly to this tenant
    docs = vectorstore.similarity_search(query, k=k)
    
    # Combine the matched chunks into a single text block
    context = "\n\n---\n\n".join([doc.page_content for doc in docs])
    return context
