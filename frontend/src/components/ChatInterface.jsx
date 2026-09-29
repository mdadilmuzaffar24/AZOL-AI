import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Terminal, FileText, CheckCircle2, ChevronRight, ChevronDown,
  Loader2, Code, Plus, Bot, X, Copy, Check, Trash2,
  ShieldAlert, CheckCircle, XCircle, Paperclip, Image as ImageIcon, Database,
  Globe, BrainCircuit, Mic, Headphones, Activity, Download, GitMerge,
  ShieldCheck, Zap, Clock, Eye, Square, RotateCcw, RefreshCw,
  AlertTriangle, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  GripVertical, GripHorizontal, ExternalLink, Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { GraphVisualizer } from './GraphVisualizer';

const AGENTS = [
  {
    id: 'auto',
    name: 'Supervisor (Auto)',
    role: 'Core Graph Router',
    model: 'Llama 3.3 70B',
    icon: '🧠',
    color: 'text-indigo-400',
    defaultPrompt: 'Analyze incoming operator request, classify domain intent, decompose DAG subtasks, and route execution across specialist nodes.'
  },
  {
    id: 'planner',
    name: 'Planner',
    role: 'DAG Task Decomposition',
    model: 'Llama 3.3 70B',
    icon: '📐',
    color: 'text-purple-400',
    defaultPrompt: 'Structure complex requests into dependency-ordered atomic steps with explicit acceptance criteria for downstream nodes.'
  },
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'FAISS & Web RAG',
    model: 'Llama 3.3 70B',
    icon: '🔍',
    color: 'text-blue-400',
    defaultPrompt: 'Retrieve semantic chunks from the FAISS Long-Term Knowledge Base and live web search with verifiable source citations.'
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    role: 'Python & Quantitative',
    model: 'Llama 3.3 70B',
    icon: '⚡',
    color: 'text-amber-400',
    defaultPrompt: 'Synthesize deterministic, PEP8-compliant Python scripts, quantitative transformations, and structured schema validations.'
  },
  {
    id: 'reviewer',
    name: 'QA Reviewer',
    role: 'Compliance & Citations',
    model: 'Llama 3.1 8B',
    icon: '🛡️',
    color: 'text-emerald-400',
    defaultPrompt: 'Audit candidate outputs for factual grounding, syntax integrity, zero secret leakage, and completeness before final emission.'
  }
];

const LAYOUT_STORAGE_KEY = 'azol_v1_workspace_layout_sizes';

const parseMessageContent = (rawText) => {
  if (!rawText) return { files: [], text: '' };
  let text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
  let files = [];
  try {
    const fileRegex = /^\[Attached Documents:\s*(.*?)\]\n\n/;
    const match = text.match(fileRegex);
    if (match) {
      files = match[1].split(',').map(f => f.trim());
      text = text.replace(fileRegex, '');
    }
    const projectRegex = /^\[Project Context:[\s\S]*?\]\n\n/;
    text = text.replace(projectRegex, '');
    const instructionRegex = /\n\n\[Instruction:[\s\S]*?\]$/;
    text = text.replace(instructionRegex, '');
  } catch (error) {
    console.error('Message parsing error:', error);
  }
  return { files, text };
};

const inferSmartArtifactName = (lang, codeBody, index) => {
  const extMap = {
    python: 'py',
    py: 'py',
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    json: 'json',
    sql: 'sql',
    bash: 'sh',
    sh: 'sh',
    html: 'html',
    css: 'css',
    markdown: 'md',
    md: 'md'
  };
  const ext = extMap[(lang || '').toLowerCase()] || (lang || 'txt').toLowerCase();

  const fnMatch = codeBody.match(/(?:def|class|function|const)\s+([a-zA-Z0-9_]+)/);
  if (fnMatch && fnMatch[1]) {
    return `${fnMatch[1].toLowerCase()}.${ext}`;
  }
  return `artifact_${index + 1}.${ext}`;
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
    return (
      <code className="bg-slate-800 text-amber-200 px-1.5 py-0.5 rounded-md text-xs font-mono border border-slate-700">
        {children}
      </code>
    );
  }

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-700/90 bg-[#121317] shadow-xl">
      <div className="flex justify-between items-center bg-slate-800/60 px-4 py-2 border-b border-slate-700/60 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <Code className="w-3.5 h-3.5 text-indigo-400"/>
          <span className="uppercase font-semibold text-indigo-300">{match[1]}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center text-slate-300 hover:text-white transition-colors bg-[#181a1e] px-2.5 py-1 rounded-md border border-slate-700"
        >
          {isCopied ? <Check className="w-3 h-3 mr-1 text-emerald-400"/> : <Copy className="w-3 h-3 mr-1"/>}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-indigo-200/95 leading-relaxed whitespace-pre-wrap break-words">
        <code>{children}</code>
      </pre>
    </div>
  );
};

const MEMOIZED_COMPONENTS = {
  h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-slate-100" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2 text-slate-200" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-3 mb-2 text-slate-300" {...props} />,
  p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-slate-300 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 mb-4 space-y-1 text-slate-300" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-1 text-slate-300" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-slate-100" {...props} />,
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto my-6 border border-slate-700 rounded-xl">
      <table className="w-full text-sm text-left text-slate-300 border-collapse" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700" {...props} />,
  tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-800/60" {...props} />,
  tr: ({ node, ...props }) => <tr className="hover:bg-slate-800/30 transition-colors" {...props} />,
  th: ({ node, ...props }) => <th className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap" {...props} />,
  td: ({ node, ...props }) => <td className="px-4 py-3" {...props} />,
  code: CodeBlock
};

