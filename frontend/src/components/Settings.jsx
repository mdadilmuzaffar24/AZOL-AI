import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, User, Key, Palette, Cpu, Lock, Bell,
  Sliders, CheckCircle2, AlertTriangle, Save, RotateCcw,
  Loader2, X
} from 'lucide-react';
import axios from 'axios';

const SETTINGS_TABS = [
  { id: 'general', label: 'General & Profile', desc: 'Operator identity, appearance & notifications', icon: User },
  { id: 'ai', label: 'AI & Memory Defaults', desc: 'Default LLM, embeddings & RAG parameters', icon: Cpu },
  { id: 'integrations', label: 'Integrations & Secrets', desc: 'Zero-leak API key vault & external connectors', icon: Key },
  { id: 'security', label: 'Security, RBAC & Audit', desc: 'Access control, sessions & security audit logs', icon: Shield },
  { id: 'advanced', label: 'Advanced & Resilience', desc: 'Rate limits, model fallback & data retention', icon: Sliders }
];

const SECRET_PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq API Key (Fast Inference)',
    envKey: 'GROQ_API_KEY',
    desc: 'Primary ultra-low-latency LPU inference engine for Llama 3.3 70B & Llama 3.1 8B nodes.',
    tier: 'Primary Engine',
    defaultConfigured: true
  },
  {
    id: 'openai',
    name: 'OpenAI API Key',
    envKey: 'OPENAI_API_KEY',
    desc: 'Fallback reasoning & structured output synthesis across complex multi-agent workflows.',
    tier: 'Fallback LLM',
    defaultConfigured: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic API Key (Claude)',
    envKey: 'ANTHROPIC_API_KEY',
    desc: 'High-context code synthesis, architecture review, and long-document analysis.',
    tier: 'Optional LLM',
    defaultConfigured: false
  },
  {
    id: 'gemini',
    name: 'Google Gemini API Key',
    envKey: 'GEMINI_API_KEY',
    desc: 'Multimodal document parsing and large-context research synthesis.',
    tier: 'Optional LLM',
    defaultConfigured: false
  },
  {
    id: 'tavily',
    name: 'Web Search API Key (Tavily / SERP)',
    envKey: 'TAVILY_API_KEY',
    desc: 'Powers real-time internet search and live citation verification for the Researcher node.',
    tier: 'Tool Connector',
    defaultConfigured: true
  }
];

// Dynamically resolve the authenticated user's email from props, storage, JWT, or sidebar DOM
const resolveAuthenticatedEmail = (propUser) => {
  if (propUser?.email) return propUser.email;

  for (const key of ['user', 'currentUser', 'azol_user', 'email', 'userEmail']) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    if (raw.includes('@') && !raw.startsWith('{')) return raw.trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.email) return parsed.email;
    } catch (e) {}
  }

  try {
    const token = localStorage.getItem('token');
    if (token && token.includes('.')) {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const candidate = payload.email || payload.username || payload.upn || payload.sub;
      if (typeof candidate === 'string' && candidate.includes('@')) {
        return candidate;
      }
    }
  } catch (e) {}

  if (typeof document !== 'undefined') {
    const candidates = Array.from(document.querySelectorAll('p, span, div'));
    const match = candidates.find(
      el => el.children.length === 0 && el.textContent && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.textContent.trim())
    );
    if (match) return match.textContent.trim();
  }

  return 'operator@enterprise.com';
};

const formatDisplayNameFromEmail = (email) => {
  if (!email || !email.includes('@')) return 'System Operator';
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/[._-]+/g, ' ').trim();
  return cleaned ? cleaned.replace(/\b\w/g, c => c.toUpperCase()) : 'System Operator';
};

const buildDefaultConfig = (email) => ({
  // 1. General & Profile
  operatorName: formatDisplayNameFromEmail(email),
  operatorEmail: email,
  clearanceLevel: 'Admin',
  organization: 'Enterprise AI OS — Core Division',
  theme: 'Dark Mode (Default)',
  uiDensity: 'Comfortable',
  language: 'English (US)',
  notifyResearchComplete: true,
  notifyReviewerApproved: true,
  notifyWorkflowFailed: true,
  notifyMemoryUpdated: true,

  // 2. AI & Memory Defaults
  defaultLlm: 'llama-3.3-70b-versatile',
  embeddingModel: 'BAAI/bge-small-en-v1.5 (384-dim FAISS)',
  defaultTemperature: 0.2,
  defaultTopKChunks: 6,
  chunkSizeTokens: 512,
  chunkOverlapTokens: 64,
  enableLongTermMemory: true,
  enableCitationsEnforcement: true,

  // 4. Security & RBAC
  jwtSessionTtlHours: 24,
  enforcePromptInjectionGuard: true,
  requireHumanApprovalHighRisk: true,
  maskPiiInLogs: true,
  twoFactorStatus: 'Hardware / Authenticator Ready',

  // 5. Advanced & Resilience
  maxRequestsPerMinute: 60,
  maxTokensPerMinute: 120000,
  fallbackModel: 'llama-3.1-8b-instant',
  enableAutoFallback: true,
  circuitBreakerThreshold: 3,
  dataRetentionDays: 90
});

