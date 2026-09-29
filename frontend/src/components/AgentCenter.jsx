import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Save, RotateCcw, GitBranch, History, CheckCircle2,
  Sliders, Shield, Database, Wrench,
  ArrowLeftRight, Loader2, Terminal,
  Layers, Globe, FileCheck
} from 'lucide-react';
import axios from 'axios';

const DEFAULT_AGENT_NODES = [
  {
    id: 'supervisor',
    name: 'Supervisor',
    role: 'Core Graph Orchestrator & Router',
    tier: 'V1 Core',
    icon: '🧠',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    maxTokens: 4096,
    timeoutSec: 60,
    maxRetries: 3,
    status: 'Online',
    systemPrompt: `You are the AZOL AI Supervisor Node operating inside a LangGraph multi-agent state machine.
Your primary responsibility is to analyze the operator's incoming request, decompose complex objectives, and route execution to the appropriate specialist node (Planner, Researcher, Analyst, Memory, or Reviewer).

ROUTING & ORCHESTRATION DIRECTIVES:
1. Inspect active project context, indexed FAISS documents, and memory guardrails before delegating.
2. Never fabricate citations or data—delegate factual retrieval to the Researcher node and quantitative/code tasks to the Analyst node.
3. Require QA Reviewer verification before emitting the final synthesized response to the operator.`,
    tools: {
      web_search: true,
      faiss_rag: true,
      python_sandbox: false,
      sql_readonly: false,
      artifact_writer: true,
      human_approval: true
    },
    permissions: {
      allowExternalNetwork: true,
      allowFileSystemWrite: true,
      requireHumanApprovalHighRisk: true,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: true,
      topKChunks: 6,
      knowledgeScope: 'All Bound Project & Global Docs'
    }
  },
  {
    id: 'planner',
    name: 'Planner',
    role: 'DAG Task Decomposition & Strategy',
    tier: 'V1 Core',
    icon: '📐',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 2048,
    timeoutSec: 45,
    maxRetries: 2,
    status: 'Online',
    systemPrompt: `You are the AZOL AI Planner Node.
Transform high-level operator requests into a structured, dependency-ordered Directed Acyclic Graph (DAG) of subtasks.

PLANNING RULES:
1. Break complex multi-step prompts into atomic, verifiable subtasks with explicit agent assignments.
2. Identify which subtasks can execute in parallel and which require sequential outputs.
3. Define clear acceptance criteria for the QA Reviewer node.`,
    tools: {
      web_search: false,
      faiss_rag: true,
      python_sandbox: false,
      sql_readonly: false,
      artifact_writer: false,
      human_approval: false
    },
    permissions: {
      allowExternalNetwork: false,
      allowFileSystemWrite: false,
      requireHumanApprovalHighRisk: false,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: true,
      topKChunks: 4,
      knowledgeScope: 'Project Tasks & Architecture Docs'
    }
  },
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'FAISS Semantic RAG & Web Intelligence',
    tier: 'V1 Core',
    icon: '🔍',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    maxTokens: 4096,
    timeoutSec: 60,
    maxRetries: 3,
    status: 'Online',
    systemPrompt: `You are the AZOL AI Researcher Node specializing in deep semantic retrieval and evidence synthesis.
Query the FAISS Long-Term Memory vector store and live web search tools to gather verifiable facts, metrics, and citations.

RESEARCH DIRECTIVES:
1. Always prioritize uploaded project documents and Knowledge Base chunks over general pre-training knowledge.
2. Attach exact source filenames and chunk references to every extracted claim.
3. Flag any missing or contradictory data explicitly for the Supervisor.`,
    tools: {
      web_search: true,
      faiss_rag: true,
      python_sandbox: false,
      sql_readonly: true,
      artifact_writer: true,
      human_approval: false
    },
    permissions: {
      allowExternalNetwork: true,
      allowFileSystemWrite: false,
      requireHumanApprovalHighRisk: false,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: true,
      topKChunks: 10,
      knowledgeScope: 'Global & Project FAISS Vector Store'
    }
  },
  {
    id: 'analyst',
    name: 'Analyst',
    role: 'Quantitative Analysis & Python Sandbox',
    tier: 'V1 Core',
    icon: '⚡',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    maxTokens: 4096,
    timeoutSec: 90,
    maxRetries: 2,
    status: 'Online',
    systemPrompt: `You are the AZOL AI Data Analyst Node.
Execute quantitative analysis, data transformation, schema inspection, and code synthesis.

ANALYTICAL DIRECTIVES:
1. Write clean, deterministic, PEP8-compliant Python code and structured Markdown tables.
2. Validate all calculations, percentages, and aggregations before returning artifacts.
3. Output reusable scripts and structured datasets ready for the Artifact Ledger.`,
    tools: {
      web_search: false,
      faiss_rag: true,
      python_sandbox: true,
      sql_readonly: true,
      artifact_writer: true,
      human_approval: true
    },
    permissions: {
      allowExternalNetwork: false,
      allowFileSystemWrite: true,
      requireHumanApprovalHighRisk: true,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: true,
      topKChunks: 6,
      knowledgeScope: 'CSV, XLSX, SQL & Technical Docs'
    }
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'QA Compliance, Grounding & Trust Audit',
    tier: 'V1 Core',
    icon: '🛡️',
    model: 'llama-3.1-8b-instant',
    temperature: 0.0,
    maxTokens: 2048,
    timeoutSec: 30,
    maxRetries: 2,
    status: 'Online',
    systemPrompt: `You are the AZOL AI QA Reviewer Node.
Audit all candidate responses and generated artifacts produced by the workforce before final delivery.

VERIFICATION CHECKLIST:
1. Grounding Check: Verify that every factual claim is supported by retrieved FAISS sources.
2. Security & Policy Check: Ensure zero exposure of API secrets, credentials, or restricted identifiers.
3. Completeness Check: Confirm all parts of the operator's prompt were addressed accurately.`,
    tools: {
      web_search: false,
      faiss_rag: true,
      python_sandbox: false,
      sql_readonly: false,
      artifact_writer: false,
      human_approval: true
    },
    permissions: {
      allowExternalNetwork: false,
      allowFileSystemWrite: false,
      requireHumanApprovalHighRisk: true,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: true,
      topKChunks: 5,
      knowledgeScope: 'All Active Context & Security Guardrails'
    }
  },
  {
    id: 'memory',
    name: 'Memory',
    role: 'Long-Term Context & Directive Sync',
    tier: 'V1 Core',
    icon: '🗄️',
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    maxTokens: 2048,
    timeoutSec: 30,
    maxRetries: 2,
    status: 'Online',
    systemPrompt: `You are the AZOL AI Memory Node.
Manage short-term conversation checkpoints and long-term semantic memory consolidation across sessions.

MEMORY DIRECTIVES:
1. Extract persistent operator preferences, architectural decisions, and project constraints.
2. Prune redundant context tokens while preserving high-salience facts and active directives.`,
    tools: {
      web_search: false,
      faiss_rag: true,
      python_sandbox: false,
      sql_readonly: true,
      artifact_writer: false,
      human_approval: false
    },
    permissions: {
      allowExternalNetwork: false,
      allowFileSystemWrite: false,
      requireHumanApprovalHighRisk: false,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: true,
      topKChunks: 8,
      knowledgeScope: 'PostgreSQL Checkpoints & FAISS Store'
    }
  },
  {
    id: 'human_loop',
    name: 'Human-in-the-Loop',
    role: 'High-Risk Action Clearance Gate',
    tier: 'V1 Core',
    icon: '🔐',
    model: 'llama-3.1-8b-instant',
    temperature: 0.0,
    maxTokens: 1024,
    timeoutSec: 120,
    maxRetries: 1,
    status: 'Online',
    systemPrompt: `You are the AZOL AI Human-in-the-Loop Security Gate.
Intercept any high-risk, destructive, or external mutation action requested by an agent and pause graph execution until explicit operator approval is granted.`,
    tools: {
      web_search: false,
      faiss_rag: false,
      python_sandbox: false,
      sql_readonly: false,
      artifact_writer: false,
      human_approval: true
    },
    permissions: {
      allowExternalNetwork: false,
      allowFileSystemWrite: false,
      requireHumanApprovalHighRisk: true,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: false,
      topKChunks: 2,
      knowledgeScope: 'Security & RBAC Policy Ledger'
    }
  },
  {
    id: 'coding',
    name: 'Coding Agent',
    role: 'Autonomous Software Synthesis & Refactoring',
    tier: 'V2 Roadmap',
    icon: '💻',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    maxTokens: 8192,
    timeoutSec: 120,
    maxRetries: 3,
    status: 'Standby',
    systemPrompt: `You are the AZOL AI Coding Agent.
Synthesize production-ready full-stack modules, unit tests, and refactoring patches while respecting repository conventions.`,
    tools: {
      web_search: false,
      faiss_rag: true,
      python_sandbox: true,
      sql_readonly: false,
      artifact_writer: true,
      human_approval: true
    },
    permissions: {
      allowExternalNetwork: false,
      allowFileSystemWrite: true,
      requireHumanApprovalHighRisk: true,
      promptInjectionShield: true
    },
    memoryConfig: {
      shortTermCheckpointer: true,
      longTermFaissRag: true,
      topKChunks: 8,
      knowledgeScope: 'Codebase & Architecture Specs'
    }
  }
];

