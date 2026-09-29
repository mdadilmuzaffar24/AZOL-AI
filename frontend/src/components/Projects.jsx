import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, Plus, Search, MoreVertical, Terminal, 
  FileText, CheckSquare, Users, BrainCircuit, Download,
  Activity, Clock, Calendar, Code, ArrowRight,
  X, Database, Loader2, UploadCloud, Trash2, Settings,
  Edit3, Save, Check, Eye, Bot, Send, Copy, ShieldCheck, Zap,
  Cpu, MessageSquare, Sparkles, PanelLeftClose, PanelLeftOpen,
  Maximize2, Minimize2, SlidersHorizontal
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';

const TABS = ['Overview', 'Chat', 'Documents', 'Tasks', 'Agents', 'Memory', 'Outputs'];

const EXT_MAP = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  markdown: 'md',
  shell: 'sh',
  bash: 'sh'
};

const MEMORY_PRESETS = [
  {
    label: 'Strict RAG Citations',
    rule: '• GROUNDING: Always prioritize indexed project documents. Cite exact filenames when referencing metrics or findings.'
  },
  {
    label: 'Production Code Standards',
    rule: '• CODE QUALITY: Write modular, type-annotated, PEP8-compliant Python and modern ES6+ React code with error handling.'
  },
  {
    label: 'Security & Privacy Guardrails',
    rule: '• SECURITY: Never expose raw API keys, credentials, or PII in generated outputs or SQL queries.'
  },
  {
    label: 'Executive Output Format',
    rule: '• FORMATTING: Structure responses with concise executive summaries, markdown tables for comparisons, and actionable next steps.'
  }
];

const AGENT_CATALOG = {
  'Supervisor': {
    icon: '🧠',
    role: 'Core Orchestrator',
    tools: ['Task Router', 'DAG Planner', 'Memory Sync'],
    defaultDirective: 'Route tasks across the project workforce, synthesize multi-agent outputs, and enforce project memory constraints.'
  },
  'Researcher': {
    icon: '🔍',
    role: 'RAG & Knowledge Retrieval',
    tools: ['FAISS Vector DB', 'Document Parser', 'Semantic Search'],
    defaultDirective: 'Query the project knowledge base and indexed documents to extract grounded citations and factual context.'
  },
  'Analyst': {
    icon: '⚡',
    role: 'Data & Code Execution',
    tools: ['Python Sandbox', 'DataFrames', 'Chart Generator'],
    defaultDirective: 'Analyze structured data, write clean Python scripts, and verify numerical accuracy against project data.'
  },
  'QA Reviewer': {
    icon: '🛡️',
    role: 'Compliance & Verification',
    tools: ['Hallucination Check', 'Policy Guard', 'Output Auditor'],
    defaultDirective: 'Validate all generated outputs against project directives, security rules, and quality standards before delivery.'
  },
  'Coding Agent': {
    icon: '💻',
    role: 'Software Engineering',
    tools: ['AST Linter', 'Code Synthesizer', 'Test Runner'],
    defaultDirective: 'Write production-grade, modular code adhering strictly to the repository architecture and style guidelines.'
  },
  'SQL Analyst': {
    icon: '🗄️',
    role: 'Database & Query Specialist',
    tools: ['PostgreSQL Inspector', 'Query Optimizer', 'Schema Mapper'],
    defaultDirective: 'Construct optimized, safe SQL queries and analyze relational schemas without mutating production tables.'
  },
  'Web Search Agent': {
    icon: '🌐',
    role: 'Live Intelligence',
    tools: ['Web Scraper', 'SERP Aggregator', 'Source Verifier'],
    defaultDirective: 'Retrieve up-to-date external benchmarks, research papers, and documentation to supplement internal project files.'
  },
  'Security Reviewer': {
    icon: '🔒',
    role: 'Vulnerability & Auth Audit',
    tools: ['Static Analysis', 'Secret Scanner', 'RBAC Validator'],
    defaultDirective: 'Audit code and workflows for security vulnerabilities, exposed credentials, and access control flaws.'
  }
};

const normalizeAgent = (entry) => {
  const name = typeof entry === 'string' ? entry : entry?.name || 'Specialist Agent';
  const catalogInfo = AGENT_CATALOG[name] || {
    icon: '🤖',
    role: 'Custom Project Specialist',
    tools: ['FAISS Vector DB', 'Context Engine'],
    defaultDirective: `Operate as the ${name} specialist for this project workspace and follow all project memory directives.`
  };

  return {
    name,
    icon: entry?.icon || catalogInfo.icon,
    role: entry?.role || catalogInfo.role,
    tools: entry?.tools || catalogInfo.tools,
    model: entry?.model || 'Llama 3.1 70B',
    status: entry?.status || 'Online',
    directive: entry?.directive || catalogInfo.defaultDirective
  };
};

const cleanMessageText = (rawText) => {
  if (!rawText) return '';
  let text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
  return text
    .replace(/^\[Project Context:.*?\]\s*/i, '')
    .replace(/\n\n\[Instruction:[\s\S]*?\]$/, '')
    .trim();
};

const CodeBlock = ({ className, children }) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!match) {
    return <code className="bg-slate-800 text-amber-200 px-1.5 py-0.5 rounded-md text-xs font-mono border border-slate-700 break-words">{children}</code>;
  }

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-slate-700/90 bg-[#141519] shadow-lg w-full max-w-full">
      <div className="flex justify-between items-center bg-slate-800/70 px-4 py-2 border-b border-slate-700/80 text-xs font-mono text-slate-400">
        <span className="uppercase font-semibold text-indigo-300 flex items-center">
          <Code className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
          {match[1]}
        </span>
        <button onClick={handleCopy} className="flex items-center text-slate-300 hover:text-white transition-colors bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
          {isCopied ? <Check className="w-3 h-3 mr-1 text-emerald-400"/> : <Copy className="w-3 h-3 mr-1"/>}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-indigo-200 leading-relaxed w-full">
        <code>{children}</code>
      </pre>
    </div>
  );
};

const MARKDOWN_COMPONENTS = {
  code: CodeBlock,
  p: ({node, ...props}) => <p className="mb-3 last:mb-0 text-slate-200 break-words" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1 text-slate-200" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1 text-slate-200" {...props} />,
  li: ({node, ...props}) => <li className="pl-1 break-words" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
  h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-3 mb-2 text-slate-100" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-md font-bold mt-3 mb-2 text-slate-100" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1 text-slate-200" {...props} />,
};

const DENSITY_CONFIG = {
  compact: {
    streamSpace: 'space-y-3 p-4',
    bubblePad: 'px-4 py-2.5',
    textSize: 'text-sm leading-normal'
  },
  comfortable: {
    streamSpace: 'space-y-5 p-6',
    bubblePad: 'px-5 py-4',
    textSize: 'text-[15px] leading-relaxed'
  },
  spacious: {
    streamSpace: 'space-y-8 p-8',
    bubblePad: 'px-6 py-5',
    textSize: 'text-base leading-loose'
  }
};

