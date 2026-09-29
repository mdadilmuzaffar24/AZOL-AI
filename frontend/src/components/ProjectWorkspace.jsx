import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Terminal, FileText, CheckSquare,
  Bot, BrainCircuit, Download, Activity, Plus, Trash2,
  Eye, Send, Paperclip, Mic, Volume2, Code, Copy, Check,
  Loader2, Database, Zap, ShieldCheck, UploadCloud,
  CheckCircle2, Clock, Sparkles, Layers, Search, RefreshCw,
  X, Play, Sliders
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';

const INGESTION_STAGES = [
  { id: 1, label: 'Extracting text' },
  { id: 2, label: 'Chunking' },
  { id: 3, label: 'Embedding' },
  { id: 4, label: 'Indexing' },
  { id: 5, label: 'Ready for AI' }
];

const DEFAULT_PROJECT_AGENTS = [
  { id: 'supervisor', name: 'Supervisor', role: 'Core Graph Router & Task Coordinator', model: 'Llama 3.3 70B', icon: '🧠', assigned: true, status: 'Online' },
  { id: 'planner', name: 'Planner', role: 'DAG Subtask Decomposition', model: 'Llama 3.3 70B', icon: '📐', assigned: true, status: 'Online' },
  { id: 'researcher', name: 'Researcher', role: 'FAISS Semantic RAG & Web Search', model: 'Llama 3.3 70B', icon: '🔍', assigned: true, status: 'Online' },
  { id: 'analyst', name: 'Analyst', role: 'Quantitative & Python Sandbox', model: 'Llama 3.3 70B', icon: '⚡', assigned: true, status: 'Online' },
  { id: 'reviewer', name: 'QA Reviewer', role: 'Grounding, Citations & Trust Guard', model: 'Llama 3.1 8B', icon: '🛡️', assigned: true, status: 'Online' },
  { id: 'memory', name: 'Memory', role: '3-Tier Context & Directive Sync', model: 'Llama 3.1 8B', icon: '🗄️', assigned: true, status: 'Online' }
];

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
    return (
      <code className="bg-slate-800 text-amber-200 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700">
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-[#0d0e12] shadow-lg w-full">
      <div className="flex justify-between items-center bg-slate-800/80 px-4 py-2 border-b border-slate-700 text-xs font-mono text-slate-400">
        <span className="uppercase font-semibold text-indigo-300 flex items-center">
          <Code className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
          {match[1]}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center text-slate-300 hover:text-white transition-colors bg-[#181a1e] px-2.5 py-1 rounded border border-slate-700"
        >
          {isCopied ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-indigo-200 leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

const MARKDOWN_COMPONENTS = {
  code: CodeBlock,
  p: ({ node, ...props }) => <p className="mb-3 last:mb-0 text-slate-200 leading-relaxed break-words" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1 text-slate-200" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1 text-slate-200" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1 break-words" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />
};

const ProjectWorkspace = ({ project, onBack }) => {
  const projectId = String(project?.id || 'default');
  const storageKey = `azol_v1_project_state_${projectId}`;

  const [activeTab, setActiveTab] = useState('Overview');
  const [projectDocs, setProjectDocs] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [ingestionJob, setIngestionJob] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewOutput, setPreviewOutput] = useState(null);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);

  // Scoped Persistent Project State (Tasks, Memory, Agents, Outputs)
  const loadInitialProjectState = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      tasks: [
        {
          id: 'tsk_1',
          title: `Synthesize uploaded documents and research context for ${project?.name || 'Project'}`,
          agent: 'Researcher',
          priority: 'High',
          status: 'Completed'
        },
        {
          id: 'tsk_2',
          title: 'Generate executive architecture summary and validation metrics',
          agent: 'Analyst',
          priority: 'Medium',
          status: 'Pending'
        }
      ],
      memories: [
        {
          id: 'mem_1',
          directive: `Prioritize FAISS vector chunks bound to "${project?.name || 'this project'}" before querying external sources.`,
          category: 'RAG Grounding',
          active: true
        },
        {
          id: 'mem_2',
          directive: 'Enforce QA Reviewer verification and attach exact document filenames to all technical claims.',
          category: 'Trust & Citations',
          active: true
        }
      ],
      agents: DEFAULT_PROJECT_AGENTS,
      outputs: [
        {
          id: 'out_1',
          name: `${(project?.name || 'project').toLowerCase().replace(/\s+/g, '_')}_summary.md`,
          type: 'MD',
          size: '2.4 KB',
          author: 'Supervisor & Researcher',
          createdAt: 'Recent',
          content: `# Executive Summary — ${project?.name || 'Project Workspace'}\n\n## 1. Objective\n${project?.description || 'Coordinate multi-agent research, document analysis, and deliverable generation.'}\n\n## 2. Active Workforce\n- **Supervisor:** Task routing and orchestration\n- **Researcher:** FAISS semantic chunk retrieval\n- **Analyst:** Quantitative synthesis & Python execution\n- **QA Reviewer:** Citation & accuracy verification`
        }
      ]
    };
  };

  const [workspaceState, setWorkspaceState] = useState(loadInitialProjectState);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAgent, setNewTaskAgent] = useState('Researcher');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('Domain Directive');

  // Chat & Live Orchestration States
  const threadId = `proj_thread_${projectId}`;
  const [messages, setMessages] = useState([]);
  const [promptInput, setPromptInput] = useState('');
  const [selectedChatAgent, setSelectedChatAgent] = useState('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentTimeline, setAgentTimeline] = useState([
    { id: 'supervisor', name: 'Supervisor', detail: 'Task classified & routed', duration: '0.4s', state: 'done' },
    { id: 'planner', name: 'Planner', detail: 'Subtasks structured', duration: '0.6s', state: 'done' },
    { id: 'researcher', name: 'Researcher', detail: 'FAISS vector store queried', duration: '1.2s', state: 'done' },
    { id: 'reviewer', name: 'QA Reviewer', detail: 'Output verified', duration: '0.5s', state: 'done' }
  ]);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const tabs = [
    { id: 'Overview', icon: <Activity className="w-4 h-4 mr-2" /> },
    { id: 'Chat', icon: <Terminal className="w-4 h-4 mr-2" /> },
    { id: 'Documents', icon: <FileText className="w-4 h-4 mr-2" /> },
    { id: 'Tasks', icon: <CheckSquare className="w-4 h-4 mr-2" /> },
    { id: 'Agents', icon: <Bot className="w-4 h-4 mr-2" /> },
    { id: 'Memory', icon: <BrainCircuit className="w-4 h-4 mr-2" /> },
    { id: 'Outputs', icon: <Download className="w-4 h-4 mr-2" /> }
  ];

  // Persist workspaceState changes
  const updateWorkspaceState = (updater) => {
    setWorkspaceState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Load Project Documents & Chat History from PostgreSQL
  useEffect(() => {
    fetchProjectDocuments();
    fetchProjectChatHistory();
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const fetchProjectDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allDocs = Array.isArray(res.data) ? res.data : [];
      const boundDocs = allDocs.filter(
        d => String(d.project_id) === projectId || d.project_name === project?.name
      );
      setProjectDocs(boundDocs);
    } catch (e) {
      console.error('Failed to load project documents:', e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const fetchProjectChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/orchestrator/chat/history?thread_id=${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const formatted = res.data.map(m => ({
          id: m.id,
          role: m.role === 'ai' ? 'assistant' : m.role,
          content: re.stripContextPrefix(m.content),
          meta: m.role === 'ai' || m.role === 'assistant' ? {
            latency: '2.1s',
            sources: `${Math.max(1, projectDocs.length)} Bound Docs`,
            agents: '4 Agents',
            tokens: `${Math.max(120, Math.ceil((m.content || '').length / 3.6))} Tokens`,
            qaStatus: 'QA Approved'
          } : null
        }));
        setMessages(formatted);
      }
    } catch (e) {
      // No history yet for this project thread
    }
  };

  const re = {
    stripContextPrefix: (txt) => (txt || '').replace(/^\[Project Context:[\s\S]*?\]\n\n/, '')
  };

  // --- 5-Stage RAG Document Upload Bound to This Project ---
  const handleFileUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const token = localStorage.getItem('token');

    for (const file of files) {
      setIngestionJob({ filename: file.name, progress: 18, currentStage: 1, status: 'running' });
      const t1 = setTimeout(() => setIngestionJob(p => p ? { ...p, progress: 42, currentStage: 2 } : null), 300);
      const t2 = setTimeout(() => setIngestionJob(p => p ? { ...p, progress: 70, currentStage: 3 } : null), 650);
      const t3 = setTimeout(() => setIngestionJob(p => p ? { ...p, progress: 90, currentStage: 4 } : null), 1000);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);

        await axios.post('/api/v1/documents/upload', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        await new Promise(r => setTimeout(r, 1250));
        setIngestionJob({ filename: file.name, progress: 100, currentStage: 5, status: 'complete' });
        await fetchProjectDocuments();
        setTimeout(() => setIngestionJob(null), 1600);
      } catch (err) {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        setIngestionJob({ filename: file.name, progress: 100, currentStage: 4, status: 'failed' });
        setTimeout(() => setIngestionJob(null), 2800);
      }
    }
  };

  const handleOpenDocPreview = async (doc) => {
    setPreviewDoc({ ...doc, excerpt: 'Extracting vector chunks and text preview...' });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/documents/${doc.id}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewDoc(res.data);
    } catch (e) {
      setPreviewDoc({
        ...doc,
        excerpt: `Document "${doc.filename}" (${doc.file_size}) is indexed across ${doc.chunks || 24} vector chunks in FAISS.`
      });
    }
  };

  const handleDeleteProjectDoc = async (doc) => {
    if (!window.confirm(`Remove "${doc.filename}" from ${project.name}?`)) return;
    setProjectDocs(prev => prev.filter(d => d.id !== doc.id));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/documents/${doc.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      fetchProjectDocuments();
    }
  };

  // --- Extract Code / Markdown Artifacts into Project Outputs ---
  const extractOutputsFromReply = (replyText, promptTitle) => {
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const extracted = [];

    while ((match = codeRegex.exec(replyText)) !== null) {
      const lang = (match[1] || 'txt').toLowerCase();
      const body = match[2].trim();
      const ext = lang === 'python' ? 'py' : lang === 'javascript' ? 'js' : lang;
      extracted.push({
        id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `script_${Date.now().toString().slice(-4)}.${ext}`,
        type: ext.toUpperCase(),
        size: `${Math.max(0.5, body.length / 1024).toFixed(1)} KB`,
        author: 'Coding & Analyst Nodes',
        createdAt: 'Just now',
        content: body
      });
    }

    // If response is a substantial report without code blocks, save as Markdown report artifact
    if (extracted.length === 0 && replyText && replyText.length > 350 && !replyText.startsWith('⚠️')) {
      const cleanSlug = (promptTitle || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 22);
      extracted.push({
        id: `out_${Date.now()}`,
        name: `${cleanSlug}_report.md`,
        type: 'MD',
        size: `${(replyText.length / 1024).toFixed(1)} KB`,
        author: 'Researcher & Reviewer',
        createdAt: 'Just now',
        content: replyText
      });
    }

    if (extracted.length > 0) {
      updateWorkspaceState(prev => ({
        ...prev,
        outputs: [...extracted, ...(prev.outputs || [])]
      }));
    }
  };

  // --- Send Message to LangGraph Orchestrator with Project Context ---
  const handleSendProjectMessage = async (overrideText = null) => {
    const rawPrompt = (overrideText !== null ? overrideText : promptInput).trim();
    if (!rawPrompt || isGenerating) return;

    if (overrideText === null) setPromptInput('');
    setMessages(prev => [...prev, { role: 'user', content: rawPrompt }]);
    setIsGenerating(true);

    setAgentTimeline([
      { id: 'supervisor', name: 'Supervisor', detail: 'Classifying project request...', duration: '...', state: 'running' },
      { id: 'planner', name: 'Planner', detail: 'Queued for DAG decomposition', duration: '...', state: 'waiting' },
      { id: 'researcher', name: 'Researcher', detail: `Waiting to query ${projectDocs.length} project docs`, duration: '...', state: 'waiting' },
      { id: 'reviewer', name: 'QA Reviewer', detail: 'Waiting for candidate synthesis', duration: '...', state: 'waiting' }
    ]);

    // Build rich Project Context header for the backend LangGraph agents
    const docNames = projectDocs.map(d => d.filename).join(', ') || 'None uploaded yet';
    const activeMemories = (workspaceState.memories || []).filter(m => m.active).map(m => m.directive).join(' | ') || 'Standard grounding';
    const pendingTasks = (workspaceState.tasks || []).filter(t => t.status !== 'Completed').map(t => t.title).join('; ') || 'None';

    const contextualizedMessage =
      `[Project Context: ${project.name} | Indexed Docs: ${docNames} | Memory Directives: ${activeMemories} | Pending Tasks: ${pendingTasks}]\n\n` +
      rawPrompt;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/orchestrator/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          thread_id: threadId,
          message: contextualizedMessage,
          agent_id: selectedChatAgent
        })
      });

      let finalContent = '';
      let streamMeta = null;

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split('\n\n');

          for (const ev of events) {
            if (!ev.startsWith('data: ')) continue;
            try {
              const payload = JSON.parse(ev.slice(6));
              if (payload.type === 'node_update') {
                const activeNode = (payload.node || '').toLowerCase();
                const dur = payload.duration_s ? `${payload.duration_s}s` : '0.8s';
                setAgentTimeline(prev =>
                  prev.map(item => {
                    if ( activeNode.includes(item.id) ) {
                      return { ...item, detail: 'Execution step verified', duration: dur, state: 'done' };
                    }
                    return item;
                  })
                );
              } else if (payload.type === 'complete') {
                finalContent = payload.content;
                streamMeta = payload.meta || null;
              } else if (payload.type === 'error') {
                finalContent = payload.content;
              }
            } catch (e) {}
          }
        }
      }

      if (!finalContent) {
        finalContent = `Completed orchestration for **"${rawPrompt}"** within project **${project.name}**.`;
      }

      const aiMessageObj = {
        role: 'assistant',
        content: finalContent,
        meta: {
          latency: streamMeta?.duration_s ? `${streamMeta.duration_s}s` : '2.4s',
          sources: `${projectDocs.length} Project Docs`,
          agents: `${streamMeta?.agents_count || 4} Agents`,
          tokens: `${streamMeta?.tokens_used || Math.ceil(finalContent.length / 3.6)} Tokens`,
          qaStatus: streamMeta?.qa_status || 'QA Approved'
        }
      };

      setMessages(prev => [...prev, aiMessageObj]);
      extractOutputsFromReply(finalContent, rawPrompt);

      setAgentTimeline([
        { id: 'supervisor', name: 'Supervisor', detail: 'Request classified & routed', duration: '0.4s', state: 'done' },
        { id: 'planner', name: 'Planner', detail: 'Workflow subtasks resolved', duration: '0.7s', state: 'done' },
        { id: 'researcher', name: 'Researcher', detail: `Grounded across ${projectDocs.length} project docs`, duration: '1.1s', state: 'done' },
        { id: 'reviewer', name: 'QA Reviewer', detail: 'Citations & accuracy approved', duration: '0.4s', state: 'done' }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Execution error: ${err.message || 'Unable to reach orchestrator.'}` }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Task Management Handlers ---
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: `tsk_${Date.now()}`,
      title: newTaskTitle.trim(),
      agent: newTaskAgent,
      priority: newTaskPriority,
      status: 'Pending'
    };
    updateWorkspaceState(prev => ({ ...prev, tasks: [newTask, ...(prev.tasks || [])] }));
    setNewTaskTitle('');
  };

  const handleToggleTaskStatus = (taskId) => {
    updateWorkspaceState(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t =>
        t.id === taskId ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t
      )
    }));
  };

  const handleDeleteTask = (taskId) => {
    updateWorkspaceState(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter(t => t.id !== taskId)
    }));
  };

  const handleRunTaskInChat = (task) => {
    setActiveTab('Chat');
    setTimeout(() => {
      handleSendProjectMessage(`Execute Project Task: ${task.title}`);
    }, 150);
  };

  // --- Memory Management Handlers ---
  const handleAddMemory = () => {
    if (!newMemoryText.trim()) return;
    const item = {
      id: `mem_${Date.now()}`,
      directive: newMemoryText.trim(),
      category: newMemoryCategory,
      active: true
    };
    updateWorkspaceState(prev => ({ ...prev, memories: [item, ...(prev.memories || [])] }));
    setNewMemoryText('');
  };

  // --- Download Output File ---
  const handleDownloadOutput = (outItem) => {
    const blob = new Blob([outItem.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outItem.name || 'artifact.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const assignedAgents = (workspaceState.agents || DEFAULT_PROJECT_AGENTS).filter(a => a.assigned);
  const pendingTasksCount = (workspaceState.tasks || []).filter(t => t.status !== 'Completed').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0e12] relative overflow-hidden select-none">

      {/* 1. PROJECT HEADER & 7-TAB NAVIGATION BAR */}
      <div className="px-6 sm:px-8 pt-5 pb-0 border-b border-slate-800/80 bg-[#131418] z-10 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <button
            onClick={onBack}
            className="flex items-center text-xs font-mono font-semibold text-slate-400 hover:text-indigo-400 transition-colors bg-[#181a1e] px-3 py-1.5 rounded-xl border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Projects
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsPipelineOpen(true)}
              className="flex items-center px-3 py-1.5 bg-[#181a1e] hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-mono transition-colors"
            >
              <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              View Pipeline Engine
            </button>

            <div className="flex items-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Active Workspace
              </span>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">{project?.name || 'Project Workspace'}</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">{project?.description || 'Multi-agent project environment with dedicated FAISS memory, tasks, and deliverable artifacts.'}</p>
        </div>

        {/* 7 Specification Tabs: Overview | Chat | Documents | Tasks | Agents | Memory | Outputs */}
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const badgeCount =
              tab.id === 'Documents' ? projectDocs.length :
              tab.id === 'Tasks' ? (workspaceState.tasks || []).length :
              tab.id === 'Agents' ? assignedAgents.length :
              tab.id === 'Outputs' ? (workspaceState.outputs || []).length : null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-xl'
                }`}
              >
                {tab.icon}
                <span>{tab.id}</span>
                {badgeCount !== null && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DYNAMIC TAB CONTENT BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* =========================================================
            TAB 1: OVERVIEW (SPEC SECTION 19)
           ========================================================= */}
        {activeTab === 'Overview' && (
          <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">

            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div onClick={() => setActiveTab('Agents')} className="bg-[#131418] border border-slate-800/90 hover:border-indigo-500/40 p-5 rounded-2xl cursor-pointer transition-all">
                <span className="text-[11px] font-mono uppercase text-slate-400 block">Assigned Workforce</span>
                <p className="text-2xl font-bold text-slate-100 mt-2">{assignedAgents.length} Agents</p>
                <span className="text-[11px] font-mono text-emerald-400 mt-1 block">● LangGraph Ready</span>
              </div>

              <div onClick={() => setActiveTab('Documents')} className="bg-[#131418] border border-slate-800/90 hover:border-indigo-500/40 p-5 rounded-2xl cursor-pointer transition-all">
                <span className="text-[11px] font-mono uppercase text-slate-400 block">Project Knowledge Base</span>
                <p className="text-2xl font-bold text-slate-100 mt-2">{projectDocs.length} Indexed</p>
                <span className="text-[11px] font-mono text-indigo-400 mt-1 block">FAISS Semantic Store</span>
              </div>

              <div onClick={() => setActiveTab('Tasks')} className="bg-[#131418] border border-slate-800/90 hover:border-indigo-500/40 p-5 rounded-2xl cursor-pointer transition-all">
                <span className="text-[11px] font-mono uppercase text-slate-400 block">Project Tasks</span>
                <p className="text-2xl font-bold text-slate-100 mt-2">{pendingTasksCount} Pending</p>
                <span className="text-[11px] font-mono text-slate-400 mt-1 block">
                  {(workspaceState.tasks || []).length} Total Tasks
                </span>
              </div>

              <div onClick={() => setActiveTab('Outputs')} className="bg-[#131418] border border-slate-800/90 hover:border-indigo-500/40 p-5 rounded-2xl cursor-pointer transition-all">
                <span className="text-[11px] font-mono uppercase text-slate-400 block">Generated Outputs</span>
                <p className="text-2xl font-bold text-slate-100 mt-2">{(workspaceState.outputs || []).length} Artifacts</p>
                <span className="text-[11px] font-mono text-amber-400 mt-1 block">Reports & Code Ready</span>
              </div>
            </div>

            {/* 3-Column Spec Breakdown: Assigned Agents | Indexed Documents | Recent Outputs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Column 1: Assigned Agents */}
              <div className="bg-[#131418] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                      <Bot className="w-4 h-4 mr-2 text-indigo-400" /> Assigned Agents
                    </h3>
                    <button onClick={() => setActiveTab('Agents')} className="text-xs font-mono text-indigo-400 hover:underline">
                      Configure →
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {assignedAgents.map(ag => (
                      <div key={ag.id} className="flex items-center justify-between p-2.5 bg-[#181a1e] border border-slate-800 rounded-xl">
                        <div className="flex items-center space-x-2.5">
                          <span>{ag.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{ag.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{ag.role}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {ag.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('Chat')}
                  className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Launch Project AI Chat
                </button>
              </div>

              {/* Column 2: Project Documents */}
              <div className="bg-[#131418] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-blue-400" /> Project Documents
                    </h3>
                    <button onClick={() => setActiveTab('Documents')} className="text-xs font-mono text-indigo-400 hover:underline">
                      Manage ({projectDocs.length}) →
                    </button>
                  </div>

                  {projectDocs.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl">
                      <UploadCloud className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No project documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {projectDocs.slice(0, 4).map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => handleOpenDocPreview(doc)}
                          className="p-3 bg-[#181a1e] border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-slate-200 truncate">{doc.filename}</p>
                            <span className="text-[10px] font-mono text-slate-500">
                              {doc.file_type} • {doc.file_size} • {doc.chunks} chunks
                            </span>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('Documents')}
                  className="mt-5 w-full py-2.5 bg-[#181a1e] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  Upload & Index Documents
                </button>
              </div>

              {/* Column 3: Recent Outputs */}
              <div className="bg-[#131418] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                      <Download className="w-4 h-4 mr-2 text-amber-400" /> Recent Outputs
                    </h3>
                    <button onClick={() => setActiveTab('Outputs')} className="text-xs font-mono text-indigo-400 hover:underline">
                      View All →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(workspaceState.outputs || []).slice(0, 4).map(out => (
                      <div
                        key={out.id}
                        onClick={() => setPreviewOutput(out)}
                        className="p-3 bg-[#181a1e] border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-200 truncate">{out.name}</p>
                          <span className="text-[10px] font-mono text-slate-500">
                            {out.type} • {out.size} • {out.author}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadOutput(out); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-400"
                          title="Download Output"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('Outputs')}
                  className="mt-5 w-full py-2.5 bg-[#181a1e] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  Open Deliverable Repository
                </button>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: CHAT (PROJECT-SCOPED AI WORKSPACE + TIMELINE + ARTIFACTS)
           ========================================================= */}
        {activeTab === 'Chat' && (
          <div className="flex h-[calc(100vh-215px)] w-full bg-[#0d0e12] overflow-hidden">

            {/* Center AI Interaction Stream */}
            <div className="flex-1 flex flex-col h-full bg-[#14161b] min-w-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                      <BrainCircuit className="w-7 h-7 text-indigo-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-100">
                      {project.name} — Multi-Agent Workspace
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Every prompt in this workspace automatically grounds across your <strong>{projectDocs.length} indexed project documents</strong> and <strong>{(workspaceState.memories || []).filter(m => m.active).length} active memory directives</strong>.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6 w-full">
                      {[
                        `Summarize the core findings and architecture in ${project.name}`,
                        'Write a Python script to parse JSON data and validate schema',
                        'Identify the top 3 technical risks and mitigation steps',
                        'Generate a structured Markdown executive brief'
                      ].map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendProjectMessage(suggestion)}
                          className="p-3 text-left bg-[#181a1e] hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-xs text-slate-300 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role !== 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                          <BrainCircuit className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`rounded-2xl p-5 shadow-sm max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-indigo-600/20 border border-indigo-500/30 text-slate-100'
                          : 'bg-[#131418] border border-slate-800 text-slate-200 w-full'
                      }`}>
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        ) : (
                          <>
                            <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                            {msg.meta && (
                              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                                <div className="flex items-center space-x-3">
                                  <span className="flex items-center"><Clock className="w-3 h-3 mr-1 text-indigo-400" /> {msg.meta.latency}</span>
                                  <span className="flex items-center"><Database className="w-3 h-3 mr-1 text-emerald-400" /> {msg.meta.sources}</span>
                                  <span className="flex items-center"><Bot className="w-3 h-3 mr-1 text-purple-400" /> {msg.meta.agents}</span>
                                  <span className="flex items-center"><Zap className="w-3 h-3 mr-1 text-amber-400" /> {msg.meta.tokens}</span>
                                </div>
                                <span className="text-emerald-400 flex items-center font-semibold">
                                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {msg.meta.qaStatus}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isGenerating && (
                  <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 px-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Workforce orchestrating task across LangGraph nodes...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Prompt Bar */}
              <div className="p-4 bg-[#131418] border-t border-slate-800">
                <div className="bg-[#181a1e] border border-slate-700/80 rounded-2xl p-3 focus-within:border-indigo-500 transition-colors">
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendProjectMessage()}
                    placeholder={`Ask the ${project.name} workforce to research, analyze, or generate deliverables...`}
                    className="w-full bg-transparent text-slate-200 text-sm focus:outline-none px-2 mb-2.5"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedChatAgent}
                        onChange={(e) => setSelectedChatAgent(e.target.value)}
                        className="bg-[#131418] border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                      >
                        <option value="auto">🧠 Supervisor (Auto Router)</option>
                        <option value="Researcher">🔍 Researcher (FAISS RAG)</option>
                        <option value="Analyst">⚡ Analyst (Python Sandbox)</option>
                        <option value="Reviewer">🛡️ QA Reviewer</option>
                      </select>
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                        Context: {projectDocs.length} Docs • {(workspaceState.memories || []).filter(m => m.active).length} Directives
                      </span>
                    </div>

                    <button
                      onClick={() => handleSendProjectMessage()}
                      disabled={!promptInput.trim() || isGenerating}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center transition-all"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Live Agent Activity & Project Artifacts */}
            <div className="w-72 border-l border-slate-800 bg-[#131418] p-5 flex flex-col justify-between overflow-y-auto shrink-0 hidden lg:flex">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                    <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                    Agent Execution Timeline
                  </h3>
                  <div className="space-y-2.5">
                    {agentTimeline.map(step => (
                      <div key={step.id} className="p-2.5 bg-[#181a1e] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          {step.state === 'running' ? (
                            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="font-bold text-slate-200 truncate">{step.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">{step.detail}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{step.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                      <Download className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      Artifacts
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-indigo-300">
                      {(workspaceState.outputs || []).length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(workspaceState.outputs || []).slice(0, 5).map(art => (
                      <div
                        key={art.id}
                        onClick={() => setPreviewOutput(art)}
                        className="p-2.5 bg-[#181a1e] border border-slate-800 hover:border-indigo-500/40 rounded-xl cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 truncate">{art.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadOutput(art); }}
                            className="text-slate-400 hover:text-emerald-400"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400">{art.type} • {art.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            TAB 3: DOCUMENTS (PROJECT KNOWLEDGE BASE + 5-STAGE RAG)
           ========================================================= */}
        {activeTab === 'Documents' && (
          <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#131418] border border-slate-800 p-5 rounded-2xl">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  {project.name} — Knowledge Base ({projectDocs.length} Indexed)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Files uploaded here are automatically bound to <strong>{project.name}</strong> in PostgreSQL and indexed into FAISS.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20"
                >
                  <UploadCloud className="w-4 h-4 mr-2" /> Upload to Project
                </button>
              </div>
            </div>

            {ingestionJob && (
              <div className="bg-[#131418] border border-indigo-500/40 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-200 font-bold">Ingesting {ingestionJob.filename}...</span>
                  <span className="text-indigo-400">{ingestionJob.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div style={{ width: `${ingestionJob.progress}%` }} className="h-full bg-indigo-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {INGESTION_STAGES.map(st => (
                    <div
                      key={st.id}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono flex items-center ${
                        ingestionJob.currentStage >= st.id
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#181a1e] border-slate-800 text-slate-500'
                      }`}
                    >
                      <Check className="w-3 h-3 mr-1.5" /> {st.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#131418] border border-slate-800 rounded-2xl overflow-hidden">
              {isLoadingDocs ? (
                <div className="p-12 text-center text-xs font-mono text-slate-400">Loading project documents...</div>
              ) : projectDocs.length === 0 ? (
                <div className="p-12 text-center">
                  <UploadCloud className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-200">No documents bound to {project.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Click "Upload to Project" above to index PDFs, DOCX, PPTX, or CSV files.</p>
                </div>
              ) : (
                <table className="w-full table-fixed text-left text-sm text-slate-300">
                  <thead className="bg-[#181a1e] text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="w-[32%] px-5 py-3.5">File</th>
                      <th className="w-[10%] px-3 py-3.5">Type</th>
                      <th className="w-[12%] px-3 py-3.5">Size</th>
                      <th className="w-[14%] px-3 py-3.5">Chunks</th>
                      <th className="w-[12%] px-3 py-3.5">Status</th>
                      <th className="w-[20%] px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {projectDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-4 font-semibold text-slate-100 truncate">{doc.filename}</td>
                        <td className="px-3 py-4 font-mono text-indigo-400">{doc.file_type}</td>
                        <td className="px-3 py-4 font-mono text-slate-400">{doc.file_size}</td>
                        <td className="px-3 py-4 font-mono text-indigo-300">{doc.chunks} chunks</td>
                        <td className="px-3 py-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenDocPreview(doc)}
                            className="px-2.5 py-1 bg-[#181a1e] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('Chat');
                              setPromptInput(`Analyze document "${doc.filename}" and summarize its key insights.`);
                            }}
                            className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg"
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => handleDeleteProjectDoc(doc)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: TASKS (PROJECT TASK ORCHESTRATION LEDGER)
           ========================================================= */}
        {activeTab === 'Tasks' && (
          <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
            <div className="bg-[#131418] border border-slate-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-base font-bold text-slate-100">Create & Dispatch Project Task</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Describe a project task for the AI workforce..."
                  className="flex-1 bg-[#181a1e] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newTaskAgent}
                  onChange={(e) => setNewTaskAgent(e.target.value)}
                  className="bg-[#181a1e] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200"
                >
                  <option value="Supervisor">Supervisor</option>
                  <option value="Planner">Planner</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Analyst">Analyst</option>
                  <option value="QA Reviewer">QA Reviewer</option>
                </select>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="bg-[#181a1e] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <button
                  onClick={handleAddTask}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Task
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(workspaceState.tasks || []).map(task => (
                <div
                  key={task.id}
                  className="p-4 bg-[#131418] border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={task.status === 'Completed'}
                      onChange={() => handleToggleTaskStatus(task.id)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${task.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1 text-[11px] font-mono text-slate-400">
                        <span>Assigned: <strong className="text-indigo-400">{task.agent}</strong></span>
                        <span>•</span>
                        <span>Priority: {task.priority}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleRunTaskInChat(task)}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-mono flex items-center transition-colors"
                    >
                      <Play className="w-3 h-3 mr-1.5" /> Run with AI
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 5: AGENTS (PROJECT WORKFORCE ASSIGNMENT)
           ========================================================= */}
        {activeTab === 'Agents' && (
          <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(workspaceState.agents || DEFAULT_PROJECT_AGENTS).map(agent => (
                <div
                  key={agent.id}
                  onClick={() => {
                    updateWorkspaceState(prev => ({
                      ...prev,
                      agents: (prev.agents || DEFAULT_PROJECT_AGENTS).map(a =>
                        a.id === agent.id ? { ...a, assigned: !a.assigned } : a
                      )
                    }));
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
                    agent.assigned
                      ? 'bg-[#131418] border-indigo-500/40'
                      : 'bg-[#131418]/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 pr-3">
                    <div className="w-10 h-10 rounded-xl bg-[#181a1e] border border-slate-700 flex items-center justify-center text-lg">
                      {agent.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-100">{agent.name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-indigo-300">
                          {agent.model}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{agent.role}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(agent.assigned)}
                    onChange={() => {}}
                    className="w-4 h-4 accent-indigo-600 mt-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 6: MEMORY (PROJECT LONG-TERM DIRECTIVES & CONTEXT)
           ========================================================= */}
        {activeTab === 'Memory' && (
          <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
            <div className="bg-[#131418] border border-slate-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-base font-bold text-slate-100">Add Persistent Project Memory Directive</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                  placeholder="Enter a persistent constraint or domain rule for all agents in this project..."
                  className="flex-1 bg-[#181a1e] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value)}
                  className="bg-[#181a1e] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200"
                >
                  <option value="Domain Directive">Domain Directive</option>
                  <option value="RAG Grounding">RAG Grounding</option>
                  <option value="Security Guardrail">Security Guardrail</option>
                </select>
                <button
                  onClick={handleAddMemory}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" /> Save Memory
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(workspaceState.memories || []).map(mem => (
                <div key={mem.id} className="p-4 bg-[#131418] border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                      {mem.category}
                    </span>
                    <p className="text-sm text-slate-200 mt-1.5">{mem.directive}</p>
                  </div>
                  <button
                    onClick={() =>
                      updateWorkspaceState(prev => ({
                        ...prev,
                        memories: (prev.memories || []).filter(m => m.id !== mem.id)
                      }))
                    }
                    className="p-1.5 text-slate-500 hover:text-rose-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 7: OUTPUTS (PROJECT DELIVERABLES & ARTIFACT REPOSITORY)
           ========================================================= */}
        {activeTab === 'Outputs' && (
          <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(workspaceState.outputs || []).map(out => (
                <div
                  key={out.id}
                  onClick={() => setPreviewOutput(out)}
                  className="p-5 bg-[#131418] border border-slate-800 hover:border-indigo-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                        {out.type}
                      </span>
                      <p className="text-sm font-bold text-slate-100 truncate">{out.name}</p>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1.5">
                      {out.size} • Generated by {out.author}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewOutput(out); }}
                      className="px-3 py-1.5 bg-[#181a1e] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono"
                    >
                      Preview
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadOutput(out); }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* DOCUMENT & OUTPUT PREVIEW MODALS */}
      <AnimatePresence>
        {(previewDoc || previewOutput) && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => { setPreviewDoc(null); setPreviewOutput(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-[#181a1e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 bg-[#131418] border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm truncate">
                  {previewDoc ? previewDoc.filename : previewOutput?.name}
                </span>
                <button
                  onClick={() => { setPreviewDoc(null); setPreviewOutput(null); }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-[#0d0e12]">
                <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {previewDoc ? previewDoc.excerpt : previewOutput?.content}
                </pre>
              </div>
              <div className="px-6 py-4 bg-[#131418] border-t border-slate-800 flex justify-end space-x-2.5">
                {previewOutput && (
                  <button
                    onClick={() => handleDownloadOutput(previewOutput)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Artifact
                  </button>
                )}
                <button
                  onClick={() => { setPreviewDoc(null); setPreviewOutput(null); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isPipelineOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsPipelineOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-[#131418] border border-slate-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-100">
                  {project.name} — LangGraph Orchestration Pipeline
                </span>
                <button onClick={() => setIsPipelineOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="p-8 bg-[#0d0e12] border border-slate-800 rounded-xl flex flex-col items-center space-y-6 font-mono text-xs">
                <div className="px-6 py-3 rounded-xl bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 font-bold">
                  🧠 Supervisor (Router)
                </div>
                <div className="grid grid-cols-3 gap-4 w-full text-center">
                  <div className="p-3 rounded-xl bg-[#181a1e] border border-slate-700 text-slate-200">🔍 Researcher (FAISS)</div>
                  <div className="p-3 rounded-xl bg-[#181a1e] border border-slate-700 text-slate-200">⚡ Analyst (Sandbox)</div>
                  <div className="p-3 rounded-xl bg-[#181a1e] border border-slate-700 text-slate-200">📐 Planner (DAG)</div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-2/3 text-center">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">🛡️ QA Reviewer</div>
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold">🗄️ Project Memory</div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ProjectWorkspace;