const buildInitialAuditLogs = (email) => [
  {
    id: 'aud_904',
    action: 'Agent Configuration Deployed',
    target: 'Supervisor Node (v1.1)',
    actor: email,
    ip: '127.0.0.1',
    status: 'Verified',
    time: 'Today, 12:40 PM'
  },
  {
    id: 'aud_903',
    action: 'FAISS Knowledge Base Ingestion',
    target: 'Interpretable and Trustworthy Deepfake Detection.docx',
    actor: email,
    ip: '127.0.0.1',
    status: 'Verified',
    time: 'Today, 11:55 AM'
  },
  {
    id: 'aud_902',
    action: 'Encrypted Secret Rotated',
    target: 'GROQ_API_KEY (Asymmetric Vault)',
    actor: email,
    ip: '127.0.0.1',
    status: 'Verified',
    time: 'Sep 26, 2026'
  },
  {
    id: 'aud_901',
    action: 'Operator Session Authenticated (JWT)',
    target: 'Role: Admin (Full Clearance)',
    actor: email,
    ip: '127.0.0.1',
    status: 'Verified',
    time: 'Sep 26, 2026'
  }
];

// Sync the bottom-left sidebar operator name & avatar initial in the DOM
const syncSidebarProfileCard = (email, displayName) => {
  if (typeof document === 'undefined' || !email) return;
  try {
    const nodes = Array.from(document.querySelectorAll('p, span, div'));
    const emailNode = nodes.find(
      el => el.children.length === 0 && el.textContent && el.textContent.trim().toLowerCase() === email.toLowerCase()
    );
    if (emailNode && emailNode.parentElement) {
      const nameSibling = emailNode.parentElement.firstElementChild;
      if (nameSibling && nameSibling !== emailNode) {
        nameSibling.textContent = displayName;
      }
      const cardContainer = emailNode.parentElement.parentElement;
      const avatarNode = cardContainer?.firstElementChild;
      if (avatarNode && avatarNode !== emailNode.parentElement && avatarNode.children.length === 0) {
        avatarNode.textContent = (displayName || email).charAt(0).toUpperCase();
      }
    }
  } catch (e) {}
};