const Projects = ({ setActiveModule }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Manual Layout, Resizing & Spacing Controls
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(true);
  const [projectSidebarWidth, setProjectSidebarWidth] = useState(260);
  const [isThreadSidebarOpen, setIsThreadSidebarOpen] = useState(true);
  const [threadSidebarWidth, setThreadSidebarWidth] = useState(230);
  const [chatDensity, setChatDensity] = useState('comfortable'); // 'compact' | 'comfortable' | 'spacious'
  const [isFullWidth, setIsFullWidth] = useState(false);

  const isResizingProjectsRef = useRef(false);
  const isResizingThreadsRef = useRef(false);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignAgentModalOpen, setIsAssignAgentModalOpen] = useState(false);
  const [activeAgentSettings, setActiveAgentSettings] = useState(null);
  const [previewArtifact, setPreviewArtifact] = useState(null);
  const [isCreateArtifactModalOpen, setIsCreateArtifactModalOpen] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  // Agent Configuration Form States
  const [agentDirectiveInput, setAgentDirectiveInput] = useState('');
  const [agentModelInput, setAgentModelInput] = useState('Llama 3.1 70B');
  const [agentStatusInput, setAgentStatusInput] = useState('Online');
  const [customAgentNameInput, setCustomAgentNameInput] = useState('');
  const [customAgentRoleInput, setCustomAgentRoleInput] = useState('');
  const [isSavingAgent, setIsSavingAgent] = useState(false);

  // Artifact Creation Form States
  const [newArtifactName, setNewArtifactName] = useState('');
  const [newArtifactType, setNewArtifactType] = useState('md');
  const [newArtifactContent, setNewArtifactContent] = useState('');

  // Form Inputs
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectDescInput, setProjectDescInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Real Sub-module States
  const fileInputRef = useRef(null);
  const [projectDocuments, setProjectDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [memoryInput, setMemoryInput] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memorySavedBadge, setMemorySavedBadge] = useState(false);
  const [isViewingDoc, setIsViewingDoc] = useState(false);

  // Persistent Project Chat Thread States
  const [projectThreads, setProjectThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [activeStreamStatus, setActiveStreamStatus] = useState('Routing task...');
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Mouse Drag-to-Resize Listeners for Sidebars
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingProjectsRef.current) {
        const nextWidth = Math.min(400, Math.max(180, e.clientX - 240));
        setProjectSidebarWidth(nextWidth);
      } else if (isResizingThreadsRef.current) {
        const offsetLeft = isProjectSidebarOpen ? 240 + projectSidebarWidth : 240;
        const nextThreadWidth = Math.min(360, Math.max(160, e.clientX - offsetLeft - 32));
        setThreadSidebarWidth(nextThreadWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingProjectsRef.current = false;
      isResizingThreadsRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isProjectSidebarOpen, projectSidebarWidth]);

  useEffect(() => {
    if (selectedProject?.id) {
      setMemoryInput(selectedProject.memory || '');
      fetchProjectDocuments(selectedProject.id);
      loadProjectThreads(selectedProject.id);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages, isGeneratingChat]);

  const normalizedWorkforce = (selectedProject?.agents || []).map(normalizeAgent);
  const isMemoryDirty = (memoryInput || '') !== (selectedProject?.memory || '');
  const activeDensity = DENSITY_CONFIG[chatDensity] || DENSITY_CONFIG.comfortable;
  const containerWidthClass = isFullWidth ? 'max-w-none w-full' : 'max-w-5xl mx-auto';

  const saveThreadsToCache = (projectId, threadsList) => {
    if (!projectId) return;
    try {
      localStorage.setItem(`azol_proj_threads_${projectId}`, JSON.stringify(threadsList));
    } catch (e) {
      console.error("Failed to cache project threads:", e);
    }
  };

  const loadProjectThreads = async (projectId) => {
    setIsLoadingThreads(true);
    const prefix = `proj_${projectId}_t_`;
    let cachedThreads = [];

    try {
      const rawCache = localStorage.getItem(`azol_proj_threads_${projectId}`);
      if (rawCache) cachedThreads = JSON.parse(rawCache);
    } catch (e) {
      console.error("Cache parse error:", e);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/orchestrator/chat/threads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const dbProjectThreads = (res.data || []).filter(
        t => t.thread_id && t.thread_id.startsWith(prefix)
      );

      if (dbProjectThreads.length > 0) {
        const hydratedThreads = await Promise.all(
          dbProjectThreads.map(async (t) => {
            try {
              const histRes = await axios.get(
                `/api/v1/orchestrator/chat/history?thread_id=${t.thread_id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );
              const cachedMatch = cachedThreads.find(ct => ct.thread_id === t.thread_id);
              const messages = (histRes.data || []).map((m, idx) => ({
                role: m.role === 'ai' ? 'assistant' : m.role,
                content: m.role === 'user' ? cleanMessageText(m.content) : m.content,
                time: cachedMatch?.messages?.[idx]?.time || t.date_label || 'Saved'
              }));

              const firstUserMsg = messages.find(m => m.role === 'user')?.content;
              const cleanedTitle = cleanMessageText(t.title);

              return {
                id: t.thread_id.replace(prefix, ''),
                thread_id: t.thread_id,
                title: (cleanedTitle && !cleanedTitle.startsWith('Project Context'))
                  ? cleanedTitle.slice(0, 32)
                  : (firstUserMsg ? firstUserMsg.slice(0, 32) : (cachedMatch?.title || 'Project Thread')),
                messages
              };
            } catch (err) {
              console.error("Error loading thread history:", err);
              return null;
            }
          })
        );

        const validThreads = hydratedThreads.filter(Boolean);
        if (validThreads.length > 0) {
          setProjectThreads(validThreads);
          setActiveThread(validThreads[0]);
          saveThreadsToCache(projectId, validThreads);
          setIsLoadingThreads(false);
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching orchestrator threads:", error);
    }

    if (cachedThreads.length > 0) {
      setProjectThreads(cachedThreads);
      setActiveThread(cachedThreads[0]);
    } else {
      const defaultThread = {
        id: '1',
        thread_id: `${prefix}1`,
        title: 'Primary Architecture Thread',
        messages: []
      };
      setProjectThreads([defaultThread]);
      setActiveThread(defaultThread);
      saveThreadsToCache(projectId, [defaultThread]);
    }
    setIsLoadingThreads(false);
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProjects(response.data);
      if (response.data.length > 0) {
        const current = selectedProject ? response.data.find(p => p.id === selectedProject.id) : null;
        setSelectedProject(current || response.data[0]);
      } else {
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDocuments = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/projects/${projectId}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProjectDocuments(res.data);
    } catch (err) {
      console.error("Error fetching project documents:", err);
    }
  };

  const handleCreateProject = async () => {
    if (!projectNameInput.trim()) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/projects', 
        { name: projectNameInput, description: projectDescInput },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setIsCreateModalOpen(false);
      setProjectNameInput('');
      setProjectDescInput('');
      await fetchProjects();
    } catch (error) { console.error("Error creating project:", error); } 
    finally { setIsProcessing(false); }
  };

  const handleEditProject = async () => {
    if (!projectNameInput.trim() || !selectedProject) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/projects/${selectedProject.id}`, 
        { name: projectNameInput, description: projectDescInput },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setIsEditModalOpen(false);
      setShowProjectMenu(false);
      await fetchProjects();
    } catch (error) { console.error("Error updating project:", error); } 
    finally { setIsProcessing(false); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("Permanently delete this project?")) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/projects/${selectedProject.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.removeItem(`azol_proj_threads_${selectedProject.id}`);
      setShowProjectMenu(false);
      await fetchProjects();
    } catch (error) { console.error("Error deleting project:", error); } 
    finally { setIsProcessing(false); }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !selectedProject) return;
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`/api/v1/projects/${selectedProject.id}/documents/upload`, formData, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }
      await fetchProjectDocuments(selectedProject.id);
      await fetchProjects(); 
    } catch (err) { console.error("Upload error:", err); } 
    finally { setIsUploading(false); }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Remove this document permanently from the project?")) return;
    setProjectDocuments(prev => prev.filter(d => d.id !== docId));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/projects/${selectedProject.id}/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchProjects();
    } catch (err) { console.error("Error deleting document:", err); }
  };

  const handleViewDocument = async (docId, filename) => {
    setIsViewingDoc(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/projects/${selectedProject.id}/documents/${docId}/view`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob' 
      });
      
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', filename || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Could not download document.");
    } finally {
      setIsViewingDoc(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !selectedProject) return;
    const currentTasks = selectedProject.tasks || [];
    const newObj = { id: Date.now(), text: newTaskText.trim(), completed: false };
    const updatedTasks = [...currentTasks, newObj];
    
    setSelectedProject(prev => ({ ...prev, tasks: updatedTasks }));
    setNewTaskText('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/projects/${selectedProject.id}`, 
        { tasks: updatedTasks },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      await fetchProjects();
    } catch (err) { console.error("Error adding task:", err); }
  };

  const handleToggleTask = async (taskId) => {
    if (!selectedProject) return;
    const currentTasks = selectedProject.tasks || [];
    const updatedTasks = currentTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);

    setSelectedProject(prev => ({ ...prev, tasks: updatedTasks }));

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/projects/${selectedProject.id}`, 
        { tasks: updatedTasks },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      await fetchProjects();
    } catch (err) { console.error("Error toggling task:", err); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!selectedProject) return;
    const currentTasks = selectedProject.tasks || [];
    const updatedTasks = currentTasks.filter(t => t.id !== taskId);

    setSelectedProject(prev => ({ ...prev, tasks: updatedTasks }));

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/projects/${selectedProject.id}`, 
        { tasks: updatedTasks },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      await fetchProjects();
    } catch (err) { console.error("Error deleting task:", err); }
  };

  const handleSaveMemory = async () => {
    if (!selectedProject) return;
    setIsSavingMemory(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/projects/${selectedProject.id}`, 
        { memory: memoryInput },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setSelectedProject(prev => ({ ...prev, memory: memoryInput }));
      await fetchProjects();
      setMemorySavedBadge(true);
      setTimeout(() => setMemorySavedBadge(false), 2500);
    } catch (err) {
      console.error("Error saving memory:", err);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleInsertMemoryPreset = (ruleText) => {
    if (memoryInput.includes(ruleText)) return;
    const nextMemory = memoryInput.trim() ? `${memoryInput.trim()}\n\n${ruleText}` : ruleText;
    setMemoryInput(nextMemory);
  };

  const syncOutputsToBackend = async (updatedOutputsList) => {
    if (!selectedProject) return;
    setSelectedProject(prev => ({
      ...prev,
      recentOutputs: updatedOutputsList,
      stats: { ...prev.stats, outputs: updatedOutputsList.length }
    }));

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/projects/${selectedProject.id}`, 
        { recent_outputs: updatedOutputsList },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      await fetchProjects();
    } catch (err) {
      console.error("Error syncing outputs:", err);
    }
  };

  const handleSaveMessageAsArtifact = async (msgContent, customTitle = null) => {
    if (!selectedProject || !msgContent) return;
    const codeMatch = msgContent.match(/```(\w+)?\n([\s\S]*?)```/);
    const rawLang = (codeMatch?.[1] || 'md').toLowerCase();
    const ext = EXT_MAP[rawLang] || rawLang;
    const rawBody = codeMatch ? codeMatch[2] : msgContent;
    const sizeKb = `${Math.max(0.2, (rawBody.length / 1024)).toFixed(1)} KB`;
    const artifactName = customTitle || `${selectedProject.name.toLowerCase().replace(/\s+/g, '_')}_output_${(selectedProject.recentOutputs?.length || 0) + 1}.${ext}`;

    const newArtifact = {
      id: `art_${Date.now()}`,
      name: artifactName,
      type: ext,
      size: sizeKb,
      content: rawBody,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    const updatedOutputs = [newArtifact, ...(selectedProject.recentOutputs || [])];
    await syncOutputsToBackend(updatedOutputs);
  };

  const handleCreateCustomArtifact = async () => {
    if (!newArtifactName.trim() || !newArtifactContent.trim() || !selectedProject) return;
    const cleanExt = newArtifactType.replace('.', '').trim() || 'txt';
    const finalName = newArtifactName.trim().endsWith(`.${cleanExt}`)
      ? newArtifactName.trim()
      : `${newArtifactName.trim()}.${cleanExt}`;

    const newArtifact = {
      id: `art_${Date.now()}`,
      name: finalName,
      type: cleanExt,
      size: `${Math.max(0.1, (newArtifactContent.length / 1024)).toFixed(1)} KB`,
      content: newArtifactContent,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    const updatedOutputs = [newArtifact, ...(selectedProject.recentOutputs || [])];
    setNewArtifactName('');
    setNewArtifactContent('');
    setIsCreateArtifactModalOpen(false);
    await syncOutputsToBackend(updatedOutputs);
  };

  const handleDownloadOutputArtifact = (file, e = null) => {
    if (e) e.stopPropagation();
    const content = file.content || `# ${file.name}\nGenerated in ${selectedProject?.name}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'project_artifact.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteOutputArtifact = async (e, indexToDelete) => {
    e.stopPropagation();
    if (!selectedProject) return;
    if (!window.confirm("Remove this artifact from the project ledger?")) return;
    const updatedOutputs = (selectedProject.recentOutputs || []).filter((_, idx) => idx !== indexToDelete);
    await syncOutputsToBackend(updatedOutputs);
  };

  const syncAgentsToBackend = async (updatedAgentsList) => {
    if (!selectedProject) return;
    setSelectedProject(prev => ({
      ...prev,
      agents: updatedAgentsList,
      stats: { ...prev.stats, agents: updatedAgentsList.length }
    }));

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/v1/projects/${selectedProject.id}`, 
        { assigned_agents: updatedAgentsList },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      await fetchProjects();
    } catch (err) {
      console.error("Error syncing agents:", err);
    }
  };

  const handleAssignAgent = async (agentName, customRole = null) => {
    if (!selectedProject || !agentName.trim()) return;
    const exists = normalizedWorkforce.some(a => a.name.toLowerCase() === agentName.trim().toLowerCase());
    if (exists) {
      setIsAssignAgentModalOpen(false);
      return;
    }

    const newAgentObj = normalizeAgent({
      name: agentName.trim(),
      role: customRole?.trim() || undefined
    });

    const updatedAgents = [...normalizedWorkforce, newAgentObj];
    setCustomAgentNameInput('');
    setCustomAgentRoleInput('');
    setIsAssignAgentModalOpen(false);
    await syncAgentsToBackend(updatedAgents);
  };

  const handleRemoveAgent = async (agentName) => {
    if (!selectedProject) return;
    if (normalizedWorkforce.length <= 1) {
      alert("At least one agent must remain assigned to the project workspace.");
      return;
    }
    if (!window.confirm(`Unassign ${agentName} from ${selectedProject.name}?`)) return;
    const updatedAgents = normalizedWorkforce.filter(a => a.name !== agentName);
    await syncAgentsToBackend(updatedAgents);
  };

  const handleOpenAgentSettings = (agentObj) => {
    setActiveAgentSettings(agentObj);
    setAgentDirectiveInput(agentObj.directive);
    setAgentModelInput(agentObj.model || 'Llama 3.1 70B');
    setAgentStatusInput(agentObj.status || 'Online');
  };

  const handleSaveAgentSettings = async () => {
    if (!activeAgentSettings || !selectedProject) return;
    setIsSavingAgent(true);
    const updatedAgents = normalizedWorkforce.map(a => {
      if (a.name === activeAgentSettings.name) {
        return {
          ...a,
          directive: agentDirectiveInput.trim(),
          model: agentModelInput,
          status: agentStatusInput
        };
      }
      return a;
    });

    await syncAgentsToBackend(updatedAgents);
    setIsSavingAgent(false);
    setActiveAgentSettings(null);
  };

  const handleToggleAgentQuickStatus = async (agentObj) => {
    const nextStatus = agentObj.status === 'Online' ? 'Standby' : 'Online';
    const updatedAgents = normalizedWorkforce.map(a =>
      a.name === agentObj.name ? { ...a, status: nextStatus } : a
    );
    await syncAgentsToBackend(updatedAgents);
  };

  const handleDispatchToAgent = (agentObj) => {
    setActiveTab('Chat');
    setChatMessage(`@${agentObj.name}: `);
  };

  const handleCreateNewThread = () => {
    if (!selectedProject) return;
    const newId = String(Date.now());
    const newThread = {
      id: newId,
      thread_id: `proj_${selectedProject.id}_t_${newId}`,
      title: `Thread ${projectThreads.length + 1}`,
      messages: []
    };
    const updated = [newThread, ...projectThreads];
    setProjectThreads(updated);
    setActiveThread(newThread);
    saveThreadsToCache(selectedProject.id, updated);
  };

  const handleDeleteProjectThread = async (e, thread) => {
    e.stopPropagation();
    if (!selectedProject || projectThreads.length <= 1) return;
    if (!window.confirm("Delete this project thread?")) return;

    const filtered = projectThreads.filter(t => t.id !== thread.id);
    setProjectThreads(filtered);
    if (activeThread?.id === thread.id) {
      setActiveThread(filtered[0]);
    }
    saveThreadsToCache(selectedProject.id, filtered);

    try {
      const token = localStorage.getItem('token');
      const fullThreadId = thread.thread_id || `proj_${selectedProject.id}_t_${thread.id}`;
      await axios.delete(`/api/v1/orchestrator/chat/threads/${fullThreadId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Thread removed locally; backend delete skipped:", err);
    }
  };

  const handleSendProjectChat = async (overrideText = null) => {
    const textToSend = overrideText || chatMessage;
    const currentActiveThread = activeThread || projectThreads[0];
    if (!textToSend.trim() || !selectedProject || !currentActiveThread) return;

    const fullThreadId = currentActiveThread.thread_id || `proj_${selectedProject.id}_t_${currentActiveThread.id}`;
    const userMsg = {
      role: 'user',
      content: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedThreads = projectThreads.map(t => {
      if (t.id === currentActiveThread.id) {
        const updatedTitle = t.messages.length === 0 ? textToSend.trim().slice(0, 32) : t.title;
        return { ...t, thread_id: fullThreadId, title: updatedTitle, messages: [...t.messages, userMsg] };
      }
      return t;
    });

    setProjectThreads(updatedThreads);
    setActiveThread(updatedThreads.find(t => t.id === currentActiveThread.id));
    saveThreadsToCache(selectedProject.id, updatedThreads);
    if (!overrideText) setChatMessage('');
    setIsGeneratingChat(true);
    setActiveStreamStatus('Injecting project context & routing to agents...');

    const pendingTasks = (selectedProject.tasks || []).filter(t => !t.completed).map(t => `- [Pending] ${t.text}`).join('\n') || 'None';
    const completedTasks = (selectedProject.tasks || []).filter(t => t.completed).map(t => `- [Completed] ${t.text}`).join('\n') || 'None';
    const docNames = projectDocuments.map(d => `${d.filename} (${d.file_size})`).join(', ') || 'No documents uploaded yet';
    const memoryDirectives = memoryInput?.trim() || selectedProject.memory?.trim() || 'No custom memory directives set.';
    const activeAgentsSummary = normalizedWorkforce
      .filter(a => a.status !== 'Standby')
      .map(a => `- ${a.name} (${a.role} | ${a.model}): ${a.directive}`)
      .join('\n');

    const contextualPrompt = `${textToSend.trim()}

[Instruction: Answer the operator's request using the following live Project Workspace Context:
- Project Name: ${selectedProject.name}
- Project Description/Goals: ${selectedProject.description || 'Enterprise AI orchestration workspace'}
- Indexed Project Documents: ${docNames}
- Pending Tasks:
${pendingTasks}
- Completed Tasks:
${completedTasks}
- Assigned Workforce & Custom Agent Directives:
${activeAgentsSummary}
- Project Memory Directives: ${memoryDirectives}]`;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/orchestrator/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          thread_id: fullThreadId,
          message: contextualPrompt,
          agent_id: 'auto'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiReplyText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'node_update') {
                setActiveStreamStatus(`Agent [${data.node}] executing...`);
              } else if (data.type === 'complete') {
                aiReplyText = data.content;
              }
            } catch (e) {
              console.error("SSE parse error:", e);
            }
          }
        }
      }

      if (!aiReplyText) {
        aiReplyText = `### ${selectedProject.name} — Workspace Synthesis\n\n- **Indexed Documents:** ${docNames}\n- **Pending Tasks:**\n${pendingTasks}\n- **Completed Tasks:**\n${completedTasks}`;
      }

      const codeMatch = aiReplyText.match(/```(\w+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        await handleSaveMessageAsArtifact(aiReplyText);
      }

      const aiMsg = {
        role: 'assistant',
        content: aiReplyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalThreads = updatedThreads.map(t => {
        if (t.id === currentActiveThread.id) {
          return { ...t, thread_id: fullThreadId, messages: [...t.messages, aiMsg] };
        }
        return t;
      });

      setProjectThreads(finalThreads);
      setActiveThread(finalThreads.find(t => t.id === currentActiveThread.id));
      saveThreadsToCache(selectedProject.id, finalThreads);
    } catch (err) {
      console.error("Project chat error:", err);
      const fallbackSynthesis = `### ${selectedProject.name} — Live Context Summary\n\n**Project Goals:** ${selectedProject.description || 'Active AI OS Workspace'}\n\n**Indexed Documents (${projectDocuments.length}):** ${docNames}\n\n**Pending Tasks:**\n${pendingTasks}\n\n**Completed Tasks:**\n${completedTasks}`;
      const fallbackMsg = {
        role: 'assistant',
        content: fallbackSynthesis,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const fallbackThreads = updatedThreads.map(t => {
        if (t.id === currentActiveThread.id) {
          return { ...t, thread_id: fullThreadId, messages: [...t.messages, fallbackMsg] };
        }
        return t;
      });
      setProjectThreads(fallbackThreads);
      setActiveThread(fallbackThreads.find(t => t.id === currentActiveThread.id));
      saveThreadsToCache(selectedProject.id, fallbackThreads);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getFileIcon = (type) => {
    const cleanType = (type || '').toLowerCase();
    switch(cleanType) {
      case 'py':
      case 'python':
      case 'js':
      case 'jsx':
      case 'sql':
      case 'json':
        return <Code className="w-4 h-4 text-blue-400" />;
      case 'pdf': return <FileText className="w-4 h-4 text-rose-400" />;
      case 'xlsx':
      case 'csv':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      default: return <FileText className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0d0e12] relative overflow-hidden">
      
      {/* 1. RESIZABLE & COLLAPSIBLE LEFT PROJECTS SIDEBAR */}
      {isProjectSidebarOpen && (
        <div
          style={{ width: `${projectSidebarWidth}px` }}
          className="border-r border-slate-800/80 bg-[#131418] flex flex-col shrink-0 z-10 relative select-none"
        >
          <div className="p-4 border-b border-slate-800/80">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => { setProjectNameInput(''); setProjectDescInput(''); setIsCreateModalOpen(true); }}
                className="flex-1 flex items-center justify-center py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 truncate"
              >
                <Plus className="w-4 h-4 mr-1.5 shrink-0" /> New Project
              </button>
              <button
                onClick={() => setIsProjectSidebarOpen(false)}
                className="p-2.5 text-slate-400 hover:text-slate-200 bg-[#1e1f23] hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors"
                title="Collapse Projects Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-3.5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e1f23] border border-slate-700/50 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center p-4 text-sm text-slate-500">No projects found.</div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => { setSelectedProject(project); setShowProjectMenu(false); }}
                  className={`w-full flex flex-col text-left px-3 py-3 rounded-lg transition-all ${
                    selectedProject?.id === project.id ? 'bg-slate-800/80 border border-slate-700 shadow-sm' : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-semibold text-slate-200 truncate pr-2">{project.name}</span>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${project.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                  </div>
                  <div className="flex items-center text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3 mr-1" /> {project.updatedAt}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Interactive Drag Handle to Resize Projects Sidebar */}
          <div
            onMouseDown={() => {
              isResizingProjectsRef.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
            title="Drag to resize sidebar"
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/60 transition-colors z-30"
          />
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-full bg-[#181a1e] relative min-w-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
        ) : selectedProject ? (
          <>
            {/* Compact & Responsive Header */}
            <div className="px-6 pt-5 pb-0 border-b border-slate-800/80 bg-[#131418] shrink-0">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div className="flex items-start space-x-3">
                  {!isProjectSidebarOpen && (
                    <button
                      onClick={() => setIsProjectSidebarOpen(true)}
                      className="p-2 mt-0.5 text-slate-300 hover:text-white bg-[#1e1f23] hover:bg-indigo-600/20 rounded-lg border border-slate-700 transition-colors"
                      title="Expand Projects Sidebar"
                    >
                      <PanelLeftOpen className="w-5 h-5 text-indigo-400" />
                    </button>
                  )}
                  <div>
                    <div className="flex items-center space-x-3 mb-1.5">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <FolderKanban className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{selectedProject.name}</h1>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>{selectedProject.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" /> Created {selectedProject.createdAt} • Last active {selectedProject.updatedAt}
                    </p>
                  </div>
                </div>
                
                {/* Right Workspace Layout Controls & 3-Dots Menu */}
                <div className="flex items-center space-x-2">
                  {/* Manual Width Toggle */}
                  <button
                    onClick={() => setIsFullWidth(!isFullWidth)}
                    className={`hidden sm:flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isFullWidth
                        ? 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30'
                        : 'bg-[#1e1f23] text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                    title="Toggle Standard vs Full-Width Layout"
                  >
                    {isFullWidth ? <Minimize2 className="w-3.5 h-3.5 mr-1.5" /> : <Maximize2 className="w-3.5 h-3.5 mr-1.5" />}
                    {isFullWidth ? 'Standard Width' : 'Expand Width'}
                  </button>

                  {/* 3-Dots Dropdown Menu */}
                  <div className="relative">
                    <button onClick={() => setShowProjectMenu(!showProjectMenu)} className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {showProjectMenu && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-[#1e1f23] border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          <button onClick={() => { setProjectNameInput(selectedProject.name); setProjectDescInput(selectedProject.description); setIsEditModalOpen(true); setShowProjectMenu(false); }} className="w-full flex items-center px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors">
                            <Edit3 className="w-4 h-4 mr-3 text-indigo-400"/> Edit Project
                          </button>
                          <div className="h-px w-full bg-slate-800"></div>
                          <button onClick={handleDeleteProject} className="w-full flex items-center px-4 py-3 text-sm text-rose-400 hover:bg-slate-800 transition-colors">
                            <Trash2 className="w-4 h-4 mr-3"/> Delete Project
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 overflow-x-auto">
                {TABS.map(tab => (
                  <button key={tab} onClick={() => { setActiveTab(tab); setShowProjectMenu(false); }}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab View Body */}
            <div className={`flex-1 min-h-0 ${activeTab === 'Chat' ? 'overflow-hidden p-4' : 'overflow-y-auto p-6 sm:p-8'}`} onClick={() => setShowProjectMenu(false)}>
              
              {/* 1. OVERVIEW */}
              {activeTab === 'Overview' && (
                <div className={`${containerWidthClass} animate-in fade-in duration-300`}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#1e1f23] border border-slate-700/50 hover:border-emerald-500/40 p-5 rounded-2xl flex items-center cursor-pointer transition-colors" onClick={() => setActiveTab('Documents')}>
                      <div className="p-3 bg-emerald-500/10 rounded-xl mr-4"><FileText className="w-5 h-5 text-emerald-400"/></div>
                      <div>
                        <p className="text-2xl font-bold text-slate-100">{selectedProject.stats.documents}</p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</p>
                      </div>
                    </div>
                    <div className="bg-[#1e1f23] border border-slate-700/50 hover:border-amber-500/40 p-5 rounded-2xl flex items-center cursor-pointer transition-colors" onClick={() => setActiveTab('Tasks')}>
                      <div className="p-3 bg-amber-500/10 rounded-xl mr-4"><CheckSquare className="w-5 h-5 text-amber-400"/></div>
                      <div>
                        <p className="text-2xl font-bold text-slate-100">{selectedProject.stats.tasks}</p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Tasks</p>
                      </div>
                    </div>
                    <div className="bg-[#1e1f23] border border-slate-700/50 hover:border-blue-500/40 p-5 rounded-2xl flex items-center cursor-pointer transition-colors" onClick={() => setActiveTab('Agents')}>
                      <div className="p-3 bg-blue-500/10 rounded-xl mr-4"><Users className="w-5 h-5 text-blue-400"/></div>
                      <div>
                        <p className="text-2xl font-bold text-slate-100">{normalizedWorkforce.length}</p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Agents</p>
                      </div>
                    </div>
                    <div className="bg-[#1e1f23] border border-slate-700/50 hover:border-purple-500/40 p-5 rounded-2xl flex items-center cursor-pointer transition-colors" onClick={() => setActiveTab('Outputs')}>
                      <div className="p-3 bg-purple-500/10 rounded-xl mr-4"><Download className="w-5 h-5 text-purple-400"/></div>
                      <div>
                        <p className="text-2xl font-bold text-slate-100">{(selectedProject.recentOutputs || []).length}</p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Outputs</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center uppercase tracking-wider">
                          <BrainCircuit className="w-4 h-4 mr-2 text-indigo-400" /> Active Agents
                        </h3>
                        <div className="bg-[#131418] border border-slate-800 rounded-xl p-2">
                          {normalizedWorkforce.map((agent, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer" onClick={() => setActiveTab('Agents')}>
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mr-3 border border-indigo-500/20">
                                  {agent.icon}
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-slate-300 block">{agent.name}</span>
                                  <span className="text-[10px] font-mono text-slate-500">{agent.role} • {agent.model}</span>
                                </div>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                agent.status === 'Online'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {agent.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-indigo-100 mb-1">Resume Orchestration</h4>
                          <p className="text-xs text-indigo-200/70">Jump into the Project Chat with this workspace's context.</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('Chat')}
                          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                        >
                          <Terminal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-slate-200 flex items-center uppercase tracking-wider">
                            <Download className="w-4 h-4 mr-2 text-indigo-400" /> Recent Outputs
                          </h3>
                          <button onClick={() => setActiveTab('Outputs')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
                        </div>
                        {(selectedProject.recentOutputs || []).length === 0 ? (
                           <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-sm text-slate-500">
                             No files generated in this project yet.
                           </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedProject.recentOutputs.slice(0, 4).map((file, i) => (
                              <div
                                key={i}
                                onClick={() => setPreviewArtifact(file)}
                                className="group flex items-center justify-between p-3 bg-[#131418] border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center mr-3 shrink-0">
                                    {getFileIcon(file.type)}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                                    <p className="text-[10px] font-mono text-slate-500 uppercase">{file.type} • {file.size}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleDownloadOutputArtifact(file, e)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors shrink-0"
                                  title="Download Artifact"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CHAT TAB - With Resizable/Collapsible Thread Sidebar & Manual Spacing Controls */}
              {activeTab === 'Chat' && (
                <div className={`h-full flex flex-col animate-in fade-in duration-300 ${isFullWidth ? 'w-full' : 'max-w-6xl mx-auto'}`}>
                  <div className="flex h-full bg-[#131418] border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-w-0">
                    
                    {/* Resizable & Collapsible Thread Sidebar */}
                    {isThreadSidebarOpen && (
                      <div
                        style={{ width: `${threadSidebarWidth}px` }}
                        className="border-r border-slate-800/80 bg-[#16171c] flex flex-col shrink-0 relative select-none"
                      >
                        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Project Threads</span>
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={handleCreateNewThread}
                              className="p-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors border border-indigo-500/30"
                              title="New Thread"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setIsThreadSidebarOpen(false)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Hide Threads Sidebar"
                            >
                              <PanelLeftClose className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          {isLoadingThreads ? (
                            <div className="flex justify-center p-6"><Loader2 className="w-4 h-4 text-indigo-400 animate-spin" /></div>
                          ) : (
                            projectThreads.map(thread => (
                              <div
                                key={thread.id}
                                onClick={() => setActiveThread(thread)}
                                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs cursor-pointer transition-all ${
                                  activeThread?.id === thread.id 
                                    ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-300 font-semibold' 
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                }`}
                              >
                                <span className="truncate flex items-center pr-2 min-w-0">
                                  <Terminal className="w-3.5 h-3.5 mr-2 text-indigo-400 shrink-0" />
                                  <span className="truncate" title={cleanMessageText(thread.title)}>
                                    {cleanMessageText(thread.title)}
                                  </span>
                                </span>
                                <div className="flex items-center space-x-1 shrink-0">
                                  <span className="text-[10px] font-mono text-slate-500">{thread.messages.length}</span>
                                  {projectThreads.length > 1 && (
                                    <button
                                      onClick={(e) => handleDeleteProjectThread(e, thread)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                                      title="Delete Thread"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Drag Handle to Resize Thread Sidebar */}
                        <div
                          onMouseDown={() => {
                            isResizingThreadsRef.current = true;
                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                          }}
                          title="Drag to resize threads list"
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/60 transition-colors z-20"
                        />
                      </div>
                    )}

                    {/* Active Thread Chat Area */}
                    <div className="flex-1 flex flex-col bg-[#131418] relative min-w-0 overflow-hidden">
                      
                      {/* Context Injection & Manual Spacing Controller Bar */}
                      <div className="px-4 py-2.5 bg-[#181a1e] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                          {!isThreadSidebarOpen && (
                            <button
                              onClick={() => setIsThreadSidebarOpen(true)}
                              className="p-1.5 mr-1 text-slate-300 hover:text-white bg-[#131418] rounded-lg border border-slate-700 transition-colors"
                              title="Show Threads Sidebar"
                            >
                              <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                          )}
                          <span className="text-slate-400 font-medium">Context:</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
                            {projectDocuments.length} Docs
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[11px]">
                            {selectedProject.tasks?.filter(t => !t.completed).length || 0} Tasks
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-[11px]">
                            {normalizedWorkforce.filter(a => a.status === 'Online').length} Agents
                          </span>
                        </div>

                        {/* Manual Chat Spacing / Density Selector */}
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-[#131418] border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                            <SlidersHorizontal className="w-3 h-3 text-slate-500 mx-1.5" />
                            {['compact', 'comfortable', 'spacious'].map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setChatDensity(mode)}
                                className={`px-2 py-0.5 rounded-md capitalize transition-colors ${
                                  chatDensity === mode
                                    ? 'bg-indigo-600 text-white font-semibold'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title={`Set chat spacing to ${mode}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Messages Stream - Strictly Contained Horizontal Overflow */}
                      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${activeDensity.streamSpace}`}>
                        {(!activeThread || activeThread.messages.length === 0) ? (
                          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                              <BrainCircuit className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">Orchestrate with {selectedProject.name}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">
                              Ask questions, review pending tasks, or synthesize insights directly from your indexed project documents.
                            </p>
                            <div className="grid grid-cols-2 gap-2 w-full text-xs">
                              <button onClick={() => handleSendProjectChat("Summarize the main goals and indexed documents of this project.")} className="p-3 bg-[#1a1c23] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-left transition-colors">
                                📌 Summarize project goals
                              </button>
                              <button onClick={() => handleSendProjectChat("What tasks are currently pending and completed in this project?")} className="p-3 bg-[#1a1c23] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-left transition-colors">
                                ✅ Review pending tasks
                              </button>
                            </div>
                          </div>
                        ) : (
                          activeThread.messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-3 w-full min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                                  <Bot className="w-4 h-4"/>
                                </div>
                              )}
                              <div
                                className={`${activeDensity.bubblePad} rounded-2xl shadow-sm min-w-0 overflow-hidden ${
                                  msg.role === 'user'
                                    ? 'bg-[#2a2d33] border border-slate-700/50 text-slate-200 ml-auto rounded-tr-sm max-w-[80%]'
                                    : 'bg-[#181a1e]/70 border border-slate-800/90 text-slate-200 flex-1 max-w-full'
                                }`}
                              >
                                <div className={`${activeDensity.textSize} min-w-0 overflow-hidden`}>
                                  {msg.role === 'user' ? cleanMessageText(msg.content) : (
                                    <>
                                      <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                      </ReactMarkdown>
                                      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                          <span className="flex items-center"><Database className="w-3 h-3 mr-1 text-indigo-400"/> {projectDocuments.length} Docs</span>
                                          <span className="flex items-center"><Zap className="w-3 h-3 mr-1 text-amber-400"/> {msg.content.length * 2 + 120} Tokens</span>
                                          <span className="flex items-center text-emerald-400"><ShieldCheck className="w-3 h-3 mr-1"/> Persisted</span>
                                        </div>
                                        <button
                                          onClick={() => handleSaveMessageAsArtifact(msg.content)}
                                          className="flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 transition-colors"
                                          title="Save response as a downloadable artifact in Outputs tab"
                                        >
                                          <Download className="w-3 h-3 mr-1" /> Save to Outputs
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="mt-1.5 text-[10px] font-mono text-slate-500 opacity-70">
                                  {msg.time}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {isGeneratingChat && (
                          <div className="flex items-center space-x-3 text-slate-400 text-sm font-mono pl-11">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500"/>
                            <span>{activeStreamStatus}</span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input Bar */}
                      <div className="p-3.5 bg-[#181a1e] border-t border-slate-800 shrink-0">
                        <div className="flex items-center bg-[#131418] border border-slate-700/80 rounded-xl px-4 py-2 focus-within:border-indigo-500 transition-colors shadow-inner">
                          <input 
                            type="text" 
                            value={chatMessage} 
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendProjectChat()}
                            placeholder={`Message ${selectedProject.name} workforce...`}
                            className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none pr-4"
                          />
                          <button 
                            onClick={() => handleSendProjectChat()}
                            disabled={!chatMessage.trim() || isGeneratingChat}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-all shadow-md shadow-indigo-500/20"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* 3. DOCUMENTS TAB */}
              {activeTab === 'Documents' && (
                <div className={`${containerWidthClass} animate-in fade-in duration-300`}>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">Project Knowledge Base</h2>
                      <p className="text-sm text-slate-400 mt-1">Upload documents to bind them specifically to this project.</p>
                    </div>
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-400"/> : <UploadCloud className="w-4 h-4 mr-2 text-indigo-400" />} 
                      {isUploading ? 'Indexing Files...' : 'Upload Files'}
                    </button>
                  </div>

                  <div className="bg-[#131418] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    {projectDocuments.length === 0 ? (
                      <div className="p-12 text-center">
                        <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-200 mb-2">No documents indexed for this project</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">Upload PDFs, Word docs, or CSVs here to build the project memory.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-medium hover:bg-indigo-600/20 transition-colors">
                          Browse Files
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-[#1e1f23] text-xs uppercase text-slate-500 border-b border-slate-800">
                          <tr>
                            <th className="px-6 py-4 font-semibold tracking-wider">Filename</th>
                            <th className="px-6 py-4 font-semibold tracking-wider">Size</th>
                            <th className="px-6 py-4 font-semibold tracking-wider">Indexed Date</th>
                            <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                            <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {projectDocuments.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-6 py-4 flex items-center font-medium text-slate-200">
                                <FileText className="w-4 h-4 text-indigo-400 mr-3 shrink-0" />
                                <span className="truncate">{doc.filename}</span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">{doc.file_size}</td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">{doc.created_at}</td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">{doc.status}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end space-x-2">
                                    <button 
                                      onClick={() => handleViewDocument(doc.id, doc.filename)} 
                                      disabled={isViewingDoc}
                                      className="p-2 text-slate-400 hover:text-indigo-400 transition-colors bg-[#181a1e] rounded-lg border border-slate-700 hover:border-indigo-500/50"
                                      title="Download Document"
                                    >
                                       {isViewingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteDocument(doc.id)} 
                                      className="p-2 text-slate-400 hover:text-rose-400 transition-colors bg-[#181a1e] rounded-lg border border-slate-700 hover:border-rose-500/50"
                                      title="Delete Document"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* 4. TASKS TAB */}
              {activeTab === 'Tasks' && (
                <div className={`${containerWidthClass} animate-in fade-in duration-300`}>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">Task Manager</h2>
                      <p className="text-sm text-slate-400 mt-1">Real-time task tracking persisted to your database.</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#131418] border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex mb-8">
                      <input 
                        type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        placeholder="What needs to be done?" 
                        className="flex-1 bg-[#1e1f23] border border-slate-700 text-slate-200 text-sm rounded-l-xl px-5 py-3.5 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                      <button onClick={handleAddTask} className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-r-xl text-sm transition-all shadow-md shadow-indigo-500/20">
                        Add Task
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(!selectedProject.tasks || selectedProject.tasks.length === 0) ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-800/60 rounded-xl">
                          <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-400 font-medium">No tasks defined yet.</p>
                          <p className="text-xs text-slate-500 mt-1">Type above and press Add Task to create your first goal.</p>
                        </div>
                      ) : (
                        selectedProject.tasks.map(task => (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={task.id} 
                            className={`flex justify-between items-center p-4 bg-[#1e1f23] border rounded-xl hover:shadow-md transition-all group ${task.completed ? 'border-slate-800/80 bg-slate-800/20 opacity-60' : 'border-slate-700 hover:border-slate-600'}`}
                          >
                            <div className="flex items-center flex-1 cursor-pointer" onClick={() => handleToggleTask(task.id)}>
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-4 border transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 group-hover:border-indigo-400'}`}>
                                {task.completed && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <span className={`text-[15px] font-medium transition-all ${task.completed ? "line-through text-slate-500" : "text-slate-200"}`}>{task.text}</span>
                            </div>
                            <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800 opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-500/20">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. AGENTS TAB */}
              {activeTab === 'Agents' && (
                <div className={`${containerWidthClass} animate-in fade-in duration-300`}>
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-bold text-slate-100">Project Workforce</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
                          {normalizedWorkforce.filter(a => a.status === 'Online').length}/{normalizedWorkforce.length} Online
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        Configure specialist models, custom role directives, and execution status for <strong className="text-slate-200">{selectedProject.name}</strong>.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAssignAgentModalOpen(true)}
                      className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Assign Specialist
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {normalizedWorkforce.map((agent, idx) => (
                      <motion.div
                        key={agent.name + idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#131418] border border-slate-800 hover:border-slate-700/90 p-6 rounded-2xl flex flex-col justify-between transition-all shadow-sm"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center">
                              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mr-3.5 border border-indigo-500/20 text-2xl shrink-0">
                                {agent.icon}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-bold text-slate-100 text-base">{agent.name}</h3>
                                  <button
                                    onClick={() => handleToggleAgentQuickStatus(agent)}
                                    title="Click to toggle Online / Standby"
                                    className={`text-[10px] px-2 py-0.5 rounded-md border uppercase tracking-wider font-semibold transition-colors ${
                                      agent.status === 'Online'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                    }`}
                                  >
                                    {agent.status}
                                  </button>
                                </div>
                                <p className="text-xs text-indigo-400/90 font-medium mt-0.5">{agent.role}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleOpenAgentSettings(agent)}
                                className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg bg-[#181a1e] border border-slate-800 hover:border-indigo-500/40"
                                title="Configure Agent Directives & Model"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              {normalizedWorkforce.length > 1 && (
                                <button
                                  onClick={() => handleRemoveAgent(agent.name)}
                                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-lg bg-[#181a1e] border border-slate-800 hover:border-rose-500/40"
                                  title="Unassign Agent from Project"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {(agent.tools || []).map((tool, tIdx) => (
                              <span
                                key={tIdx}
                                className="px-2.5 py-0.5 bg-[#1a1c22] border border-slate-800 rounded-md text-[11px] font-mono text-slate-400"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>

                          <div className="bg-[#181a1e] border border-slate-800/80 rounded-xl p-3.5 mb-5">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Active Project Directive
                              </span>
                              <button
                                onClick={() => handleOpenAgentSettings(agent)}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                              >
                                Edit
                              </button>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 font-mono">
                              {agent.directive}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center text-xs font-mono text-slate-400">
                            <Cpu className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                            <span>{agent.model}</span>
                          </div>
                          <button
                            onClick={() => handleDispatchToAgent(agent)}
                            className="flex items-center px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 rounded-lg text-xs font-semibold transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Task Agent
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. MEMORY TAB - Aligned Header & Guardrails Engine */}
              {activeTab === 'Memory' && (
                <div className={`${containerWidthClass} animate-in fade-in duration-300 flex flex-col`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-bold text-slate-100">Project Context Directives</h2>
                        {memorySavedBadge ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center">
                            <Check className="w-3 h-3 mr-1" /> Synced to PostgreSQL
                          </span>
                        ) : isMemoryDirty ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
                            Unsaved Changes
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
                            Active in Pipeline
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        Persistent rules, domain schemas, and system guardrails injected into every <strong className="text-slate-200">{selectedProject.name}</strong> run.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {memoryInput && (
                        <button
                          onClick={() => setMemoryInput('')}
                          className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 bg-[#131418] border border-slate-800 rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        onClick={handleSaveMemory}
                        disabled={isSavingMemory}
                        className="flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap"
                      >
                        {isSavingMemory ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />}
                        Save Directives
                      </button>
                    </div>
                  </div>

                  {/* Quick-Insert Directive Blueprints */}
                  <div className="mb-4">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Quick-Inject Directive Blueprints
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {MEMORY_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleInsertMemoryPreset(preset.rule)}
                          className="px-3 py-1.5 bg-[#131418] hover:bg-indigo-600/10 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/30 rounded-xl text-xs font-medium transition-all"
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#131418] border border-slate-800 rounded-2xl p-6 flex flex-col shadow-inner min-h-[320px]">
                    <textarea 
                      value={memoryInput}
                      onChange={(e) => setMemoryInput(e.target.value)}
                      rows={12}
                      className="w-full flex-1 bg-transparent text-slate-200 text-sm leading-relaxed focus:outline-none resize-none font-mono"
                      placeholder="Write persistent rules, schemas, and directives for this project (or click a blueprint above)..."
                    ></textarea>
                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex justify-between items-center text-xs font-mono text-slate-500">
                      <span>Characters: {memoryInput.length} • Est. Context Footprint: ~{Math.ceil(memoryInput.length / 4)} tokens</span>
                      <span className="text-indigo-400">Injected into Supervisor & Specialist Agents</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. OUTPUTS TAB */}
              {activeTab === 'Outputs' && (
                <div className={`${containerWidthClass} animate-in fade-in duration-300`}>
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-bold text-slate-100">Project Artifacts & Deliverables</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
                          {(selectedProject.recentOutputs || []).length} Saved
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        Code scripts, markdown syntheses, and analytical reports captured from <strong className="text-slate-200">{selectedProject.name}</strong> executions.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCreateArtifactModalOpen(true)}
                      className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create Artifact
                    </button>
                  </div>

                  {(!selectedProject.recentOutputs || selectedProject.recentOutputs.length === 0) ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center bg-[#131418] border border-slate-800 rounded-2xl">
                      <Download className="w-12 h-12 text-slate-600 mb-4" />
                      <h3 className="text-lg font-medium text-slate-200 mb-2">No artifacts saved in this project yet</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                        Click <strong>"Save to Outputs"</strong> on any AI response in the Project Chat tab, or create a custom code/report artifact below.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setActiveTab('Chat')}
                          className="px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-medium hover:bg-indigo-600/20 transition-colors"
                        >
                          Go to Project Chat
                        </button>
                        <button
                          onClick={() => setIsCreateArtifactModalOpen(true)}
                          className="px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                          + Create Artifact
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedProject.recentOutputs.map((file, i) => (
                        <div
                          key={file.id || i}
                          onClick={() => setPreviewArtifact(file)}
                          className="group bg-[#131418] border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center">
                                {getFileIcon(file.type)}
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPreviewArtifact(file); }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors bg-[#181a1e] rounded-lg border border-slate-800"
                                  title="Preview Artifact"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleDownloadOutputArtifact(file, e)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors bg-[#181a1e] rounded-lg border border-slate-800"
                                  title="Download File"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteOutputArtifact(e, i)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors bg-[#181a1e] rounded-lg border border-slate-800"
                                  title="Delete Artifact"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-slate-200 truncate mb-1" title={file.name}>{file.name}</p>
                            {file.content && (
                              <p className="text-xs text-slate-400 font-mono line-clamp-2 mb-3 bg-[#181a1e] p-2 rounded-lg border border-slate-800/80">
                                {file.content}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                            <span className="uppercase text-indigo-400">{file.type}</span>
                            <span>{file.size} • {file.createdAt || 'Saved'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#181a1e]">
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
              <FolderKanban className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-serif text-slate-100 mb-2">No Projects Found</h2>
            <p className="text-slate-400 max-w-md mb-8">Create a project workspace to start organizing your documents, tasks, agents, and outputs.</p>
            <button 
              onClick={() => { setProjectNameInput(''); setProjectDescInput(''); setIsCreateModalOpen(true); }}
              className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-5 h-5 mr-2" /> Create First Project
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {(isCreateModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#181a1e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-slate-100">{isEditModalOpen ? 'Edit Project' : 'Create New Project'}</h3>
                <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Name</label>
                  <input type="text" placeholder="e.g. Q4 Financial Audit" value={projectNameInput} onChange={(e) => setProjectNameInput(e.target.value)}
                    className="w-full bg-[#131418] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} placeholder="Briefly describe the goal..." value={projectDescInput} onChange={(e) => setProjectDescInput(e.target.value)}
                    className="w-full bg-[#131418] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-800 bg-[#131418] flex justify-end space-x-3">
                <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
                <button onClick={isEditModalOpen ? handleEditProject : handleCreateProject} disabled={isProcessing || !projectNameInput.trim()} 
                  className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isEditModalOpen ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ASSIGN SPECIALIST MODAL */}
        {isAssignAgentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#181a1e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Assign Specialized Agent</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Add pre-configured specialists or create a custom role for {selectedProject?.name}.</p>
                </div>
                <button onClick={() => setIsAssignAgentModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Specialist Catalog</label>
                  {Object.entries(AGENT_CATALOG).map(([agentName, meta]) => {
                    const isAssigned = normalizedWorkforce.some(a => a.name === agentName);
                    return (
                      <div key={agentName} className="flex justify-between items-center p-3.5 border border-slate-800 bg-[#131418] rounded-xl hover:border-slate-700 transition-colors">
                        <div className="flex items-center pr-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg mr-3 shrink-0">
                            {meta.icon}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-slate-200">{agentName}</span>
                              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{meta.role}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{meta.defaultDirective}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => !isAssigned && handleAssignAgent(agentName)}
                          disabled={isAssigned}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                            isAssigned
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                          }`}
                        >
                          {isAssigned ? 'Assigned ✓' : 'Assign'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Create Custom Project Specialist</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={customAgentNameInput}
                      onChange={(e) => setCustomAgentNameInput(e.target.value)}
                      placeholder="Agent Name (e.g. Forensics Auditor)"
                      className="bg-[#131418] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={customAgentRoleInput}
                      onChange={(e) => setCustomAgentRoleInput(e.target.value)}
                      placeholder="Role (e.g. Media Verification)"
                      className="bg-[#131418] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => handleAssignAgent(customAgentNameInput, customAgentRoleInput)}
                    disabled={!customAgentNameInput.trim()}
                    className="w-full py-2.5 bg-slate-800 hover:bg-indigo-600 disabled:opacity-40 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                  >
                    + Create & Assign Custom Specialist
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* CONFIGURE AGENT DIRECTIVES & MODEL MODAL */}
        {activeAgentSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#181a1e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-slate-100 flex items-center">
                  <span className="mr-2.5 text-xl">{activeAgentSettings.icon}</span>
                  Configure {activeAgentSettings.name}
                </h3>
                <button onClick={() => setActiveAgentSettings(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">LLM Backbone</label>
                    <select
                      value={agentModelInput}
                      onChange={(e) => setAgentModelInput(e.target.value)}
                      className="w-full bg-[#131418] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Llama 3.1 70B">Llama 3.1 70B (Versatile)</option>
                      <option value="Llama 3.1 8B">Llama 3.1 8B (Fast Instant)</option>
                      <option value="Mixtral 8x7B">Mixtral 8x7B (Reasoning)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Execution Status</label>
                    <select
                      value={agentStatusInput}
                      onChange={(e) => setAgentStatusInput(e.target.value)}
                      className="w-full bg-[#131418] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Online">Online (Active in Pipeline)</option>
                      <option value="Standby">Standby (Paused)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Agent Project Directives (Injected into Chat Orchestration)
                  </label>
                  <textarea
                    rows={4}
                    value={agentDirectiveInput}
                    onChange={(e) => setAgentDirectiveInput(e.target.value)}
                    className="w-full bg-[#131418] border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
                    placeholder="Define specific behavioral rules and constraints for this agent..."
                  ></textarea>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-[#131418] flex justify-end space-x-3">
                <button
                  onClick={() => setActiveAgentSettings(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAgentSettings}
                  disabled={isSavingAgent}
                  className="flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-md shadow-indigo-500/20"
                >
                  {isSavingAgent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Directives
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CREATE CUSTOM ARTIFACT MODAL */}
        {isCreateArtifactModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#181a1e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-slate-100">Create Project Artifact</h3>
                <button onClick={() => setIsCreateArtifactModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Filename</label>
                    <input
                      type="text"
                      value={newArtifactName}
                      onChange={(e) => setNewArtifactName(e.target.value)}
                      placeholder="e.g. evaluation_metrics"
                      className="w-full bg-[#131418] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Format</label>
                    <select
                      value={newArtifactType}
                      onChange={(e) => setNewArtifactType(e.target.value)}
                      className="w-full bg-[#131418] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="md">Markdown (.md)</option>
                      <option value="py">Python (.py)</option>
                      <option value="json">JSON (.json)</option>
                      <option value="sql">SQL (.sql)</option>
                      <option value="txt">Text (.txt)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Artifact Content</label>
                  <textarea
                    rows={7}
                    value={newArtifactContent}
                    onChange={(e) => setNewArtifactContent(e.target.value)}
                    placeholder="Paste or write code, markdown report, or structured output..."
                    className="w-full bg-[#131418] border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                  ></textarea>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-800 bg-[#131418] flex justify-end space-x-3">
                <button onClick={() => setIsCreateArtifactModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
                <button
                  onClick={handleCreateCustomArtifact}
                  disabled={!newArtifactName.trim() || !newArtifactContent.trim()}
                  className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Artifact
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* PREVIEW ARTIFACT MODAL */}
        {previewArtifact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#181a1e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-[#131418]">
                <div className="flex items-center space-x-3">
                  {getFileIcon(previewArtifact.type)}
                  <span className="font-bold text-slate-100 text-sm">{previewArtifact.name}</span>
                  <span className="text-xs font-mono text-slate-500 uppercase">{previewArtifact.size}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleDownloadOutputArtifact(previewArtifact, e)}
                    className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                  </button>
                  <button onClick={() => setPreviewArtifact(null)} className="text-slate-400 hover:text-slate-200 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-[#0d0e12]">
                <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {previewArtifact.content || 'No preview content stored for this artifact.'}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Projects;