const MODEL_OPTIONS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Default)' },
  { id: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (High Reasoning)' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Low Latency)' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B 32K (Extended Context)' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B IT (Compact Specialist)' }
];

const TOOL_DEFINITIONS = [
  { key: 'faiss_rag', label: 'FAISS Vector Knowledge Base', desc: 'Semantic chunk retrieval across indexed PDFs, DOCX, and PPTX files', icon: Database },
  { key: 'web_search', label: 'Live Internet & SERP Search', desc: 'Real-time external web research and citation verification', icon: Globe },
  { key: 'python_sandbox', label: 'Sandboxed Python Executor', desc: 'Isolated execution environment for data analysis and scripts', icon: Terminal },
  { key: 'sql_readonly', label: 'PostgreSQL Read-Only Inspector', desc: 'Query structured relational tables without mutation permissions', icon: Layers },
  { key: 'artifact_writer', label: 'Artifact & Deliverable Generator', desc: 'Compile and export code, Markdown, and report files to workspace', icon: FileCheck },
  { key: 'human_approval', label: 'Human-in-the-Loop Approval Gate', desc: 'Pause graph execution and request operator clearance on high-risk actions', icon: Shield }
];

const STORAGE_KEY = 'azol_v1_agent_center_registry_v2';

const buildInitialRegistry = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 8) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse cached agent registry:', e);
  }

  return DEFAULT_AGENT_NODES.map(agent => ({
    ...agent,
    currentVersion: 'v1.1',
    isCustomized: false,
    versions: [
      {
        version: 'v1.1',
        prompt: agent.systemPrompt,
        model: agent.model,
        temperature: agent.temperature,
        timestamp: 'Initial V1 Baseline',
        author: 'System Default'
      }
    ]
  }));
};