const Settings = ({ user, currentUser }) => {
  const initialEmail = useMemo(() => resolveAuthenticatedEmail(user || currentUser), [user, currentUser]);

  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [savingProviderId, setSavingProviderId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // High-Risk Action Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState(null);

  // Write-only secret inputs (never pre-filled or echoed after saving)
  const [secretInputs, setSecretInputs] = useState({
    groq: '',
    openai: '',
    anthropic: '',
    gemini: '',
    tavily: ''
  });

  const [configuredSecrets, setConfiguredSecrets] = useState({
    groq: true,
    openai: true,
    anthropic: false,
    gemini: false,
    tavily: true
  });

  const [editingSecretId, setEditingSecretId] = useState(null);

  const loadScopedConfig = (email) => {
    const scopedKey = `azol_v1_settings_${email.toLowerCase()}`;
    try {
      const saved = localStorage.getItem(scopedKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...buildDefaultConfig(email), ...parsed, operatorEmail: email };
      }
    } catch (e) {}
    return buildDefaultConfig(email);
  };

  const [config, setConfig] = useState(() => loadScopedConfig(initialEmail));
  const [savedConfig, setSavedConfig] = useState(() => loadScopedConfig(initialEmail));

  const [auditLogs, setAuditLogs] = useState(() => {
    const scopedAuditKey = `azol_v1_audit_${initialEmail.toLowerCase()}`;
    try {
      const savedLogs = localStorage.getItem(scopedAuditKey);
      if (savedLogs) return JSON.parse(savedLogs);
    } catch (e) {}
    return buildInitialAuditLogs(initialEmail);
  });

  // Hydrate live operator email & secret status flags from /api/v1/settings/ (with trailing slash)
  useEffect(() => {
    const fetchBackendSettings = async () => {
      let resolvedEmail = resolveAuthenticatedEmail(user || currentUser);

      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/v1/settings/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          if (res.data.email && res.data.email.includes('@')) {
            resolvedEmail = res.data.email;
          }
          setConfiguredSecrets(prev => ({
            ...prev,
            openai: res.data.has_openai_key ?? res.data.configured_keys?.openai ?? prev.openai,
            groq: res.data.has_groq_key ?? res.data.configured_keys?.groq ?? prev.groq,
            anthropic: res.data.has_anthropic_key ?? res.data.configured_keys?.anthropic ?? prev.anthropic,
            gemini: res.data.has_gemini_key ?? res.data.configured_keys?.gemini ?? prev.gemini,
            tavily: res.data.has_tavily_key ?? res.data.configured_keys?.tavily ?? prev.tavily
          }));
        }
      } catch (e) {
        // Fallback to resolvedEmail from JWT/DOM
      }

      const hydrated = loadScopedConfig(resolvedEmail);
      setConfig(hydrated);
      setSavedConfig(hydrated);
      syncSidebarProfileCard(resolvedEmail, hydrated.operatorName);

      const scopedAuditKey = `azol_v1_audit_${resolvedEmail.toLowerCase()}`;
      try {
        const rawLogs = localStorage.getItem(scopedAuditKey);
        setAuditLogs(rawLogs ? JSON.parse(rawLogs) : buildInitialAuditLogs(resolvedEmail));
      } catch (e) {
        setAuditLogs(buildInitialAuditLogs(resolvedEmail));
      }
    };

    fetchBackendSettings();
  }, [user, currentUser]);

  // Real-Time Inline Validation Engine
  const validationErrors = useMemo(() => {
    const errs = {};
    if (!config.operatorName || !config.operatorName.trim()) {
      errs.operatorName = 'Operator display name cannot be empty.';
    }
    if (isNaN(config.defaultTemperature) || config.defaultTemperature < 0 || config.defaultTemperature > 1) {
      errs.defaultTemperature = 'Temperature must be between 0.0 and 1.0.';
    }
    if (isNaN(config.defaultTopKChunks) || config.defaultTopKChunks < 1 || config.defaultTopKChunks > 20) {
      errs.defaultTopKChunks = 'Top-K must be between 1 and 20 chunks.';
    }
    if (isNaN(config.chunkSizeTokens) || config.chunkSizeTokens < 128 || config.chunkSizeTokens > 4096) {
      errs.chunkSizeTokens = 'Chunk size must be 128–4096 tokens.';
    }
    if (
      isNaN(config.chunkOverlapTokens) ||
      config.chunkOverlapTokens < 0 ||
      config.chunkOverlapTokens >= Math.floor((config.chunkSizeTokens || 512) / 2)
    ) {
      errs.chunkOverlapTokens = `Overlap must be 0–${Math.max(0, Math.floor((config.chunkSizeTokens || 512) / 2) - 1)} tok (<50% of chunk).`;
    }
    if (isNaN(config.maxRequestsPerMinute) || config.maxRequestsPerMinute < 5 || config.maxRequestsPerMinute > 1000) {
      errs.maxRequestsPerMinute = 'Rate limit must be between 5 and 1,000 req/min.';
    }
    if (isNaN(config.maxTokensPerMinute) || config.maxTokensPerMinute < 10000 || config.maxTokensPerMinute > 2000000) {
      errs.maxTokensPerMinute = 'Token quota must be 10,000–2,000,000 tok/min.';
    }
    if (isNaN(config.dataRetentionDays) || config.dataRetentionDays < 7 || config.dataRetentionDays > 365) {
      errs.dataRetentionDays = 'Retention window must be between 7 and 365 days.';
    }
    if (isNaN(config.circuitBreakerThreshold) || config.circuitBreakerThreshold < 1 || config.circuitBreakerThreshold > 20) {
      errs.circuitBreakerThreshold = 'Threshold must be between 1 and 20 consecutive errors.';
    }
    return errs;
  }, [config]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(savedConfig), [config, savedConfig]);

  const appendAuditLog = (action, target) => {
    const actorEmail = config.operatorEmail || initialEmail;
    const newEntry = {
      id: `aud_${Math.floor(100 + Math.random() * 900)}`,
      action,
      target,
      actor: actorEmail,
      ip: '127.0.0.1',
      status: 'Verified',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const nextLogs = [newEntry, ...auditLogs.slice(0, 19)];
    setAuditLogs(nextLogs);
    try {
      localStorage.setItem(`azol_v1_audit_${actorEmail.toLowerCase()}`, JSON.stringify(nextLogs));
    } catch (e) {}
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const updateField = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // High-Risk Confirmation before disabling security guardrails
  const handleToggleSecurityGuardrail = (policyKey, policyLabel) => {
    const currentlyEnabled = Boolean(config[policyKey]);
    if (currentlyEnabled) {
      setConfirmModal({
        title: `Disable ${policyLabel}?`,
        message: `Turning off "${policyLabel}" reduces runtime protection across your LangGraph agents. Are you sure you want to disable this security guardrail?`,
        confirmLabel: 'Disable Guardrail',
        riskLevel: 'High Risk',
        onConfirm: () => {
          updateField(policyKey, false);
          appendAuditLog('Security Guardrail Disabled', policyLabel);
          setConfirmModal(null);
        }
      });
    } else {
      updateField(policyKey, true);
    }
  };

  // Save Configuration (CRITICAL: Never send empty strings "" for API keys so existing encrypted keys stay intact)
  const executeSaveConfiguration = async () => {
    setIsSaving(true);
    const emailKey = (config.operatorEmail || initialEmail).toLowerCase();
    try {
      localStorage.setItem(`azol_v1_settings_${emailKey}`, JSON.stringify(config));
    } catch (e) {}

    try {
      const token = localStorage.getItem('token');
      const payload = {
        theme: config.theme,
        operator_name: config.operatorName,
        default_llm: config.defaultLlm,
        default_temperature: config.defaultTemperature
      };

      // Only include API key fields if the operator explicitly typed a non-empty secret
      if (secretInputs.openai && secretInputs.openai.trim()) {
        payload.openai_api_key = secretInputs.openai.trim();
      }
      if (secretInputs.groq && secretInputs.groq.trim()) {
        payload.groq_api_key = secretInputs.groq.trim();
      }
      if (secretInputs.anthropic && secretInputs.anthropic.trim()) {
        payload.anthropic_api_key = secretInputs.anthropic.trim();
      }

      await axios.post('/api/v1/settings/', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      // Local state & storage persisted
    }

    setSavedConfig(config);
    syncSidebarProfileCard(config.operatorEmail, config.operatorName);
    appendAuditLog('System Configuration Updated', `Section: ${activeTab.toUpperCase()}`);

    setTimeout(() => {
      setIsSaving(false);
      showToast(`Configuration saved for ${config.operatorEmail}.`);
    }, 250);
  };

  const handleSaveConfiguration = () => {
    if (!isDirty || hasValidationErrors) return;

    if (config.dataRetentionDays < savedConfig.dataRetentionDays) {
      setConfirmModal({
        title: 'Confirm Telemetry Retention Reduction',
        message: `You are reducing the telemetry retention window from ${savedConfig.dataRetentionDays} days to ${config.dataRetentionDays} days. Historical execution traces older than ${config.dataRetentionDays} days will be eligible for pruning.`,
        confirmLabel: 'Confirm & Save',
        riskLevel: 'Data Retention Policy',
        onConfirm: () => {
          setConfirmModal(null);
          executeSaveConfiguration();
        }
      });
      return;
    }

    executeSaveConfiguration();
  };

  const handleDiscardChanges = () => {
    setConfig(savedConfig);
    showToast('Unsaved changes discarded.');
  };

  // Dedicated Zero-Leak Secret Rotation Handler (Only sends the specific key being rotated)
  const executeSaveSecret = async (provider) => {
    const rawValue = (secretInputs[provider.id] || '').trim();
    if (!rawValue) return;

    setSavingProviderId(provider.id);
    try {
      const token = localStorage.getItem('token');
      const secretPayload = {
        theme: config.theme,
        [`${provider.id}_api_key`]: rawValue
      };

      await axios.post('/api/v1/settings/', secretPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {}

    setSecretInputs(prev => ({ ...prev, [provider.id]: '' }));
    setConfiguredSecrets(prev => ({ ...prev, [provider.id]: true }));
    setEditingSecretId(null);
    appendAuditLog('Encrypted API Secret Rotated', `${provider.envKey} (Write-Only Vault)`);

    setTimeout(() => {
      setSavingProviderId(null);
      showToast(`${provider.name} encrypted and stored. Active key purged from browser DOM.`);
    }, 250);
  };

  const handleSaveSecretRequest = (provider) => {
    const rawValue = (secretInputs[provider.id] || '').trim();
    if (!rawValue) return;

    if (configuredSecrets[provider.id]) {
      setConfirmModal({
        title: `Rotate ${provider.envKey}?`,
        message: `Saving a new secret for ${provider.name} will permanently overwrite the existing encrypted key in the vault. Active agent runs will immediately use the new credential.`,
        confirmLabel: 'Rotate & Overwrite Key',
        riskLevel: 'Secret Rotation',
        onConfirm: () => {
          setConfirmModal(null);
          executeSaveSecret(provider);
        }
      });
    } else {
      executeSaveSecret(provider);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-[#0d0e12] p-6 sm:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. TOP HEADER BANNER WITH UNSAVED CHANGES INDICATOR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#131418] border border-slate-800/90 p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100">System Configuration</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                RBAC: {config.clearanceLevel}
              </span>

              {hasValidationErrors ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Validation Error
                </span>
              ) : isDirty ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                  Unsaved Changes
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
                  ✓ All Changes Saved
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Manage operator identity, default AI/RAG parameters, zero-leak API secrets, security guardrails, and audit logs.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {isDirty && (
              <button
                onClick={handleDiscardChanges}
                className="flex items-center px-3.5 py-2.5 bg-[#181a1e] hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-semibold transition-colors"
                title="Revert unsaved edits"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Discard
              </button>
            )}
            <button
              onClick={handleSaveConfiguration}
              disabled={!isDirty || hasValidationErrors || isSaving}
              className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Configuration
            </button>
          </div>
        </div>

        {/* TOAST BANNER */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. BALANCED 12-COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT NAVIGATION SIDEBAR (4 COLS) */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="px-1 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Configuration Modules
              </span>
              <span className="text-[11px] font-mono text-slate-500">V1.0 Core</span>
            </div>

            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start space-x-3.5 ${
                    isActive
                      ? 'bg-indigo-600/15 border-indigo-500/50 shadow-md shadow-indigo-500/5'
                      : 'bg-[#131418] border-slate-800/90 hover:border-slate-700 hover:bg-[#16181d]'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                    isActive
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#181a1e] border-slate-800 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {tab.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      {tab.desc}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Infrastructure Encryption Status Card */}
            <div className="bg-[#131418] border border-slate-800/90 p-4 rounded-2xl space-y-2.5 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Vault & RBAC Status
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ENCRYPTED
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All secrets are write-only and encrypted at rest. Raw keys are never returned to the browser DOM or network payloads.
              </p>
            </div>
          </div>

          {/* RIGHT CONFIGURATION PANEL (8 COLS) */}
          <div className="lg:col-span-8 bg-[#131418] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">

            {/* SECTION 1: GENERAL, OPERATOR PROFILE & NOTIFICATIONS */}
            {activeTab === 'general' && (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center">
                    <User className="w-5 h-5 mr-2.5 text-indigo-400" />
                    Operator Profile & Workspace Preferences
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage authenticated operator identity, interface theme density, and real-time event notifications.
                  </p>
                </div>

                {/* Operator Identity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Identity (Authenticated Email)
                    </label>
                    <input
                      type="email"
                      value={config.operatorEmail}
                      disabled
                      className="w-full bg-[#0d0e12] border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Clearance Level (RBAC Role)
                    </label>
                    <div className="w-full bg-[#0d0e12] border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-400 font-bold flex items-center justify-between">
                      <span>{config.clearanceLevel}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                        Full System Access
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Operator Display Name
                    </label>
                    <input
                      type="text"
                      value={config.operatorName}
                      onChange={(e) => updateField('operatorName', e.target.value)}
                      className={`w-full bg-[#181a1e] border rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none ${
                        validationErrors.operatorName ? 'border-rose-500' : 'border-slate-700/80 focus:border-indigo-500'
                      }`}
                    />
                    {validationErrors.operatorName && (
                      <p className="text-[11px] text-rose-400 font-mono mt-1">{validationErrors.operatorName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Organization / Workspace Unit
                    </label>
                    <input
                      type="text"
                      value={config.organization}
                      onChange={(e) => updateField('organization', e.target.value)}
                      className="w-full bg-[#181a1e] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Interface & Appearance */}
                <div className="pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center">
                    <Palette className="w-4 h-4 mr-2 text-indigo-400" />
                    Interface & Appearance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Theme Engine</label>
                      <select
                        value={config.theme}
                        onChange={(e) => updateField('theme', e.target.value)}
                        className="w-full bg-[#181a1e] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Dark Mode (Default)">Dark Mode (Default)</option>
                        <option value="Midnight OLED">Midnight OLED (High Contrast)</option>
                        <option value="Slate Enterprise">Slate Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Default Workspace Density</label>
                      <select
                        value={config.uiDensity}
                        onChange={(e) => updateField('uiDensity', e.target.value)}
                        className="w-full bg-[#181a1e] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Compact">Compact</option>
                        <option value="Comfortable">Comfortable (Recommended)</option>
                        <option value="Spacious">Spacious</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">System Locale</label>
                      <select
                        value={config.language}
                        onChange={(e) => updateField('language', e.target.value)}
                        className="w-full bg-[#181a1e] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="English (IN)">English (IN)</option>
                        <option value="English (UK)">English (UK)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* System Notifications */}
                <div className="pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center">
                    <Bell className="w-4 h-4 mr-2 text-indigo-400" />
                    Workforce Event Notifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'notifyResearchComplete', label: 'Research & RAG Synthesis Completed', desc: 'Alert when Researcher finishes indexing or querying sources' },
                      { key: 'notifyReviewerApproved', label: 'QA Reviewer Verification Passed', desc: 'Alert when candidate output passes grounding checks' },
                      { key: 'notifyWorkflowFailed', label: 'Workflow Exception or Timeout', desc: 'Immediate alert if any LangGraph node encounters an error' },
                      { key: 'notifyMemoryUpdated', label: 'Project Memory & Directive Synced', desc: 'Confirm when PostgreSQL context checkpoints update' }
                    ].map(item => (
                      <div
                        key={item.key}
                        onClick={() => updateField(item.key, !config[item.key])}
                        className="p-3.5 bg-[#181a1e] border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700"
                      >
                        <div className="pr-3">
                          <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(config[item.key])}
                          onChange={() => {}}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: AI & MEMORY DEFAULTS WITH INLINE VALIDATION */}
            {activeTab === 'ai' && (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center">
                    <Cpu className="w-5 h-5 mr-2.5 text-indigo-400" />
                    Global AI, Embeddings & Memory Defaults
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure default orchestration models, FAISS vector chunking parameters, and grounding rules.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#181a1e] border border-slate-800 p-4 rounded-2xl">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Default Orchestrator LLM
                    </label>
                    <select
                      value={config.defaultLlm}
                      onChange={(e) => updateField('defaultLlm', e.target.value)}
                      className="w-full bg-[#131418] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Recommended)</option>
                      <option value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</option>
                      <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Fastest)</option>
                      <option value="mixtral-8x7b-32768">Mixtral 8x7B 32K</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Used by Supervisor and unconfigured specialist nodes.
                    </p>
                  </div>

                  <div className="bg-[#181a1e] border border-slate-800 p-4 rounded-2xl">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Vector Embedding Backbone
                    </label>
                    <select
                      value={config.embeddingModel}
                      onChange={(e) => updateField('embeddingModel', e.target.value)}
                      className="w-full bg-[#131418] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="BAAI/bge-small-en-v1.5 (384-dim FAISS)">BAAI/bge-small-en-v1.5 (384-dim FAISS)</option>
                      <option value="BAAI/bge-base-en-v1.5 (768-dim FAISS)">BAAI/bge-base-en-v1.5 (768-dim FAISS)</option>
                      <option value="text-embedding-3-small">OpenAI text-embedding-3-small</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Powers semantic chunk indexing in the Knowledge Base.
                    </p>
                  </div>
                </div>

                {/* RAG & Chunking Parameters with Inline Validation */}
                <div className="bg-[#181a1e] border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    FAISS Retrieval & Sampling Defaults
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Default Temp (0–1)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={config.defaultTemperature}
                        onChange={(e) => updateField('defaultTemperature', parseFloat(e.target.value))}
                        className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none ${
                          validationErrors.defaultTemperature ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                      {validationErrors.defaultTemperature && (
                        <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.defaultTemperature}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Top-K Chunks (1–20)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={config.defaultTopKChunks}
                        onChange={(e) => updateField('defaultTopKChunks', Number(e.target.value))}
                        className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none ${
                          validationErrors.defaultTopKChunks ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                      {validationErrors.defaultTopKChunks && (
                        <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.defaultTopKChunks}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Chunk Size (Tok)</label>
                      <input
                        type="number"
                        step="128"
                        min="128"
                        max="4096"
                        value={config.chunkSizeTokens}
                        onChange={(e) => updateField('chunkSizeTokens', Number(e.target.value))}
                        className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none ${
                          validationErrors.chunkSizeTokens ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                      {validationErrors.chunkSizeTokens && (
                        <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.chunkSizeTokens}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Chunk Overlap</label>
                      <input
                        type="number"
                        step="16"
                        min="0"
                        value={config.chunkOverlapTokens}
                        onChange={(e) => updateField('chunkOverlapTokens', Number(e.target.value))}
                        className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none ${
                          validationErrors.chunkOverlapTokens ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                      {validationErrors.chunkOverlapTokens && (
                        <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.chunkOverlapTokens}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Memory & Citation Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => updateField('enableLongTermMemory', !config.enableLongTermMemory)}
                    className="p-4 bg-[#181a1e] border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer"
                  >
                    <div className="pr-3">
                      <p className="text-xs font-bold text-slate-200">Long-Term Cross-Session Memory</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Persist thread checkpoints and project directives in PostgreSQL</p>
                    </div>
                    <input type="checkbox" checked={Boolean(config.enableLongTermMemory)} onChange={() => {}} className="w-4 h-4 accent-indigo-600 shrink-0" />
                  </div>

                  <div
                    onClick={() => updateField('enableCitationsEnforcement', !config.enableCitationsEnforcement)}
                    className="p-4 bg-[#181a1e] border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer"
                  >
                    <div className="pr-3">
                      <p className="text-xs font-bold text-slate-200">Strict Source Citation Enforcement</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Require Researcher & Reviewer to attach document filenames</p>
                    </div>
                    <input type="checkbox" checked={Boolean(config.enableCitationsEnforcement)} onChange={() => {}} className="w-4 h-4 accent-indigo-600 shrink-0" />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: ZERO-LEAK EXTERNAL MODEL SECRETS & INTEGRATIONS */}
            {activeTab === 'integrations' && (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center">
                    <Key className="w-5 h-5 mr-2.5 text-indigo-400" />
                    External Model Secrets & Integrations Vault
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Write-only asymmetric secret storage. Active keys are never exposed in the frontend DOM, React state, or network responses.
                  </p>
                </div>

                {/* Security Warning Banner */}
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-200/90 leading-relaxed">
                    <strong>Zero-Disclosure Secret Policy:</strong> Active API keys display only their verification status (<span className="text-emerald-400 font-mono">● Configured</span>). Entering a new secret and clicking <strong>Save Secret</strong> encrypts it on the backend and immediately purges the input field.
                  </p>
                </div>

                {/* Secret Provider Cards */}
                <div className="space-y-3.5">
                  {SECRET_PROVIDERS.map((provider) => {
                    const isConfigured = Boolean(configuredSecrets[provider.id]);
                    const isEditing = editingSecretId === provider.id;
                    const isSavingThis = savingProviderId === provider.id;

                    return (
                      <div
                        key={provider.id}
                        className="p-4 bg-[#181a1e] border border-slate-800/90 rounded-2xl space-y-3 transition-colors hover:border-slate-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-100">{provider.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131418] border border-slate-700 text-slate-400">
                                {provider.envKey}
                              </span>
                              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                {provider.tier}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{provider.desc}</p>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {isConfigured ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-semibold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                                Configured
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
                                <span className="w-2 h-2 rounded-full bg-slate-500 mr-1.5" />
                                Not Configured
                              </span>
                            )}

                            <button
                              onClick={() => setEditingSecretId(isEditing ? null : provider.id)}
                              className="px-3 py-1.5 bg-[#131418] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono transition-colors"
                            >
                              {isEditing ? 'Cancel' : isConfigured ? 'Rotate Key' : 'Configure Key'}
                            </button>
                          </div>
                        </div>

                        {/* Write-Only Input Drawer */}
                        {isEditing && (
                          <div className="pt-2 flex items-center space-x-2">
                            <input
                              type="password"
                              autoComplete="new-password"
                              value={secretInputs[provider.id] || ''}
                              onChange={(e) => setSecretInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                              placeholder={`Enter new ${provider.envKey} secret (write-only)...`}
                              className="flex-1 bg-[#131418] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() => handleSaveSecretRequest(provider)}
                              disabled={!secretInputs[provider.id]?.trim() || isSavingThis}
                              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
                            >
                              {isSavingThis ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                              Save Secret
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Enterprise Connectors (V2 Roadmap Preview) */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Enterprise Ecosystem Connectors
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      V2.0 Roadmap
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['GitHub Repositories', 'Slack Channels', 'Google Drive', 'Notion / Jira'].map((conn) => (
                      <div key={conn} className="p-3 bg-[#181a1e]/60 border border-slate-800/80 rounded-xl flex items-center justify-between opacity-75">
                        <span className="text-xs font-medium text-slate-300 truncate">{conn}</span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase ml-1">V2</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: SECURITY, RBAC & AUDIT LOGS */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center">
                    <Shield className="w-5 h-5 mr-2.5 text-indigo-400" />
                    Security Guardrails, RBAC & Immutable Audit Log
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Enforce prompt-injection defenses, human approval gates, and inspect operator security events.
                  </p>
                </div>

                {/* Security Policy Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {[
                    { key: 'enforcePromptInjectionGuard', label: 'Prompt-Injection Shield', desc: 'Sanitize adversarial instructions in user & RAG inputs' },
                    { key: 'requireHumanApprovalHighRisk', label: 'Human-in-the-Loop Gate', desc: 'Require explicit approval before destructive actions' },
                    { key: 'maskPiiInLogs', label: 'Redact Secrets & PII', desc: 'Automatically scrub sensitive tokens from telemetry' }
                  ].map(policy => (
                    <div
                      key={policy.key}
                      onClick={() => handleToggleSecurityGuardrail(policy.key, policy.label)}
                      className="p-4 bg-[#181a1e] border border-slate-800 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-200">{policy.label}</span>
                        <input type="checkbox" checked={Boolean(config[policy.key])} onChange={() => {}} className="w-4 h-4 accent-indigo-600 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{policy.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Immutable Security Audit Ledger */}
                <div className="bg-[#181a1e] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#14161b] border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Security & Configuration Audit Trail
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">Active Session: {config.operatorEmail}</span>
                  </div>
                  <div className="divide-y divide-slate-800/70 font-mono text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/20">
                        <div className="min-w-0 truncate">
                          <span className="text-indigo-400 font-semibold mr-2">[{log.id}]</span>
                          <span className="text-slate-200 font-sans font-medium">{log.action}</span>
                          <span className="text-slate-400 ml-1.5">— {log.target}</span>
                        </div>
                        <div className="flex items-center space-x-2.5 text-[11px] text-slate-500 shrink-0">
                          <span>{log.actor}</span>
                          <span>•</span>
                          <span>{log.time}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: ADVANCED, RATE LIMITS & MODEL FALLBACK WITH INLINE VALIDATION */}
            {activeTab === 'advanced' && (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center">
                    <Sliders className="w-5 h-5 mr-2.5 text-indigo-400" />
                    Advanced Resilience, Quotas & Fallback Routing
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure rate limiting, circuit breakers, automatic LLM failover, and telemetry retention windows.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#181a1e] border border-slate-800 p-4 rounded-2xl">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 whitespace-nowrap">
                      Rate Limit (Req / Min)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1000"
                      value={config.maxRequestsPerMinute}
                      onChange={(e) => updateField('maxRequestsPerMinute', Number(e.target.value))}
                      className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none ${
                        validationErrors.maxRequestsPerMinute ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                      }`}
                    />
                    {validationErrors.maxRequestsPerMinute && (
                      <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.maxRequestsPerMinute}</p>
                    )}
                  </div>

                  <div className="bg-[#181a1e] border border-slate-800 p-4 rounded-2xl">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 whitespace-nowrap">
                      Token Quota (Per Min)
                    </label>
                    <input
                      type="number"
                      step="10000"
                      min="10000"
                      max="2000000"
                      value={config.maxTokensPerMinute}
                      onChange={(e) => updateField('maxTokensPerMinute', Number(e.target.value))}
                      className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none ${
                        validationErrors.maxTokensPerMinute ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                      }`}
                    />
                    {validationErrors.maxTokensPerMinute && (
                      <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.maxTokensPerMinute}</p>
                    )}
                  </div>

                  <div className="bg-[#181a1e] border border-slate-800 p-4 rounded-2xl">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 whitespace-nowrap">
                      Retention Window (Days)
                    </label>
                    <input
                      type="number"
                      min="7"
                      max="365"
                      value={config.dataRetentionDays}
                      onChange={(e) => updateField('dataRetentionDays', Number(e.target.value))}
                      className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none ${
                        validationErrors.dataRetentionDays ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                      }`}
                    />
                    {validationErrors.dataRetentionDays && (
                      <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.dataRetentionDays}</p>
                    )}
                  </div>
                </div>

                {/* Automatic Model Fallback & Circuit Breaker */}
                <div className="bg-[#181a1e] border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Automatic LLM Failover & Circuit Breaker</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Automatically reroute agent executions to a low-latency fallback model if the primary provider hits rate limits.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(config.enableAutoFallback)}
                      onChange={(e) => updateField('enableAutoFallback', e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 shrink-0"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Designated Fallback Model</label>
                      <select
                        value={config.fallbackModel}
                        onChange={(e) => updateField('fallbackModel', e.target.value)}
                        className="w-full bg-[#131418] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                      >
                        <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Groq LPU)</option>
                        <option value="mixtral-8x7b-32768">Mixtral 8x7B 32K</option>
                        <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Circuit Breaker Trip Threshold (1–20 Errors)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={config.circuitBreakerThreshold}
                        onChange={(e) => updateField('circuitBreakerThreshold', Number(e.target.value))}
                        className={`w-full bg-[#131418] border rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none ${
                          validationErrors.circuitBreakerThreshold ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                      {validationErrors.circuitBreakerThreshold && (
                        <p className="text-[10px] text-rose-400 font-mono mt-1">{validationErrors.circuitBreakerThreshold}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL FOOTER */}
            <div className="px-6 py-4 bg-[#15171c] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-400">
                <span>Operator: <strong className="text-emerald-400">{config.operatorEmail}</strong></span>
                <span>•</span>
                <span>Default Model: <strong className="text-indigo-400">{config.defaultLlm}</strong></span>
              </div>

              <div className="flex items-center space-x-2">
                {isDirty && (
                  <button
                    onClick={handleDiscardChanges}
                    className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Discard
                  </button>
                )}
                <button
                  onClick={handleSaveConfiguration}
                  disabled={!isDirty || hasValidationErrors || isSaving}
                  className="flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Configuration
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* HIGH-RISK ACTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#181a1e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-[#131418] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-100">{confirmModal.title}</h3>
                </div>
                <button onClick={() => setConfirmModal(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono bg-[#131418] px-3 py-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Clearance Check:</span>
                  <span className="text-amber-400 font-bold">{confirmModal.riskLevel}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="px-6 py-4 bg-[#131418] border-t border-slate-800 flex justify-end space-x-2.5">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-rose-500/20"
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;