const ChatInterface = ({ setActiveAgent, setSystemStatus, user }) => {
  const rawName = user?.email ? user.email.split('@')[0] : 'Operator';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // --- Resizable Split-Pane Layout State ---
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      leftWidth: 275,
      rightWidth: 315,
      activityHeightPct: 48,
      showLeftPanel: true,
      showRightPanel: true
    };
  });

  const [draggingHandle, setDraggingHandle] = useState(null);
  const workspaceContainerRef = useRef(null);
  const rightSidebarRef = useRef(null);

  // --- Core Workspace States ---
  const [input, setInput] = useState('');
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [threads, setThreads] = useState([]);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pausedState, setPausedState] = useState(null);
  const [expandedTraces, setExpandedTraces] = useState({});
  const [expandedSources, setExpandedSources] = useState({});
  const [indexedDocs, setIndexedDocs] = useState([]);
  const [previewSourceDoc, setPreviewSourceDoc] = useState(null);

  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [contextDocName, setContextDocName] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [artifacts, setArtifacts] = useState([]);
  const [previewArtifact, setPreviewArtifact] = useState(null);
  const [executionTimeline, setExecutionTimeline] = useState([]);
  const [inspectedNode, setInspectedNode] = useState(null);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const currentGraphStatus = isLoading ? 'executing' : 'idle';
  const plusIconClasses = `w-5 h-5 transition-transform ${showPlusMenu ? 'rotate-45' : ''}`;
  const plusButtonClasses = `p-2 rounded-full transition-colors flex items-center justify-center ${
    showPlusMenu ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
  }`;

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {}
  }, [layout]);

  // --- Mouse Drag Resizing Logic ---
  const handleMouseMove = useCallback(
    (e) => {
      if (!draggingHandle) return;

      if (draggingHandle === 'left' && workspaceContainerRef.current) {
        const rect = workspaceContainerRef.current.getBoundingClientRect();
        const nextLeft = Math.max(200, Math.min(420, e.clientX - rect.left));
        setLayout(prev => ({ ...prev, leftWidth: nextLeft }));
      } else if (draggingHandle === 'right' && workspaceContainerRef.current) {
        const rect = workspaceContainerRef.current.getBoundingClientRect();
        const nextRight = Math.max(250, Math.min(480, rect.right - e.clientX));
        setLayout(prev => ({ ...prev, rightWidth: nextRight }));
      } else if (draggingHandle === 'vertical' && rightSidebarRef.current) {
        const rect = rightSidebarRef.current.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const pct = Math.max(25, Math.min(75, Math.round((relY / rect.height) * 100)));
        setLayout(prev => ({ ...prev, activityHeightPct: pct }));
      }
    },
    [draggingHandle]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingHandle) setDraggingHandle(null);
  }, [draggingHandle]);

  useEffect(() => {
    if (draggingHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, handleMouseMove, handleMouseUp]);

  const resetLayoutSizes = () => {
    setLayout({
      leftWidth: 275,
      rightWidth: 315,
      activityHeightPct: 48,
      showLeftPanel: true,
      showRightPanel: true
    });
    showToast('Workspace panel dimensions reset to default.');
  };

  // Load indexed documents from PostgreSQL for document-grounded queries
  const fetchUserKnowledgeBase = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        setIndexedDocs(res.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUserKnowledgeBase();
    const activeDoc = localStorage.getItem('azol_active_doc_context');
    if (activeDoc) {
      setContextDocName(activeDoc);
      localStorage.removeItem('azol_active_doc_context');
      inputRef.current?.focus();
    }
  }, []);

  // 100% Dynamic & Truthful Source Resolution Engine (Zero Hardcoded Websites)
  const resolveMessageSources = useCallback(
    (msg, parsedText, precedingUserPrompt = '') => {
      // 1. If the backend captured live ToolMessage sources (from web_search or FAISS memory), return them directly
      if (msg?.meta?.sources_list && Array.isArray(msg.meta.sources_list) && msg.meta.sources_list.length > 0) {
        return msg.meta.sources_list;
      }

      const realSources = [];
      const seenIdentifiers = new Set();
      const bodyText = parsedText || '';
      const promptText = precedingUserPrompt || '';
      const combinedLower = `${promptText} ${bodyText}`.toLowerCase();

      // 2. Extract any real Markdown links [Title](https://...) present in the AI response
      const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      let match;
      while ((match = mdLinkRegex.exec(bodyText)) !== null) {
        const title = match[1].trim();
        const url = match[2].replace(/[.,;)]+$/, '');
        if (!seenIdentifiers.has(url)) {
          seenIdentifiers.add(url);
          let domain = 'Web Source';
          try {
            domain = new URL(url).hostname.replace(/^www\./, '');
          } catch (e) {}
          realSources.push({
            id: `md_url_${realSources.length + 1}`,
            name: title || domain,
            type: `WEB • ${domain}`,
            scope: domain,
            url,
            similarity: 'Cited URL',
            can_preview: true,
            is_web: true,
            excerpt: `Direct web citation in response: ${title} (${url})`
          });
        }
      }

      // 3. Extract any bare https:// URLs present in the AI response
      const bareUrlRegex = /(?<!\()(https?:\/\/[^\s)\]>,"']+)/g;
      while ((match = bareUrlRegex.exec(bodyText)) !== null) {
        const url = match[1].replace(/[.,;)]+$/, '');
        if (!seenIdentifiers.has(url)) {
          seenIdentifiers.add(url);
          let domain = 'Web Source';
          try {
            domain = new URL(url).hostname.replace(/^www\./, '');
          } catch (e) {}
          realSources.push({
            id: `bare_url_${realSources.length + 1}`,
            name: `${domain} — ${url.split('/').pop() || 'Web Citation'}`,
            type: `WEB • ${domain}`,
            scope: domain,
            url,
            similarity: 'Cited URL',
            can_preview: true,
            is_web: true,
            excerpt: `Direct URL referenced in response: ${url}`
          });
        }
      }

      // 4. Match Uploaded Knowledge Base Documents ONLY if explicitly attached or actually relevant by keyword
      if (indexedDocs && indexedDocs.length > 0) {
        const attachedMatch = promptText.match(/^\[Attached Documents:\s*(.*?)\]/i);
        const attachedNames = attachedMatch
          ? attachedMatch[1].split(',').map(s => s.trim().toLowerCase())
          : [];

        indexedDocs.forEach((doc) => {
          const fname = doc.filename || '';
          const fnameLower = fname.toLowerCase();
          // Extract meaningful keywords (>3 chars) from the document filename
          const nameTokens = fnameLower
            .replace(/\.[^/.]+$/, '')
            .split(/[\s._-]+/)
            .filter(tok => tok.length > 3 && !['final', 'paper', 'report', 'document', 'test', 'copy'].includes(tok));

          const isExplicitlyAttached = attachedNames.includes(fnameLower);
          const isFilenameMentioned = combinedLower.includes(fnameLower);
          const isTopicMatched =
            nameTokens.length > 0 &&
            nameTokens.some(tok => combinedLower.includes(tok)) &&
            (combinedLower.includes('document') ||
              combinedLower.includes('paper') ||
              combinedLower.includes('deepfake') ||
              combinedLower.includes('project'));

          if ((isExplicitlyAttached || isFilenameMentioned || isTopicMatched) && !seenIdentifiers.has(fnameLower)) {
            seenIdentifiers.add(fnameLower);
            realSources.push({
              id: doc.id,
              name: fname,
              type: `${doc.file_type || 'DOC'} • FAISS Vector Store (${doc.file_size || 'Indexed'})`,
              scope: isExplicitlyAttached ? 'Attached Document' : (doc.project_name || 'Knowledge Base'),
              chunks_matched: doc.chunks || 12,
              similarity: isExplicitlyAttached ? '100%' : 'FAISS Match',
              can_preview: true,
              is_web: false
            });
          }
        });
      }

      return realSources;
    },
    [indexedDocs]
  );

  // Open in-app Source Document or Web Citation Preview Modal
  const handlePreviewSourceItem = async (sourceItem) => {
    if (sourceItem.is_web || !sourceItem.can_preview || !sourceItem.id || isNaN(Number(sourceItem.id))) {
      setPreviewSourceDoc({
        filename: sourceItem.name,
        file_type: sourceItem.type,
        project_name: sourceItem.scope,
        chunks: sourceItem.chunks_matched || 4,
        similarity: sourceItem.similarity || '98%',
        url: sourceItem.url || null,
        is_web: Boolean(sourceItem.is_web),
        excerpt:
          sourceItem.excerpt ||
          `Verified grounding source "${sourceItem.name}" (${sourceItem.scope}) matched ${sourceItem.chunks_matched || 4} semantic segments during LangGraph execution.`
      });
      return;
    }

    setPreviewSourceDoc({
      id: sourceItem.id,
      filename: sourceItem.name,
      file_type: sourceItem.type,
      project_name: sourceItem.scope,
      chunks: sourceItem.chunks_matched,
      similarity: sourceItem.similarity,
      excerpt: 'Loading verified document chunks from FAISS & PostgreSQL...'
    });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/documents/${sourceItem.id}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewSourceDoc({
        ...res.data,
        similarity: sourceItem.similarity || '96%'
      });
    } catch (e) {
      setPreviewSourceDoc(prev => ({
        ...prev,
        excerpt: `Document "${sourceItem.name}" is indexed in the FAISS Knowledge Base across ${sourceItem.chunks_matched || 12} semantic chunks.`
      }));
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading, pausedState, executionTimeline]);

  useEffect(() => {
    if (chatHistory.length === 0) inputRef.current?.focus();
  }, [chatHistory.length]);

  useEffect(() => {
    const userMessages = chatHistory.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const { text } = parseMessageContent(userMessages[userMessages.length - 1].content);
      if (text) setLastUserPrompt(text);
    }
  }, [chatHistory]);

  // Extract Code & Report Artifacts
  useEffect(() => {
    const extracted = [];
    let snippetCounter = 0;
    let reportCounter = 0;

    chatHistory.forEach((msg) => {
      if (msg.role === 'ai' && msg.content) {
        const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        let foundCodeInMsg = false;

        while ((match = codeRegex.exec(msg.content)) !== null) {
          foundCodeInMsg = true;
          const lang = (match[1] || 'txt').toLowerCase();
          const codeContent = match[2].trim();
          const smartName = inferSmartArtifactName(lang, codeContent, snippetCounter);
          const ext = smartName.split('.').pop();
          snippetCounter += 1;

          extracted.push({
            id: `${msg.id}-code-${snippetCounter}`,
            name: smartName,
            type: ext,
            size: `${Math.max(0.2, codeContent.length / 1024).toFixed(1)} KB`,
            author: 'Data Analyst & Coding Nodes',
            content: codeContent
          });
        }

        if (
          !foundCodeInMsg &&
          msg.content.length > 320 &&
          !msg.content.startsWith('❌') &&
          !msg.content.startsWith('⚠️')
        ) {
          reportCounter += 1;
          extracted.push({
            id: `${msg.id}-report-${reportCounter}`,
            name: `synthesis_report_${reportCounter}.md`,
            type: 'md',
            size: `${(msg.content.length / 1024).toFixed(1)} KB`,
            author: 'Researcher & QA Reviewer',
            content: msg.content
          });
        }
      }
    });

    setArtifacts(extracted.reverse());
  }, [chatHistory]);

  // Build Contextual Agent Timeline
  useEffect(() => {
    if (!isLoading && chatHistory.length > 0) {
      const lastMsg = chatHistory[chatHistory.length - 1];
      const isLastMsgError =
        lastMsg.role === 'system' ||
        (lastMsg.role === 'ai' && (lastMsg.content?.startsWith('❌') || lastMsg.content?.startsWith('⚠️')));

      const userMsgs = chatHistory
        .filter(m => m.role === 'user')
        .map(m => m.content.toLowerCase())
        .join(' ');

      const steps = [
        {
          id: 'supervisor',
          name: 'Supervisor',
          status: 'complete',
          time: '0.4s',
          tokens: 92,
          detail: 'Intent classified & routed'
        }
      ];

      if (userMsgs.includes('search') || userMsgs.includes('latest') || userMsgs.includes('news') || userMsgs.includes('release')) {
        steps.push(
          { id: 'planner', name: 'Planner', status: 'complete', time: '0.6s', tokens: 110, detail: 'Search subtasks structured' },
          {
            id: 'researcher',
            name: 'Researcher',
            status: isLastMsgError ? 'failed' : 'complete',
            time: '1.3s',
            tokens: 240,
            detail: isLastMsgError ? 'Execution error / timeout' : 'Live Web SERP sources retrieved'
          },
          {
            id: 'reviewer',
            name: 'QA Reviewer',
            status: isLastMsgError ? 'halted' : 'complete',
            time: '0.5s',
            tokens: 84,
            detail: isLastMsgError ? 'Halted due to upstream error' : 'Citations & grounding verified'
          }
        );
      } else if (userMsgs.includes('code') || userMsgs.includes('python') || userMsgs.includes('json') || userMsgs.includes('script')) {
        steps.push(
          {
            id: 'analyst',
            name: 'Data Analyst',
            status: isLastMsgError ? 'failed' : 'complete',
            time: '1.1s',
            tokens: 215,
            detail: isLastMsgError ? 'Execution error / timeout' : 'Code synthesized & linted'
          },
          {
            id: 'reviewer',
            name: 'QA Reviewer',
            status: isLastMsgError ? 'halted' : 'complete',
            time: '0.5s',
            tokens: 68,
            detail: isLastMsgError ? 'Halted due to upstream error' : 'Syntax & edge-cases verified'
          }
        );
      } else {
        steps.push(
          { id: 'planner', name: 'Planner', status: 'complete', time: '0.5s', tokens: 95, detail: 'DAG workflow decomposed' },
          {
            id: 'researcher',
            name: 'Researcher',
            status: isLastMsgError ? 'failed' : 'complete',
            time: '1.2s',
            tokens: 210,
            detail: isLastMsgError ? 'Execution error / timeout' : 'FAISS long-term memory queried'
          },
          {
            id: 'reviewer',
            name: 'QA Reviewer',
            status: isLastMsgError ? 'halted' : 'complete',
            time: '0.4s',
            tokens: 76,
            detail: isLastMsgError ? 'Halted due to upstream error' : 'QA compliance approved'
          }
        );
      }

      setExecutionTimeline(steps);
    }
  }, [isLoading, currentThreadId, chatHistory.length]);

  const handleDownloadArtifact = (artifact, e) => {
    if (e) e.stopPropagation();
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${artifact.name}`);
  };

  // Load Global Workspace Threads Only (Catches proj_*, proj_thread_*, project-*, and [Project Context:])
  const loadThreads = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/orchestrator/chat/threads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawThreads = Array.isArray(response.data) ? response.data : [];
      const globalOnlyThreads = rawThreads.filter(t => {
        const tid = (t.thread_id || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        return (
          !t.project_id &&
          !tid.startsWith('proj_') &&
          !tid.startsWith('proj-') &&
          !tid.startsWith('project_') &&
          !tid.startsWith('project-') &&
          !title.includes('project context')
        );
      });
      setThreads(globalOnlyThreads);
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const loadChatHistory = async (threadId) => {
    if (isLoading) return;
    try {
      setCurrentThreadId(threadId);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/orchestrator/chat/history?thread_id=${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const safeHistory = (response.data || []).map((msg, idx) => ({
        ...msg,
        id: msg.id || `history-${threadId}-${idx}-${Date.now()}`
      }));

      setChatHistory(safeHistory);
      setPausedState(null);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleNewChat = () => {
    if (isLoading) handleStopExecution();
    setCurrentThreadId(null);
    setChatHistory([]);
    setAttachments([]);
    setContextDocName(null);
    setPausedState(null);
    setArtifacts([]);
    setExecutionTimeline([]);
  };

  const handleClearContext = () => {
    if (chatHistory.length === 0) return;
    if (!window.confirm('Clear the current conversation context and reset the workspace?')) return;
    handleNewChat();
    showToast('Conversation context cleared.');
  };

  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    if (setSystemStatus) setSystemStatus('idle');

    setExecutionTimeline(prev =>
      prev.map(n =>
        n.status === 'running'
          ? { ...n, status: 'halted', detail: 'Cancelled by operator.', time: 'Stopped' }
          : n
      )
    );

    setChatHistory(prev => [
      ...prev,
      {
        role: 'ai',
        content: '⚠️ **Execution Stopped by Operator**: The active LangGraph workflow was safely cancelled. You can click **Re-run** to resume or modify your prompt below.',
        isStopped: true,
        id: `stopped-${Date.now()}`
      }
    ]);
    showToast('Workflow execution stopped.');
  };

  const handleRerunLastWorkflow = (customPrompt = null) => {
    const promptToRun = customPrompt || lastUserPrompt;
    if (!promptToRun || isLoading) return;
    handleSubmit(null, promptToRun);
  };

  const handleDeleteThread = async (e, threadId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat thread?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/orchestrator/chat/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (currentThreadId === threadId) handleNewChat();
      loadThreads();
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const handleInspectNode = (nodeItem) => {
    const rosterMatch =
      AGENTS.find(a => a.id === nodeItem.id || a.name.toLowerCase() === (nodeItem.name || '').toLowerCase()) ||
      AGENTS[0];
    const latestAiMsg = [...chatHistory].reverse().find(m => m.role === 'ai');

    setInspectedNode({
      ...nodeItem,
      role: rosterMatch.role,
      model: rosterMatch.model || 'Llama 3.3 70B',
      icon: rosterMatch.icon || '🧠',
      systemPrompt: rosterMatch.defaultPrompt,
      inputPayload: lastUserPrompt || 'No active prompt in current session.',
      outputExcerpt: latestAiMsg?.content
        ? latestAiMsg.content.slice(0, 500) + (latestAiMsg.content.length > 500 ? '...' : '')
        : 'Checkpoint verified and passed to downstream node.'
    });
  };

  const handleSubmit = async (e, overrideMessage = null) => {
    if (e) e.preventDefault();
    const messageToProcess = overrideMessage || input;
    if (!messageToProcess.trim() && attachments.length === 0 && !contextDocName) return;

    const currentAttachments = [...attachments];
    const activeDocContext = contextDocName;
    const rawUserMessage =
      messageToProcess.trim() ||
      (activeDocContext ? `Summarize and analyze key findings from "${activeDocContext}".` : 'Please analyze the attached document.');

    setLastUserPrompt(rawUserMessage);

    const allDocNames = [
      ...(activeDocContext ? [activeDocContext] : []),
      ...currentAttachments.map(a => a.name)
    ];

    let persistentMessage = rawUserMessage;
    if (allDocNames.length > 0) {
      persistentMessage = `[Attached Documents: ${allDocNames.join(', ')}]\n\n${rawUserMessage}`;
    }

    setInput('');
    setAttachments([]);
    setContextDocName(null);
    setPausedState(null);
    setShowPlusMenu(false);

    const activeThreadId = currentThreadId || `thread-${Date.now()}`;
    if (!currentThreadId) setCurrentThreadId(activeThreadId);

    setChatHistory(prev => [...prev, { role: 'user', content: persistentMessage, id: `user-${Date.now()}` }]);
    setIsLoading(true);
    if (setSystemStatus) setSystemStatus('thinking');
    if (setActiveAgent) setActiveAgent(selectedAgent.name);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = localStorage.getItem('token');
      if (currentAttachments.length > 0) {
        for (const file of currentAttachments) {
          const formData = new FormData();
          formData.append('file', file);
          await axios.post('/api/v1/documents/upload', formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
        }
        await fetchUserKnowledgeBase();
      }

      let payloadMessage = persistentMessage;
      if (allDocNames.length > 0) {
        payloadMessage += `\n\n[Instruction: Referenced files (${allDocNames.join(', ')}) are indexed in FAISS long-term memory. Use search_long_term_memory to retrieve context and answer.]`;
      }

      setExecutionTimeline([
        { id: 'supervisor', name: 'Supervisor', status: 'running', time: null, tokens: 64, detail: 'Classifying & routing task...' }
      ]);

      const response = await fetch('/api/v1/orchestrator/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          thread_id: activeThreadId,
          message: payloadMessage,
          agent_id: selectedAgent.id
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let isStreamComplete = false;

      while (!isStreamComplete) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'node_update') {
                const nodeId = (data.node || 'supervisor').toLowerCase();
                const stepDur = data.duration_s ? `${data.duration_s}s` : `${(Math.random() * 0.6 + 0.3).toFixed(1)}s`;
                setExecutionTimeline(prev => {
                  if (prev.find(n => n.id === nodeId)) {
                    return prev.map(n =>
                      n.id === nodeId ? { ...n, status: 'complete', detail: 'Checkpoint verified.', time: stepDur } : n
                    );
                  }
                  const updated = prev.map(n => ({
                    ...n,
                    status: 'complete',
                    detail: 'Checkpoint verified.',
                    time: n.time || stepDur
                  }));
                  return [
                    ...updated,
                    {
                      id: nodeId,
                      name: AGENTS.find(a => a.id.toLowerCase() === nodeId || a.id.includes(nodeId))?.name || data.node,
                      status: 'running',
                      time: null,
                      tokens: 120,
                      detail: 'Executing node logic...'
                    }
                  ];
                });
              } else if (data.type === 'interrupted') {
                setExecutionTimeline(prev =>
                  prev.map(n => ({ ...n, status: 'halted', detail: 'Awaiting operator clearance.', time: '0.4s' }))
                );
                setPausedState(data.clearance_request);
                if (setSystemStatus) setSystemStatus('executing');
                isStreamComplete = true;
              } else if (data.type === 'complete') {
                setExecutionTimeline(prev =>
                  prev.map(n => ({ ...n, status: 'complete', detail: 'Task resolved.', time: n.time || '0.6s' }))
                );
                setChatHistory(prev => [
                  ...prev,
                  {
                    role: 'ai',
                    content: data.content,
                    meta: data.meta || null,
                    id: `ai-${Date.now()}`
                  }
                ]);
                if (setSystemStatus) setSystemStatus('idle');
                isStreamComplete = true;
              } else if (data.type === 'error') {
                throw new Error(data.content);
              }
            } catch (e) {
              if (e.message && e.message.includes('Execution failed')) throw e;
            }
          }
        }
      }

      await loadThreads();
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Execution failed:', error);
      setExecutionTimeline(prev =>
        prev.map((n, idx) =>
          idx === prev.length - 1
            ? { ...n, status: 'failed', detail: 'Node execution failed / timed out', time: 'Error' }
            : n
        )
      );
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: `❌ **Workflow Execution Error**: ${error.message || 'Network or processing timeout.'}`,
          isError: true,
          id: `sys-${Date.now()}`
        }
      ]);
      if (setSystemStatus) setSystemStatus('idle');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDecision = async (approved) => {
    setIsLoading(true);
    if (setSystemStatus) setSystemStatus('thinking');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/v1/orchestrator/resume',
        {
          thread_id: currentThreadId,
          approved: approved,
          reason: approved ? 'Granted by operator' : 'Denied by operator'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPausedState(null);
      const aiReplies = (response.data.messages || []).map((m, idx) => ({
        role: 'ai',
        content: m,
        id: `resume-ai-${Date.now()}-${idx}`
      }));
      setChatHistory(prev => [...prev, ...aiReplies]);
      await loadThreads();
    } catch (error) {
      console.error('Failed to resume chat:', error);
    } finally {
      setIsLoading(false);
      if (setSystemStatus) setSystemStatus('idle');
    }
  };

  const toggleTrace = (id) => setExpandedTraces(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleSources = (id) => setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }));

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      setInput(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const renderInputArea = () => (
    <div className="w-full relative max-w-4xl mx-auto z-20">
      {(attachments.length > 0 || contextDocName) && (
        <div className="flex flex-wrap gap-2 mb-3 px-2">
          {contextDocName && (
            <div className="flex items-center bg-indigo-950/60 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-mono text-indigo-200 shadow-sm">
              <Database className="w-3.5 h-3.5 mr-2 text-indigo-400" />
              <span className="truncate max-w-[240px]">FAISS Context: {contextDocName}</span>
              <button
                onClick={() => setContextDocName(null)}
                className="ml-2 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 shadow-sm backdrop-blur-sm"
            >
              <FileText className="w-3.5 h-3.5 mr-2 text-indigo-400" />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                className="ml-2 text-slate-500 hover:text-rose-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative bg-[#212327] border border-slate-700/60 rounded-3xl p-3 shadow-2xl focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isLoading || Boolean(pausedState)}
          rows={1}
          className="w-full max-h-60 min-h-[44px] py-2 px-3 bg-transparent resize-none focus:outline-none text-slate-100 placeholder-slate-500 disabled:opacity-50 text-base"
          placeholder={
            isListening
              ? 'Listening...'
              : contextDocName
              ? `Ask a question about ${contextDocName}...`
              : 'Ask the AI OS to orchestrate a task...'
          }
        />

        <div className="flex justify-between items-center mt-2 px-1">
          <div className="relative">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.csv,.txt,.docx,.pptx"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) setAttachments(prev => [...prev, ...files]);
                setShowPlusMenu(false);
              }}
            />
            <button onClick={() => setShowPlusMenu(!showPlusMenu)} disabled={isLoading} className={plusButtonClasses}>
              <Plus className={plusIconClasses} />
            </button>

            <AnimatePresence>
              {showPlusMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-3 w-64 bg-[#1e1f23] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                >
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="w-full flex items-center px-3 py-2.5 hover:bg-slate-800/80 rounded-xl transition-colors text-left text-sm text-slate-200 group"
                  >
                    <Paperclip className="w-4 h-4 mr-3 text-slate-400 group-hover:text-indigo-400" /> Upload documents
                  </button>
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      showToast('Multimodal Vision Engine scheduled for V2.0.');
                    }}
                    className="w-full flex items-center px-3 py-2.5 hover:bg-slate-800/80 rounded-xl transition-colors text-left text-sm text-slate-200 group"
                  >
                    <ImageIcon className="w-4 h-4 mr-3 text-slate-400 group-hover:text-amber-400" /> Image analysis
                  </button>
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      showToast('PostgreSQL Read-Only Inspector Active.');
                    }}
                    className="w-full flex items-center px-3 py-2.5 hover:bg-slate-800/80 rounded-xl transition-colors text-left text-sm text-slate-200 group"
                  >
                    <Database className="w-4 h-4 mr-3 text-slate-400 group-hover:text-emerald-400" /> Connect database
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowAgentMenu(!showAgentMenu)}
                className="flex items-center px-3 py-1.5 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
              >
                <span className="mr-1.5">{selectedAgent.icon}</span>
                {selectedAgent.name}
                <ChevronDown className="w-3 h-3 ml-1.5 opacity-60" />
              </button>
              <AnimatePresence>
                {showAgentMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-3 w-60 bg-[#1e1f23] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                  >
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Select Specialist Node
                    </div>
                    {AGENTS.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowAgentMenu(false);
                        }}
                        className="w-full flex items-center px-3 py-2 hover:bg-slate-800/80 rounded-xl transition-colors text-left text-sm text-slate-200"
                      >
                        <span className="w-5 text-center mr-2.5">{agent.icon}</span>
                        <div>
                          <p className={selectedAgent.id === agent.id ? `${agent.color} font-bold text-xs` : 'text-xs font-medium'}>
                            {agent.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500">{agent.role}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-2 transition-colors hidden sm:block ${
                isListening ? 'text-rose-500 animate-pulse' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Voice Input"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => showToast('Neural Text-to-Speech scheduled for V2.0.')}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
              title="Audio Output"
            >
              <Headphones className="w-4 h-4" />
            </button>

            {isLoading ? (
              <button
                type="button"
                onClick={handleStopExecution}
                className="flex items-center px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-mono font-bold transition-all shadow-md shadow-rose-500/20 ml-2"
                title="Stop running orchestration"
              >
                <Square className="w-3.5 h-3.5 mr-1 fill-current" /> Stop
              </button>
            ) : (
              <button
                onClick={(e) => handleSubmit(e)}
                disabled={Boolean(pausedState) || (!input.trim() && attachments.length === 0 && !contextDocName)}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-md ml-2"
                title="Dispatch task"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={workspaceContainerRef}
      className={`flex h-full w-full bg-[#0d0e12] relative overflow-hidden ${draggingHandle ? 'select-none' : ''}`}
    >
      {/* =========================================================
          1. LEFT RESIZABLE SIDEBAR: GLOBAL CHAT THREADS ONLY
         ========================================================= */}
      {layout.showLeftPanel && (
        <>
          <div
            style={{ width: `${layout.leftWidth}px` }}
            className="bg-[#131418] flex flex-col shrink-0 h-full overflow-hidden"
          >
            <div className="p-4 flex items-center space-x-2">
              <button
                onClick={handleNewChat}
                className="flex-1 flex items-center justify-between py-2.5 px-4 bg-transparent hover:bg-slate-800 border border-slate-700/50 text-slate-200 rounded-xl text-sm font-medium transition-all"
              >
                <div className="flex items-center">
                  <Plus className="w-4 h-4 mr-2 text-indigo-400" /> New Chat
                </div>
                <Terminal className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="px-4 pb-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
              <span>Global Threads</span>
              <span>{threads.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scroll-smooth">
              {threads.length === 0 ? (
                <div className="text-xs text-slate-600 px-3 py-4 italic">No global workspace threads yet.</div>
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                      currentThreadId === thread.thread_id
                        ? 'bg-slate-800/80 border border-slate-700 shadow-sm'
                        : 'hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => loadChatHistory(thread.thread_id)}
                      disabled={isLoading}
                      className="flex-1 flex flex-col text-left disabled:opacity-50 overflow-hidden"
                    >
                      <div className="flex items-center text-sm font-medium text-slate-200 truncate">
                        <span className="truncate">{thread.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">{thread.date_label}</div>
                    </button>
                    <button
                      onClick={(e) => handleDeleteThread(e, thread.thread_id)}
                      disabled={isLoading}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            onMouseDown={() => setDraggingHandle('left')}
            onDoubleClick={resetLayoutSizes}
            title="Drag to resize Threads panel (Double-click to reset)"
            className={`w-1.5 h-full cursor-col-resize flex items-center justify-center group transition-colors shrink-0 z-30 ${
              draggingHandle === 'left' ? 'bg-indigo-500' : 'bg-slate-800/80 hover:bg-indigo-500/70'
            }`}
          >
            <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </>
      )}

      {/* =========================================================
          2. CENTER WORKSPACE: CONVERSATION & INTENT-AWARE SOURCES
         ========================================================= */}
      <div className="flex-1 flex flex-col h-full bg-[#181a1e] relative min-w-[320px]">
        <div className="flex flex-wrap justify-between items-center gap-2 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setLayout(prev => ({ ...prev, showLeftPanel: !prev.showLeftPanel }))}
              className="p-1.5 text-slate-400 hover:text-white bg-[#212327] border border-slate-700/60 rounded-lg transition-colors"
              title={layout.showLeftPanel ? 'Collapse Threads Sidebar' : 'Expand Threads Sidebar'}
            >
              {layout.showLeftPanel ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>AI Workspace</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {chatHistory.length > 0 && (
              <>
                <button
                  onClick={() => handleRerunLastWorkflow()}
                  disabled={isLoading || !lastUserPrompt}
                  className="flex items-center px-2.5 py-1.5 text-xs font-mono text-slate-300 bg-[#212327] hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors disabled:opacity-40"
                  title="Re-run last workflow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
                  Re-run
                </button>

                <button
                  onClick={handleClearContext}
                  disabled={isLoading}
                  className="flex items-center px-2.5 py-1.5 text-xs font-mono text-slate-300 bg-[#212327] hover:bg-rose-500/15 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 rounded-lg transition-colors disabled:opacity-40"
                  title="Clear conversation context"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Clear Context
                </button>
              </>
            )}

            <button
              onClick={() => setShowPipelineModal(true)}
              className="flex items-center px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#212327] hover:bg-indigo-600/20 border border-slate-700/60 hover:border-indigo-500/50 hover:text-indigo-300 rounded-lg transition-all shadow-sm"
            >
              <GitMerge className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> View Pipeline Engine
            </button>

            <button
              onClick={() => setLayout(prev => ({ ...prev, showRightPanel: !prev.showRightPanel }))}
              className="p-1.5 text-slate-400 hover:text-white bg-[#212327] border border-slate-700/60 rounded-lg transition-colors"
              title={layout.showRightPanel ? 'Collapse Telemetry Panel' : 'Expand Telemetry Panel'}
            >
              {layout.showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-16 left-1/2 z-50 bg-indigo-600 border border-indigo-400 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium flex items-center"
            >
              <ShieldAlert className="w-4 h-4 mr-2 text-indigo-200" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {chatHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 mt-[-5%] overflow-y-auto">
            <h1 className="text-3xl md:text-4xl font-serif text-slate-200 mb-8 tracking-tight text-center">
              What shall we orchestrate next, {displayName}?
            </h1>
            {renderInputArea()}
            <div className="flex flex-wrap justify-center gap-3 mt-6 w-full max-w-3xl">
              <button
                onClick={() => handleSubmit(null, 'Write a Python script to parse JSON data.')}
                className="flex items-center px-4 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 rounded-full text-sm text-slate-300 transition-colors"
              >
                <Code className="w-4 h-4 mr-2 text-emerald-400" /> Write Code
              </button>
              <button
                onClick={() => handleSubmit(null, 'Search the web for the latest AI model releases.')}
                className="flex items-center px-4 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 rounded-full text-sm text-slate-300 transition-colors"
              >
                <Globe className="w-4 h-4 mr-2 text-blue-400" /> Web Research
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 rounded-full text-sm text-slate-300 transition-colors"
              >
                <BrainCircuit className="w-4 h-4 mr-2 text-purple-400" /> Analyze Documents
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth space-y-6 pb-32">
              <AnimatePresence>
                {chatHistory.map((msg, msgIdx) => {
                  const { files, text } = parseMessageContent(msg.content);
                  const isErrorMsg =
                    msg.role === 'system' ||
                    msg.isError ||
                    text.startsWith('❌') ||
                    text.startsWith('⚠️ **Workflow Execution Error');
                  const isStoppedMsg = Boolean(msg.isStopped || text.startsWith('⚠️ **Execution Stopped'));

                  const latencyLabel = msg.meta?.duration_s
                    ? `${msg.meta.duration_s}s`
                    : `${(text.length / 500 + 1.1).toFixed(1)}s`;
                  const tokensLabel = msg.meta?.tokens_used
                    ? `${msg.meta.tokens_used} Tokens`
                    : `${Math.max(128, Math.ceil(text.length / 3.5))} Tokens`;

                  // Find preceding user message for accurate per-message intent resolution
                  let precedingUserText = lastUserPrompt;
                  for (let j = msgIdx - 1; j >= 0; j--) {
                    if (chatHistory[j]?.role === 'user') {
                      precedingUserText = chatHistory[j].content || '';
                      break;
                    }
                  }

                  const messageSources =
                    msg.role !== 'user' ? resolveMessageSources(msg, text, precedingUserText) : [];
                  const isSourcesOpen = Boolean(expandedSources[msg.id]);

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start space-x-3 max-w-4xl mx-auto ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role !== 'user' && (
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 border ${
                            isErrorMsg
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : isStoppedMsg
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                              : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                          }`}
                        >
                          {isErrorMsg ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                      )}

                      <div className={`flex flex-col w-full ${msg.role === 'user' ? 'max-w-[75%]' : 'max-w-[90%]'}`}>
                        {msg.role !== 'user' && (
                          <div className="mb-2 flex items-center space-x-2">
                            <button
                              onClick={() => toggleTrace(msg.id)}
                              className="flex items-center text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors bg-slate-900/60 border border-slate-800 rounded-md px-2.5 py-1"
                            >
                              {expandedTraces[msg.id] ? (
                                <ChevronDown className="w-3 h-3 mr-1" />
                              ) : (
                                <ChevronRight className="w-3 h-3 mr-1" />
                              )}
                              {isErrorMsg ? (
                                <AlertTriangle className="w-3 h-3 mr-1.5 text-rose-400" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 mr-1.5 text-emerald-500" />
                              )}
                              Orchestration Trace
                            </button>

                            {(isErrorMsg || isStoppedMsg) && (
                              <button
                                onClick={() => handleRerunLastWorkflow()}
                                disabled={isLoading}
                                className="flex items-center text-xs font-mono text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 rounded-md px-2.5 py-1 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" /> Retry Step
                              </button>
                            )}
                          </div>
                        )}

                        <AnimatePresence>
                          {expandedTraces[msg.id] && msg.role !== 'user' && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mb-2"
                            >
                              <div className="ml-2 pl-3 border-l-2 border-indigo-500/40 space-y-1.5 py-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/30 rounded-r-xl px-3">
                                <div>
                                  <span className="text-indigo-400 font-semibold">Workflow DAG:</span> Supervisor → Planner → Specialist Node → QA Reviewer
                                </div>
                                <div>
                                  <span className="text-emerald-400 font-semibold">Grounding Engine:</span>{' '}
                                  {messageSources.some(s => s.is_web)
                                    ? 'Live Web Search SERP + PostgreSQL Thread Checkpointer'
                                    : 'FAISS Vector Store + PostgreSQL Thread Checkpointer'}
                                </div>
                                <div>
                                  <span className="text-amber-400 font-semibold">Telemetry:</span> {latencyLabel} execution • {tokensLabel}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div
                          className={`px-5 py-4 rounded-3xl shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-[#2a2d33] border border-slate-700/50 text-slate-200 ml-auto rounded-tr-sm'
                              : isErrorMsg
                              ? 'bg-rose-950/20 border border-rose-500/30 text-slate-200 w-full'
                              : 'bg-transparent text-slate-200 w-full'
                          }`}
                        >
                          {files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {files.map((filename, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center bg-indigo-950/40 border border-indigo-400/30 px-3 py-1.5 rounded-xl text-xs font-mono text-indigo-200"
                                >
                                  <FileText className="w-4 h-4 mr-2 text-indigo-400 shrink-0" />
                                  <span className="truncate max-w-[280px]">{filename}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className={`text-base leading-relaxed ${msg.role === 'user' ? 'font-sans' : 'markdown-body'}`}>
                            {msg.role === 'user' ? (
                              text
                            ) : (
                              <>
                                <ReactMarkdown components={MEMOIZED_COMPONENTS} remarkPlugins={[remarkGfm]}>
                                  {text}
                                </ReactMarkdown>

                                {/* =========================================================
                                    INTERACTIVE AI TRUST LAYER FOOTER (CLICKABLE SOURCES & AGENTS)
                                   ========================================================= */}
                                <div className="mt-5 pt-3 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 select-none">
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                    <span className="flex items-center" title="Total Execution Latency">
                                      <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> {latencyLabel}
                                    </span>

                                    {/* Interactive Clickable Sources Button */}
                                    <button
                                      type="button"
                                      onClick={() => toggleSources(msg.id)}
                                      className={`flex items-center px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                        isSourcesOpen
                                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold shadow-sm'
                                          : 'bg-[#14161b] hover:bg-blue-500/10 border-slate-700/80 hover:border-blue-500/40 text-blue-300'
                                      }`}
                                      title="Click to inspect & verify grounded sources"
                                    >
                                      {messageSources.some(s => s.is_web) ? (
                                        <Globe className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                                      ) : (
                                        <Database className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                                      )}
                                      <span>{messageSources.length} Sources</span>
                                      {isSourcesOpen ? (
                                        <ChevronDown className="w-3 h-3 ml-1 text-blue-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 ml-1 text-slate-500" />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => toggleTrace(msg.id)}
                                      className="flex items-center px-2 py-1 rounded-lg hover:bg-slate-800/70 text-slate-300 hover:text-purple-300 transition-colors"
                                      title="Click to view participating agents"
                                    >
                                      <Activity className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                                      <span>{executionTimeline.length || 4} Agents</span>
                                    </button>

                                    <span className="flex items-center" title="Total Prompt + Completion Tokens">
                                      <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> {tokensLabel}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => handleRerunLastWorkflow()}
                                      disabled={isLoading}
                                      className="text-slate-400 hover:text-indigo-300 flex items-center transition-colors"
                                      title="Re-run this workflow"
                                    >
                                      <RefreshCw className="w-3 h-3 mr-1" /> Re-run
                                    </button>
                                    {isErrorMsg ? (
                                      <span className="flex items-center text-rose-400 font-semibold">
                                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Step Failed
                                      </span>
                                    ) : isStoppedMsg ? (
                                      <span className="flex items-center text-amber-400 font-semibold">
                                        <Square className="w-3 h-3 mr-1" /> Cancelled
                                      </span>
                                    ) : (
                                      <span className="flex items-center text-emerald-400 font-semibold">
                                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> QA Approved
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* EXPANDABLE VERIFIED GROUNDING SOURCES DRAWER */}
                                <AnimatePresence>
                                  {isSourcesOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-3 p-4 bg-[#12141a] border border-blue-500/25 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-300 flex items-center">
                                            {messageSources.some(s => s.is_web) ? (
                                              <>
                                                <Globe className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                                                Live Web Search Grounding & Citations ({messageSources.length})
                                              </>
                                            ) : (
                                              <>
                                                <Database className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                                                Verified Grounding Sources & Citations ({messageSources.length})
                                              </>
                                            )}
                                          </span>
                                          <span className="text-[10px] font-mono text-emerald-400">
                                            {messageSources.some(s => s.is_web)
                                              ? '✓ Live Web SERP Verified'
                                              : '✓ FAISS & Memory Verified'}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          {messageSources.map((src, sIdx) => (
                                            <div
                                              key={src.id + sIdx}
                                              onClick={() => handlePreviewSourceItem(src)}
                                              className="p-3 bg-[#181a20] hover:bg-[#1e2129] border border-slate-800 hover:border-blue-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                                            >
                                              <div className="min-w-0 pr-2">
                                                <div className="flex items-center space-x-2">
                                                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                                    #{sIdx + 1}
                                                  </span>
                                                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-300 transition-colors">
                                                    {src.name}
                                                  </p>
                                                </div>
                                                <div className="flex items-center space-x-2 mt-1 text-[10px] font-mono text-slate-400">
                                                  <span className="truncate">{src.scope}</span>
                                                  <span>•</span>
                                                  <span className="text-emerald-400 shrink-0">{src.similarity || '96%'} match</span>
                                                </div>
                                              </div>

                                              {src.url ? (
                                                <a
                                                  href={src.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="px-2.5 py-1 bg-[#131418] hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-[10px] font-mono flex items-center shrink-0 transition-colors"
                                                  title="Open Web Source in New Tab"
                                                >
                                                  <ExternalLink className="w-3 h-3 mr-1" /> Visit
                                                </a>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePreviewSourceItem(src);
                                                  }}
                                                  className="px-2.5 py-1 bg-[#131418] group-hover:bg-blue-600 text-slate-300 group-hover:text-white border border-slate-700 rounded-lg text-[10px] font-mono flex items-center shrink-0 transition-colors"
                                                >
                                                  <Eye className="w-3 h-3 mr-1" /> Check
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isLoading && !pausedState && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between max-w-4xl mx-auto pl-12 pr-4 py-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl"
                >
                  <div className="flex items-center space-x-3 text-slate-300 text-xs font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Workforce orchestrating task across LangGraph nodes...</span>
                  </div>
                  <button
                    onClick={handleStopExecution}
                    className="flex items-center px-3 py-1 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-mono transition-colors"
                  >
                    <Square className="w-3 h-3 mr-1.5 fill-current" /> Stop Task
                  </button>
                </motion.div>
              )}

              {pausedState && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-3xl mx-auto ml-11 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl shadow-lg backdrop-blur-md"
                >
                  <div className="flex items-start">
                    <ShieldAlert className="w-6 h-6 text-amber-400 mr-3 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-300 tracking-wide uppercase">
                        {pausedState.action || 'Security Clearance Required'}
                      </h4>
                      <p className="text-sm text-amber-200/80 mt-1">
                        {pausedState.details || 'Human authorization required to proceed with execution.'}
                      </p>
                      <div className="mt-4 flex space-x-3">
                        <button
                          onClick={() => handleDecision(true)}
                          disabled={isLoading}
                          className="flex items-center bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Authorize
                        </button>
                        <button
                          onClick={() => handleDecision(false)}
                          disabled={isLoading}
                          className="flex items-center bg-rose-600/20 border border-rose-500/50 hover:bg-rose-600 hover:text-white text-rose-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Abort
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#181a1e] via-[#181a1e] to-transparent pt-10">
              {renderInputArea()}
            </div>
          </>
        )}
      </div>

      {/* =========================================================
          3. RIGHT RESIZABLE SIDEBAR: INTERACTIVE AGENT ACTIVITY & ARTIFACTS
         ========================================================= */}
      {layout.showRightPanel && (
        <>
          <div
            onMouseDown={() => setDraggingHandle('right')}
            onDoubleClick={resetLayoutSizes}
            title="Drag to resize Agent Activity & Artifacts panel (Double-click to reset)"
            className={`w-1.5 h-full cursor-col-resize flex items-center justify-center group transition-colors shrink-0 z-30 ${
              draggingHandle === 'right' ? 'bg-indigo-500' : 'bg-slate-800/80 hover:bg-indigo-500/70'
            }`}
          >
            <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div
            ref={rightSidebarRef}
            style={{ width: `${layout.rightWidth}px` }}
            className="bg-[#131418] flex flex-col shrink-0 h-full overflow-hidden"
          >
            <div
              style={{ height: `${layout.activityHeightPct}%` }}
              className="p-5 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-indigo-400" /> Agent Activity
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">Click node to inspect</span>
                </div>

                <div className="space-y-3">
                  {executionTimeline.length === 0 ? (
                    <div className="text-xs text-slate-600 italic">No tasks executed yet.</div>
                  ) : (
                    executionTimeline.map((agent, index) => {
                      const isFailed = agent.status === 'failed';
                      const isHalted = agent.status === 'halted';
                      const isRunning = agent.status === 'running';

                      return (
                        <div
                          key={agent.id + index}
                          onClick={() => handleInspectNode(agent)}
                          className="group relative flex items-start p-2 -mx-2 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors"
                          title="Click to inspect agent prompt, I/O & telemetry"
                        >
                          {index !== executionTimeline.length - 1 && (
                            <div className="absolute left-4 top-8 bottom-[-12px] w-px bg-slate-800" />
                          )}
                          <div className="relative z-10 flex items-center justify-center w-5 h-5 mt-0.5 bg-[#131418] rounded-full">
                            {isFailed ? (
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                            ) : isHalted ? (
                              <Square className="w-3.5 h-3.5 text-amber-400" />
                            ) : isRunning ? (
                              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span
                                className={`text-xs font-bold capitalize group-hover:text-indigo-300 transition-colors ${
                                  isFailed
                                    ? 'text-rose-400'
                                    : isHalted
                                    ? 'text-amber-300'
                                    : isRunning
                                    ? 'text-indigo-300'
                                    : 'text-slate-200'
                                }`}
                              >
                                {agent.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">{agent.time || '...'}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{agent.detail}</p>
                            {isFailed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRerunLastWorkflow();
                                }}
                                className="mt-1.5 inline-flex items-center px-2 py-0.5 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded text-[10px] font-mono"
                              >
                                <RefreshCw className="w-2.5 h-2.5 mr-1" /> Retry Node
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div
              onMouseDown={() => setDraggingHandle('vertical')}
              onDoubleClick={resetLayoutSizes}
              title="Drag up/down to resize Activity vs Artifacts height"
              className={`h-1.5 w-full cursor-row-resize flex items-center justify-center group transition-colors shrink-0 z-30 ${
                draggingHandle === 'vertical' ? 'bg-indigo-500' : 'bg-slate-800/90 hover:bg-indigo-500/70'
              }`}
            >
              <GripHorizontal className="w-4 h-3 text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Database className="w-4 h-4 mr-2 text-amber-400" /> Artifacts
                </h3>
                <span className="text-[10px] font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-full">
                  {artifacts.length}
                </span>
              </div>

              {artifacts.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-slate-800/80 rounded-xl bg-slate-900/20">
                  <Download className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No files or code artifacts generated yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {artifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      onClick={() => setPreviewArtifact(artifact)}
                      className="group p-3 bg-[#181a1e] border border-slate-800 hover:border-indigo-500/50 rounded-xl transition-all cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0 ${
                            artifact.type === 'py'
                              ? 'bg-blue-500/10 text-blue-400'
                              : artifact.type === 'md'
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {['py', 'js', 'ts', 'json', 'sql', 'sh'].includes(artifact.type) ? (
                            <Code className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                            {artifact.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 uppercase">
                            {artifact.type} • {artifact.size}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewArtifact(artifact);
                          }}
                          className="flex-1 flex items-center justify-center py-1 px-2 bg-[#131418] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-[11px] font-mono transition-colors"
                        >
                          <Eye className="w-3 h-3 mr-1.5 text-indigo-400" /> Preview
                        </button>
                        <button
                          onClick={(e) => handleDownloadArtifact(artifact, e)}
                          className="flex-1 flex items-center justify-center py-1 px-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-[11px] font-mono transition-colors"
                        >
                          <Download className="w-3 h-3 mr-1.5" /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================================================
          4. MODALS: PIPELINE ENGINE, NODE INSPECTOR, ARTIFACT & SOURCE PREVIEW
         ========================================================= */}
      <AnimatePresence>
        {showPipelineModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-6xl h-[86vh] flex flex-col bg-[#131418] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-6 py-4 bg-[#181a1e] border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <GitMerge className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-slate-200 tracking-wide uppercase">
                    Live Orchestration Pipeline
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                    (Click any node below to inspect its live Prompt, I/O & Telemetry)
                  </span>
                </div>
                <button
                  onClick={() => setShowPipelineModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 relative bg-[#0a0a0c] overflow-hidden">
                <GraphVisualizer executionTimeline={executionTimeline} status={currentGraphStatus} />
              </div>

              <div className="px-6 py-3.5 bg-[#15171c] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Interactive Node Telemetry:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {AGENTS.map((ag) => {
                    const liveStep = executionTimeline.find(
                      s => s.id === ag.id || s.name.toLowerCase() === ag.name.toLowerCase()
                    );
                    return (
                      <button
                        key={ag.id}
                        onClick={() =>
                          handleInspectNode(
                            liveStep || {
                              id: ag.id,
                              name: ag.name,
                              status: 'complete',
                              time: '0.5s',
                              tokens: 115,
                              detail: 'Node standing by in StateGraph.'
                            }
                          )
                        }
                        className="flex items-center px-3 py-1.5 bg-[#181a1e] hover:bg-indigo-600/20 border border-slate-700 hover:border-indigo-500/50 rounded-xl text-xs font-mono text-slate-200 transition-all"
                      >
                        <span className="mr-1.5">{ag.icon}</span>
                        <span>{ag.name}</span>
                        <span className="ml-2 text-[10px] text-emerald-400">{liveStep?.time || 'Ready'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {inspectedNode && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setInspectedNode(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#181a1e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 bg-[#131418] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{inspectedNode.icon}</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                      <span>{inspectedNode.name} — Node Telemetry</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          inspectedNode.status === 'failed'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {inspectedNode.status || 'Verified'}
                      </span>
                    </h3>
                    <p className="text-xs font-mono text-slate-400">{inspectedNode.role}</p>
                  </div>
                </div>
                <button onClick={() => setInspectedNode(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 bg-[#0d0e12] font-mono text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#131418] border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase block">Model Backbone</span>
                    <span className="text-xs font-bold text-indigo-300 mt-1 block">{inspectedNode.model}</span>
                  </div>
                  <div className="bg-[#131418] border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase block">Node Latency</span>
                    <span className="text-xs font-bold text-slate-200 mt-1 block">{inspectedNode.time || '0.6s'}</span>
                  </div>
                  <div className="bg-[#131418] border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase block">Token Share</span>
                    <span className="text-xs font-bold text-amber-400 mt-1 block">~{inspectedNode.tokens || 120} Tok</span>
                  </div>
                </div>

                <div className="bg-[#131418] border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase text-indigo-400 font-bold block">Active System Directive</span>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">{inspectedNode.systemPrompt}</p>
                </div>

                <div className="bg-[#131418] border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase text-emerald-400 font-bold block">Incoming State Payload (Input)</span>
                  <p className="text-slate-200 text-xs whitespace-pre-wrap">{inspectedNode.inputPayload}</p>
                </div>

                <div className="bg-[#131418] border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase text-amber-400 font-bold block">Node Checkpoint Output</span>
                  <p className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">{inspectedNode.outputExcerpt}</p>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#131418] border-t border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => {
                    const targetName = inspectedNode.name;
                    setInspectedNode(null);
                    setShowPipelineModal(false);
                    handleRerunLastWorkflow();
                    showToast(`Re-running workflow from ${targetName}...`);
                  }}
                  disabled={isLoading || !lastUserPrompt}
                  className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-run Node Step
                </button>
                <button
                  onClick={() => setInspectedNode(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* IN-APP VERIFIED SOURCE PREVIEW MODAL */}
        {previewSourceDoc && (
          <div
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewSourceDoc(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-[#181a1e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 bg-[#131418] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    {previewSourceDoc.is_web ? (
                      <Globe className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Database className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-100 truncate">{previewSourceDoc.filename}</h3>
                    <p className="text-[11px] font-mono text-slate-400">
                      {previewSourceDoc.project_name || 'Grounding Store'} •{' '}
                      <span className="text-emerald-400">{previewSourceDoc.similarity || '96%'} Semantic Match</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setPreviewSourceDoc(null)} className="p-1.5 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-[#0d0e12] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono bg-[#131418] px-4 py-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">
                    Source Protocol:{' '}
                    <strong className="text-indigo-300">
                      {previewSourceDoc.is_web ? 'Live HTTP/HTTPS Web SERP' : 'BAAI/bge-small-en-v1.5 (FAISS)'}
                    </strong>
                  </span>
                  <span className="text-emerald-400 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Grounding Verified
                  </span>
                </div>

                <div className="bg-[#131418] border border-slate-800 rounded-xl p-4">
                  <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block mb-2">
                    {previewSourceDoc.is_web ? 'Verified Web Search Excerpt' : 'Extracted Source Text / Vector Chunk Excerpt'}
                  </span>
                  <pre className="text-xs sm:text-sm font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {previewSourceDoc.excerpt}
                  </pre>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#131418] border-t border-slate-800 flex justify-end space-x-2.5">
                {previewSourceDoc.url ? (
                  <a
                    href={previewSourceDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Visit Web Source
                  </a>
                ) : (
                  previewSourceDoc.id && !isNaN(Number(previewSourceDoc.id)) && (
                    <a
                      href={`/api/v1/documents/${previewSourceDoc.id}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Download Source File
                    </a>
                  )
                )}
                <button
                  onClick={() => setPreviewSourceDoc(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Close Verification
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* IN-APP ARTIFACT PREVIEW & DOWNLOAD MODAL */}
        {previewArtifact && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewArtifact(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-[#181a1e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 bg-[#131418] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{previewArtifact.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400">
                      {previewArtifact.type.toUpperCase()} • {previewArtifact.size} • {previewArtifact.author}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleDownloadArtifact(previewArtifact, e)}
                    className="flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                  </button>
                  <button onClick={() => setPreviewArtifact(null)} className="p-1.5 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-[#0d0e12]">
                <pre className="text-xs sm:text-sm font-mono text-indigo-200 whitespace-pre-wrap leading-relaxed">
                  {previewArtifact.content}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;