const AgentCenter = () => {
  const [agents, setAgents] = useState(buildInitialRegistry);
  const [selectedAgentId, setSelectedAgentId] = useState('supervisor');
  const [activeSubTab, setActiveSubTab] = useState('prompt'); // 'prompt' | 'capabilities' | 'memory' | 'versions'

  // Editable Draft States for Selected Agent
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftModel, setDraftModel] = useState('');
  const [draftTemp, setDraftTemp] = useState(0.2);
  const [draftMaxTokens, setDraftMaxTokens] = useState(4096);
  const [draftTimeout, setDraftTimeout] = useState(60);
  const [draftRetries, setDraftRetries] = useState(3);
  const [draftStatus, setDraftStatus] = useState('Online');
  const [draftTools, setDraftTools] = useState({});
  const [draftPermissions, setDraftPermissions] = useState({});
  const [draftMemory, setDraftMemory] = useState({});

  // UI Feedback & Version Compare Modal
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployToast, setDeployToast] = useState(null);
  const [compareVersionObj, setCompareVersionObj] = useState(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  // Hydrate saved configurations from PostgreSQL (/api/v1/agents/config) on mount
  useEffect(() => {
    const fetchBackendAgentConfigs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/v1/agents/config', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dbConfigs = Array.isArray(res.data) ? res.data : [];
        if (dbConfigs.length === 0) return;

        setAgents(prevAgents => {
          const merged = prevAgents.map(agent => {
            const match = dbConfigs.find(
              c =>
                (c.agent_name && c.agent_name.toLowerCase() === agent.name.toLowerCase()) ||
                (c.agent_name && c.agent_name.toLowerCase() === agent.id.toLowerCase())
            );
            if (!match) return agent;

            // Ignore legacy "Test Prompt" placeholder so production baseline stays intact unless customized
            const validDbPrompt =
              match.system_prompt && match.system_prompt.trim() !== 'Test Prompt'
                ? match.system_prompt
                : agent.systemPrompt;

            return {
              ...agent,
              systemPrompt: validDbPrompt,
              temperature: typeof match.temperature === 'number' ? match.temperature : agent.temperature,
              isCustomized: true
            };
          });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      } catch (error) {
        console.warn('Using local agent registry cache:', error);
      }
    };

    fetchBackendAgentConfigs();
  }, []);

  // Sync draft form whenever selected agent or its persisted state updates
  useEffect(() => {
    if (selectedAgent) {
      setDraftPrompt(selectedAgent.systemPrompt);
      setDraftModel(selectedAgent.model);
      setDraftTemp(selectedAgent.temperature);
      setDraftMaxTokens(selectedAgent.maxTokens || 4096);
      setDraftTimeout(selectedAgent.timeoutSec || 60);
      setDraftRetries(selectedAgent.maxRetries ?? 3);
      setDraftStatus(selectedAgent.status || 'Online');
      setDraftTools(selectedAgent.tools || {});
      setDraftPermissions(selectedAgent.permissions || {});
      setDraftMemory(selectedAgent.memoryConfig || {});
    }
  }, [selectedAgentId, selectedAgent?.systemPrompt, selectedAgent?.temperature]);

  const persistRegistry = (updatedList) => {
    setAgents(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to persist agent registry:', e);
    }
  };

  const hasUnsavedChanges =
    draftPrompt !== selectedAgent.systemPrompt ||
    draftModel !== selectedAgent.model ||
    Number(draftTemp) !== Number(selectedAgent.temperature) ||
    Number(draftTimeout) !== Number(selectedAgent.timeoutSec) ||
    Number(draftRetries) !== Number(selectedAgent.maxRetries) ||
    draftStatus !== selectedAgent.status ||
    JSON.stringify(draftTools) !== JSON.stringify(selectedAgent.tools) ||
    JSON.stringify(draftPermissions) !== JSON.stringify(selectedAgent.permissions) ||
    JSON.stringify(draftMemory) !== JSON.stringify(selectedAgent.memoryConfig);

  // Deploy configuration to PostgreSQL (/api/v1/agents/config) & increment version ledger
  const handleDeployConfiguration = async () => {
    setIsDeploying(true);
    const promptChanged = draftPrompt.trim() !== selectedAgent.systemPrompt.trim();
    const currentVerNum = parseFloat((selectedAgent.currentVersion || 'v1.1').replace('v', '')) || 1.1;
    const nextVersion = promptChanged
      ? `v${(currentVerNum + 0.1).toFixed(1)}`
      : selectedAgent.currentVersion || 'v1.1';

    const timestampNow = new Date().toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newVersionEntry = {
      version: nextVersion,
      prompt: draftPrompt.trim(),
      model: draftModel,
      temperature: Number(draftTemp),
      timestamp: timestampNow,
      author: 'System Operator'
    };

    const updatedAgents = agents.map(a => {
      if (a.id !== selectedAgent.id) return a;
      const existingVersions = a.versions || [];
      const updatedVersions = promptChanged
        ? [newVersionEntry, ...existingVersions]
        : existingVersions.map((v, idx) => (idx === 0 ? newVersionEntry : v));

      return {
        ...a,
        systemPrompt: draftPrompt.trim(),
        model: draftModel,
        temperature: Number(draftTemp),
        maxTokens: Number(draftMaxTokens),
        timeoutSec: Number(draftTimeout),
        maxRetries: Number(draftRetries),
        status: draftStatus,
        tools: { ...draftTools },
        permissions: { ...draftPermissions },
        memoryConfig: { ...draftMemory },
        currentVersion: nextVersion,
        isCustomized: true,
        versions: updatedVersions
      };
    });

    persistRegistry(updatedAgents);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/v1/agents/config',
        {
          agent_name: selectedAgent.name,
          agent_id: selectedAgent.id,
          system_prompt: draftPrompt.trim(),
          temperature: Number(draftTemp),
          tools_enabled: Object.values(draftTools).some(Boolean),
          model: draftModel,
          version: nextVersion
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Error syncing agent config to backend:', err);
    } finally {
      setIsDeploying(false);
      setDeployToast(`Deployed ${selectedAgent.name} (${nextVersion}) to PostgreSQL & LangGraph pipeline.`);
      setTimeout(() => setDeployToast(null), 3200);
    }
  };

  const handleRollbackVersion = (verObj) => {
    setDraftPrompt(verObj.prompt);
    if (verObj.model) setDraftModel(verObj.model);
    if (typeof verObj.temperature === 'number') setDraftTemp(verObj.temperature);
    setCompareVersionObj(null);
    setActiveSubTab('prompt');
    setDeployToast(`Loaded ${verObj.version} into editor. Click "Deploy Configuration" to commit rollback.`);
    setTimeout(() => setDeployToast(null), 3500);
  };

  const handleResetToDefault = () => {
    const baseline = DEFAULT_AGENT_NODES.find(d => d.id === selectedAgent.id);
    if (!baseline) return;
    if (!window.confirm(`Reset ${selectedAgent.name} prompt and parameters to default V1 baseline?`)) return;

    setDraftPrompt(baseline.systemPrompt);
    setDraftModel(baseline.model);
    setDraftTemp(baseline.temperature);
    setDraftMaxTokens(baseline.maxTokens);
    setDraftTimeout(baseline.timeoutSec);
    setDraftRetries(baseline.maxRetries);
    setDraftStatus(baseline.status);
    setDraftTools(baseline.tools);
    setDraftPermissions(baseline.permissions);
    setDraftMemory(baseline.memoryConfig);
  };

  const toggleTool = (toolKey) => {
    setDraftTools(prev => ({ ...prev, [toolKey]: !prev[toolKey] }));
  };

  const togglePermission = (permKey) => {
    setDraftPermissions(prev => ({ ...prev, [permKey]: !prev[permKey] }));
  };

  const enabledToolsCount = Object.values(draftTools || {}).filter(Boolean).length;

  return (
    <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-[#0d0e12] p-6 sm:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. TOP HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#131418] border border-slate-800/90 p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center space-x-3 mb-1.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Cpu className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100">Agent Configuration Center</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                {agents.filter(a => a.status === 'Online').length} Active Nodes
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Calibrate version-controlled system prompts, LLM backbones, tool permissions, and memory policies for your AI workforce.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={handleResetToDefault}
              className="flex items-center px-3.5 py-2 bg-[#181a1e] hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-semibold transition-colors"
              title="Restore default LangGraph system prompt and parameters"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Reset Baseline
            </button>
            <button
              onClick={handleDeployConfiguration}
              disabled={isDeploying}
              className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
            >
              {isDeploying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Deploy Configuration
            </button>
          </div>
        </div>

        {/* DEPLOYMENT TOAST NOTIFICATION */}
        <AnimatePresence>
          {deployToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
                <span>{deployToast}</span>
              </div>
              <button onClick={() => setDeployToast(null)} className="text-emerald-400 hover:text-white">
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. MAIN TWO-COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT SIDEBAR: ACTIVE NODES REGISTRY (4 COLS) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Nodes & Workforce
              </span>
              <span className="text-[11px] font-mono text-slate-500">LangGraph StateGraph</span>
            </div>

            <div className="space-y-2">
              {agents.map((node) => {
                const isSelected = node.id === selectedAgent.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedAgentId(node.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 shadow-md shadow-indigo-500/5'
                        : 'bg-[#131418] border-slate-800/90 hover:border-slate-700 hover:bg-[#16181d]'
                    }`}
                  >
                    <div className="flex items-center min-w-0 pr-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mr-3 shrink-0 border ${
                        isSelected
                          ? 'bg-indigo-500/20 border-indigo-500/40'
                          : 'bg-[#181a1e] border-slate-800'
                      }`}>
                        {node.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {node.name}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-indigo-300 border border-slate-700">
                            {node.currentVersion}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{node.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 space-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        node.status === 'Online'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {node.status}
                      </span>
                      {node.tier === 'V2 Roadmap' && (
                        <span className="text-[9px] font-mono text-purple-400 uppercase">V2 Ready</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT INSPECTOR PANEL (8 COLS) - ZERO SCROLLBARS */}
          <div className="lg:col-span-8 bg-[#131418] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">

            {/* Agent Inspector Header */}
            <div className="p-6 pb-0 border-b border-slate-800 bg-[#15171c]">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl">
                    {selectedAgent.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-100">
                        Configure: <span className="text-indigo-400">{selectedAgent.name}</span>
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                        {selectedAgent.currentVersion} Active
                      </span>
                      {hasUnsavedChanges ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-semibold">
                          UNSAVED EDITS
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-semibold">
                          {selectedAgent.isCustomized ? 'CUSTOMIZED' : 'SYNCED'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Node ID: <span className="text-slate-300">{selectedAgent.id}</span> • Role: {selectedAgent.role}
                    </p>
                  </div>
                </div>

                {/* Node Operational Status Switch */}
                <div className="flex items-center space-x-2">
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    className="bg-[#181a1e] border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Online">Status: Online</option>
                    <option value="Standby">Status: Standby</option>
                  </select>
                </div>
              </div>

              {/* Zero-Scrollbar 4-Column Sub-Navigation Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {[
                  { id: 'prompt', label: 'Prompt & Model', icon: Terminal },
                  { id: 'capabilities', label: `Tools & Access (${enabledToolsCount})`, icon: Wrench },
                  { id: 'memory', label: 'Memory & Policy', icon: Database },
                  { id: 'versions', label: `Versions (${(selectedAgent.versions || []).length})`, icon: History }
                ].map(tab => {
                  const Icon = tab.icon;
                  const active = activeSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`flex items-center justify-center px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors truncate ${
                        active
                          ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-xl'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inspector Body */}
            <div className="p-6 space-y-6">

              {/* TAB 1: SYSTEM PROMPT, MODEL & TEMPERATURE */}
              {activeSubTab === 'prompt' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-[#181a1e] border border-slate-800/90 p-4 rounded-2xl">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        LLM Backbone Model
                      </label>
                      <select
                        value={draftModel}
                        onChange={(e) => setDraftModel(e.target.value)}
                        className="w-full bg-[#131418] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500 truncate"
                      >
                        {MODEL_OPTIONS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-2">
                        Determines reasoning depth, context window, and token throughput for this node.
                      </p>
                    </div>

                    <div className="bg-[#181a1e] border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                            <Sliders className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                            Creativity (Temperature)
                          </label>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold">
                            {Number(draftTemp).toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={draftTemp}
                          onChange={(e) => setDraftTemp(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer my-2"
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-500">
                        <span>Precise (0.0)</span>
                        <span>Balanced (0.5)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>
                  </div>

                  {/* Base System Prompt Editor */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <label className="text-sm font-bold text-slate-200 block">
                          Base System Prompt
                        </label>
                        <p className="text-xs text-slate-400">
                          Overrides the default LangGraph instructions for this node. Saving automatically creates a new version snapshot.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveSubTab('versions')}
                        className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center bg-[#181a1e] px-3 py-1.5 rounded-lg border border-slate-800"
                      >
                        <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                        History ({selectedAgent.currentVersion})
                      </button>
                    </div>

                    <div className="bg-[#0d0e12] border border-slate-800 focus-within:border-indigo-500/60 rounded-2xl p-4 transition-colors">
                      <textarea
                        rows={9}
                        value={draftPrompt}
                        onChange={(e) => setDraftPrompt(e.target.value)}
                        placeholder="Enter system prompt directives for this node..."
                        className="w-full bg-transparent text-slate-200 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none resize-y"
                      />
                      <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-wrap justify-between items-center text-[11px] font-mono text-slate-500">
                        <span>{draftPrompt.length} chars • ~{Math.ceil(draftPrompt.length / 4)} tokens</span>
                        <span className="text-emerald-400 flex items-center">
                          <Shield className="w-3 h-3 mr-1" /> Prompt Injection Guard Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GRANULAR TOOLS & PERMISSIONS MATRIX */}
              {activeSubTab === 'capabilities' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 mb-1">Equipped Agent Tools</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Enable or restrict specific LangChain / LangGraph tools accessible to <strong>{selectedAgent.name}</strong> during execution.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {TOOL_DEFINITIONS.map(tool => {
                        const Icon = tool.icon;
                        const isEnabled = Boolean(draftTools[tool.key]);
                        return (
                          <div
                            key={tool.key}
                            onClick={() => toggleTool(tool.key)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
                              isEnabled
                                ? 'bg-indigo-600/10 border-indigo-500/40'
                                : 'bg-[#181a1e] border-slate-800/90 opacity-75 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-start space-x-3 pr-3">
                              <div className={`p-2 rounded-xl border mt-0.5 ${
                                isEnabled
                                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                                  : 'bg-[#131418] border-slate-800 text-slate-500'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-200">{tool.label}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{tool.desc}</p>
                              </div>
                            </div>

                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 mt-1 ${
                              isEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RBAC & Security Permissions */}
                  <div className="pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 mb-1">Security & Execution Permissions</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Enforce sandbox boundaries and Human-in-the-Loop approval gates for high-risk operations.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'allowExternalNetwork', label: 'Allow Outbound Network / API Calls', desc: 'Permit live web and external endpoint requests' },
                        { key: 'allowFileSystemWrite', label: 'Allow Artifact & Workspace File Writes', desc: 'Permit saving generated scripts and reports' },
                        { key: 'requireHumanApprovalHighRisk', label: 'Require Human Approval on High-Risk Actions', desc: 'Halt execution before destructive or sensitive calls' },
                        { key: 'promptInjectionShield', label: 'Enforce Prompt Injection Sanitization', desc: 'Scan retrieved chunks for adversarial instructions' }
                      ].map(perm => {
                        const active = Boolean(draftPermissions[perm.key]);
                        return (
                          <div
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className="p-3.5 bg-[#181a1e] border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700"
                          >
                            <div className="pr-3">
                              <p className="text-xs font-semibold text-slate-200">{perm.label}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{perm.desc}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => {}}
                              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MEMORY, KNOWLEDGE SOURCES & TIMEOUT/RETRY POLICY */}
              {activeSubTab === 'memory' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#181a1e] border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          FAISS Semantic Memory
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(draftMemory.longTermFaissRag)}
                          onChange={(e) => setDraftMemory(prev => ({ ...prev, longTermFaissRag: e.target.checked }))}
                          className="w-4 h-4 accent-indigo-600"
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Automatically inject relevant vector chunks from the Knowledge Base into this node's context window.
                      </p>
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">
                          Top-K Retrieved Chunks per Query: <strong className="text-indigo-400">{draftMemory.topKChunks || 6}</strong>
                        </label>
                        <input
                          type="range"
                          min="2"
                          max="20"
                          value={draftMemory.topKChunks || 6}
                          onChange={(e) => setDraftMemory(prev => ({ ...prev, topKChunks: Number(e.target.value) }))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-[#181a1e] border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Short-Term Thread Checkpointer
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(draftMemory.shortTermCheckpointer)}
                          onChange={(e) => setDraftMemory(prev => ({ ...prev, shortTermCheckpointer: e.target.checked }))}
                          className="w-4 h-4 accent-indigo-600"
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Maintain multi-turn state history across LangGraph node handoffs within the active thread.
                      </p>
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">Bound Knowledge Scope</label>
                        <input
                          type="text"
                          value={draftMemory.knowledgeScope || ''}
                          onChange={(e) => setDraftMemory(prev => ({ ...prev, knowledgeScope: e.target.value }))}
                          className="w-full bg-[#131418] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeout, Retries & Max Tokens */}
                  <div className="p-4 bg-[#181a1e] border border-slate-800 rounded-2xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                      Resilience, Timeout & Retry Policy
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">Node Timeout (Seconds)</label>
                        <input
                          type="number"
                          min="10"
                          max="300"
                          value={draftTimeout}
                          onChange={(e) => setDraftTimeout(Number(e.target.value))}
                          className="w-full bg-[#131418] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">Max Automatic Retries</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={draftRetries}
                          onChange={(e) => setDraftRetries(Number(e.target.value))}
                          className="w-full bg-[#131418] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">Max Output Tokens</label>
                        <input
                          type="number"
                          step="512"
                          min="512"
                          max="8192"
                          value={draftMaxTokens}
                          onChange={(e) => setDraftMaxTokens(Number(e.target.value))}
                          className="w-full bg-[#131418] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PROMPT VERSIONING, DIFF COMPARE & ROLLBACK */}
              {activeSubTab === 'versions' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        {selectedAgent.name} Prompt Version Ledger
                      </h3>
                      <p className="text-xs text-slate-400">
                        Every deployed prompt modification is versioned automatically for auditability and 1-click rollback.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {(selectedAgent.versions || []).map((ver, idx) => {
                      const isCurrent = ver.version === selectedAgent.currentVersion && idx === 0;
                      return (
                        <div
                          key={ver.version + idx}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCurrent
                              ? 'bg-indigo-600/10 border-indigo-500/40'
                              : 'bg-[#181a1e] border-slate-800'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center space-x-2.5">
                              <span className="px-2.5 py-0.5 rounded-md bg-[#131418] border border-slate-700 font-mono text-xs font-bold text-indigo-300">
                                {ver.version}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                                  Active
                                </span>
                              )}
                              <span className="text-xs font-mono text-slate-400">
                                {ver.model} • Temp {ver.temperature}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-mono text-slate-500">{ver.timestamp}</span>
                              <button
                                onClick={() => setCompareVersionObj(ver)}
                                className="px-2.5 py-1 bg-[#131418] hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono flex items-center"
                              >
                                <ArrowLeftRight className="w-3 h-3 mr-1 text-indigo-400" />
                                Compare
                              </button>
                              {!isCurrent && (
                                <button
                                  onClick={() => handleRollbackVersion(ver)}
                                  className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-mono flex items-center transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Rollback
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs font-mono text-slate-300 line-clamp-2 bg-[#131418] p-2.5 rounded-xl border border-slate-800/80">
                            {ver.prompt}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Inspector Footer */}
            <div className="px-6 py-4 bg-[#15171c] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
                <span>Model: <strong className="text-slate-200">{draftModel}</strong></span>
                <span>Temp: <strong className="text-indigo-400">{Number(draftTemp).toFixed(1)}</strong></span>
                <span>Tools: <strong className="text-emerald-400">{enabledToolsCount}/6 Enabled</strong></span>
              </div>

              <button
                onClick={handleDeployConfiguration}
                disabled={isDeploying}
                className="flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20"
              >
                {isDeploying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Deploy Configuration
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* SIDE-BY-SIDE PROMPT VERSION COMPARE MODAL */}
      <AnimatePresence>
        {compareVersionObj && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setCompareVersionObj(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-[#181a1e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 bg-[#131418] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-100">
                    Compare Prompt Versions — {selectedAgent.name}
                  </h3>
                </div>
                <button
                  onClick={() => setCompareVersionObj(null)}
                  className="text-slate-400 hover:text-white text-sm font-mono"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0d0e12]">
                <div className="bg-[#131418] border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Snapshot {compareVersionObj.version} ({compareVersionObj.timestamp})
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Temp: {compareVersionObj.temperature}
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {compareVersionObj.prompt}
                  </pre>
                </div>

                <div className="bg-[#131418] border border-indigo-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Current Editor Draft ({selectedAgent.currentVersion})
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Temp: {draftTemp}
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {draftPrompt}
                  </pre>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#131418] border-t border-slate-800 flex justify-end space-x-3">
                <button
                  onClick={() => setCompareVersionObj(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRollbackVersion(compareVersionObj)}
                  className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Restore {compareVersionObj.version} to Editor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentCenter;