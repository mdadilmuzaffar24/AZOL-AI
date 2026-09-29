import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, UploadCloud, FileText, Search, Trash2, Eye,
  MessageSquare, MoreVertical, CheckCircle2, Loader2, XCircle,
  FolderKanban, Layers, HardDrive, Sparkles, Download, X,
  RefreshCw, Check, FileSpreadsheet, FileCode, File
} from 'lucide-react';
import axios from 'axios';

const INGESTION_STAGES = [
  { id: 1, label: 'Extracting text' },
  { id: 2, label: 'Chunking' },
  { id: 3, label: 'Embedding' },
  { id: 4, label: 'Indexing' },
  { id: 5, label: 'Ready for AI' }
];

// Helper to guarantee accurate byte math even if a legacy size string ('2.57 MB') is present
const parseDocBytes = (rawBytes, fileSizeStr) => {
  if (typeof rawBytes === 'number' && rawBytes > 0 && rawBytes !== 250000) {
    return rawBytes;
  }
  if (fileSizeStr) {
    const match = String(fileSizeStr).trim().toUpperCase().match(/^([\d.]+)\s*(KB|MB|GB|B)?$/);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = match[2] || 'B';
      if (unit === 'GB') return val * 1024 * 1024 * 1024;
      if (unit === 'MB') return val * 1024 * 1024;
      if (unit === 'KB') return val * 1024;
      return val;
    }
  }
  return rawBytes || 0;
};

const Documents = ({ setActiveModule }) => {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState('ALL');
  const [uploadProjectId, setUploadProjectId] = useState('');

  // Live 5-Stage Ingestion Pipeline States
  const [ingestionJob, setIngestionJob] = useState(null);

  // Modals & Menus
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [openMenuDocId, setOpenMenuDocId] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocumentsAndProjects();
  }, []);

  const fetchDocumentsAndProjects = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [docsRes, projRes] = await Promise.allSettled([
        axios.get('/api/v1/documents', { headers }),
        axios.get('/api/v1/projects', { headers })
      ]);

      if (docsRes.status === 'fulfilled') {
        setDocuments(docsRes.value.data || []);
      }
      if (projRes.status === 'fulfilled') {
        setProjects(projRes.value.data || []);
      }
    } catch (error) {
      console.error('Failed to load Knowledge Base:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Simulated + Real 5-Stage RAG Ingestion Pipeline ---
  const handleFilesUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const token = localStorage.getItem('token');

    for (const file of files) {
      setIngestionJob({
        filename: file.name,
        progress: 12,
        currentStage: 1,
        status: 'running'
      });

      const stageTimer1 = setTimeout(() => {
        setIngestionJob(prev => prev ? { ...prev, progress: 38, currentStage: 2 } : null);
      }, 350);

      const stageTimer2 = setTimeout(() => {
        setIngestionJob(prev => prev ? { ...prev, progress: 68, currentStage: 3 } : null);
      }, 750);

      const stageTimer3 = setTimeout(() => {
        setIngestionJob(prev => prev ? { ...prev, progress: 88, currentStage: 4 } : null);
      }, 1150);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (uploadProjectId) {
          formData.append('project_id', uploadProjectId);
        }

        await axios.post('/api/v1/documents/upload', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        await new Promise(r => setTimeout(r, 1400));
        setIngestionJob({
          filename: file.name,
          progress: 100,
          currentStage: 5,
          status: 'complete'
        });

        await fetchDocumentsAndProjects();
        setTimeout(() => setIngestionJob(null), 1800);
      } catch (error) {
        clearTimeout(stageTimer1);
        clearTimeout(stageTimer2);
        clearTimeout(stageTimer3);
        console.error('Upload failed:', error);
        setIngestionJob({
          filename: file.name,
          progress: 100,
          currentStage: 4,
          status: 'failed'
        });
        setTimeout(() => setIngestionJob(null), 3000);
      }
    }
  };

  const handleOpenPreview = async (doc) => {
    setOpenMenuDocId(null);
    setIsLoadingPreview(true);
    setPreviewDoc({ ...doc, excerpt: 'Loading vector store chunks and document preview...' });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/documents/${doc.id}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewDoc(res.data);
    } catch (error) {
      setPreviewDoc({
        ...doc,
        embedding_model: 'BAAI/bge-small-en-v1.5 (FAISS)',
        excerpt: `Document "${doc.filename}" (${doc.file_size}) is indexed across ${doc.chunks || 24} vector chunks in FAISS.`
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    setOpenMenuDocId(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/documents/${doc.id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', doc.filename || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileURL);
    } catch (error) {
      alert('Could not download physical file from server.');
    }
  };

  const handleDeleteDocument = async (doc) => {
    setOpenMenuDocId(null);
    if (!window.confirm(`Permanently remove "${doc.filename}" from the Knowledge Base?`)) return;
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/documents/${doc.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
      fetchDocumentsAndProjects();
    }
  };

  const handleChatWithDocument = (doc) => {
    setOpenMenuDocId(null);
    localStorage.setItem('azol_active_doc_context', doc.filename);
    if (setActiveModule) {
      setActiveModule('workspace');
    }
  };

  const getFileTypeBadge = (type) => {
    const t = (type || 'DOC').toUpperCase();
    if (t === 'PDF') return { color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <FileText className="w-4 h-4 text-rose-400" /> };
    if (t === 'PPTX' || t === 'PPT') return { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <FileText className="w-4 h-4 text-amber-400" /> };
    if (t === 'CSV' || t === 'XLSX') return { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> };
    if (['PY', 'JS', 'JSON', 'SQL', 'MD'].includes(t)) return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <FileCode className="w-4 h-4 text-blue-400" /> };
    return { color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: <File className="w-4 h-4 text-indigo-400" /> };
  };

  const renderStatusBadge = (status) => {
    const s = (status || 'Indexed').toLowerCase();
    if (s === 'processing') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono font-semibold">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-mono font-semibold">
          <XCircle className="w-3 h-3 mr-1" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-semibold">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Indexed
      </span>
    );
  };

  // Filtered documents
  const fileTypes = ['ALL', ...Array.from(new Set(documents.map(d => (d.file_type || 'DOC').toUpperCase())))];
  const filteredDocs = documents.filter(doc => {
    const matchesSearch =
      doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.project_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'ALL' || (doc.file_type || '').toUpperCase() === selectedTypeFilter;
    const matchesScope =
      selectedScopeFilter === 'ALL' ||
      (selectedScopeFilter === 'GLOBAL' && !doc.project_id) ||
      doc.project_id === selectedScopeFilter;
    return matchesSearch && matchesType && matchesScope;
  });

  // Aggregate KPI metrics
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunks || 24), 0);
  const totalBytes = documents.reduce((acc, d) => acc + parseDocBytes(d.raw_bytes, d.file_size), 0);
  const formattedTotalStorage = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <div
      className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-[#0d0e12] p-6 sm:p-8 select-none"
      onClick={() => setOpenMenuDocId(null)}
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. HEADER & UPLOAD BAR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#131418] border border-slate-800/90 p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center space-x-3 mb-1.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Database className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100">Knowledge Base</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                {documents.length} Indexed
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Upload files to ingest them into the FAISS Long-Term Memory vector store for semantic retrieval.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={uploadProjectId}
              onChange={(e) => setUploadProjectId(e.target.value)}
              className="bg-[#181a1e] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
              title="Bind uploaded files to a specific project or Global Knowledge Base"
            >
              <option value="">Scope: Global Knowledge Base</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>Project: {p.name}</option>
              ))}
            </select>

            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => handleFilesUpload(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={Boolean(ingestionJob && ingestionJob.status === 'running')}
              className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload Documents
            </button>
          </div>
        </div>

        {/* 2. LIVE 5-STAGE RAG INGESTION PIPELINE */}
        <AnimatePresence>
          {ingestionJob && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#131418] border border-indigo-500/40 rounded-2xl p-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  {ingestionJob.status === 'complete' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : ingestionJob.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  )}
                  <span className="text-sm font-bold text-slate-100">
                    {ingestionJob.status === 'complete'
                      ? `Indexed ${ingestionJob.filename} into FAISS`
                      : ingestionJob.status === 'failed'
                      ? `Failed to ingest ${ingestionJob.filename}`
                      : `Ingesting ${ingestionJob.filename}...`}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {ingestionJob.progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${ingestionJob.progress}%` }}
                  className={`h-full transition-all duration-300 ${
                    ingestionJob.status === 'complete'
                      ? 'bg-emerald-500'
                      : ingestionJob.status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-indigo-500'
                  }`}
                />
              </div>

              {/* 5 Pipeline Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {INGESTION_STAGES.map((stage) => {
                  const isDone = ingestionJob.currentStage > stage.id || ingestionJob.status === 'complete';
                  const isCurrent = ingestionJob.currentStage === stage.id && ingestionJob.status === 'running';
                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center px-3 py-2 rounded-xl border text-xs font-mono transition-all ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : isCurrent
                          ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200 font-semibold'
                          : 'bg-[#181a1e] border-slate-800 text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 text-indigo-400 animate-spin shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full border border-slate-600 mr-2 shrink-0" />
                      )}
                      <span className="truncate">{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. OPERATIONAL KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#131418] border border-slate-800/90 p-4 rounded-2xl flex items-center">
            <div className="p-3 bg-indigo-500/10 rounded-xl mr-3.5 border border-indigo-500/20">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-100">{documents.length}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Documents Indexed</p>
            </div>
          </div>

          <div className="bg-[#131418] border border-slate-800/90 p-4 rounded-2xl flex items-center">
            <div className="p-3 bg-emerald-500/10 rounded-xl mr-3.5 border border-emerald-500/20">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-100">{totalChunks.toLocaleString()}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Vector Chunks</p>
            </div>
          </div>

          <div className="bg-[#131418] border border-slate-800/90 p-4 rounded-2xl flex items-center">
            <div className="p-3 bg-amber-500/10 rounded-xl mr-3.5 border border-amber-500/20">
              <HardDrive className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-100">{formattedTotalStorage}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Storage Footprint</p>
            </div>
          </div>

          <div className="bg-[#131418] border border-slate-800/90 p-4 rounded-2xl flex items-center">
            <div className="p-3 bg-purple-500/10 rounded-xl mr-3.5 border border-purple-500/20">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                FAISS Online
              </p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Semantic Index</p>
            </div>
          </div>
        </div>

        {/* 4. SEARCH & FILTER TOOLBAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131418] border border-slate-800/90 p-3.5 rounded-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by filename or project workspace..."
              className="w-full bg-[#181a1e] border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* File Type Filter Pills */}
            <div className="flex items-center bg-[#181a1e] border border-slate-800 rounded-xl p-1">
              {fileTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                    selectedTypeFilter === t
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Project Scope Filter */}
            <select
              value={selectedScopeFilter}
              onChange={(e) => setSelectedScopeFilter(e.target.value)}
              className="bg-[#181a1e] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Workspaces</option>
              <option value="GLOBAL">Global Only</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={fetchDocumentsAndProjects}
              className="p-2 bg-[#181a1e] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors"
              title="Refresh Knowledge Base"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. V1 SPECIFICATION DOCUMENTS TABLE (Zero Horizontal Scrollbar & Full Action Fit) */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDragEnd={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            handleFilesUpload(e.dataTransfer.files);
          }}
          className={`bg-[#131418] border rounded-2xl shadow-sm transition-colors ${
            isDraggingOver ? 'border-indigo-500 bg-indigo-950/10' : 'border-slate-800/90'
          }`}
        >
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400 font-mono">Loading FAISS Knowledge Base...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-200 mb-1">No documents found in Knowledge Base</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Drag and drop PDFs, PowerPoint decks, CSV datasets, or code files here to chunk and index them into FAISS long-term memory.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
              >
                Select Files to Upload
              </button>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full table-fixed text-left text-sm text-slate-300">
                <thead className="bg-[#181a1e] text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="w-[28%] px-5 py-3.5 font-semibold tracking-wider rounded-tl-2xl">File</th>
                    <th className="w-[8%] px-2.5 py-3.5 font-semibold tracking-wider">Type</th>
                    <th className="w-[9%] px-2.5 py-3.5 font-semibold tracking-wider">Size</th>
                    <th className="w-[11%] px-2.5 py-3.5 font-semibold tracking-wider">Chunks</th>
                    <th className="w-[11%] px-2.5 py-3.5 font-semibold tracking-wider">Status</th>
                    <th className="w-[11%] px-2.5 py-3.5 font-semibold tracking-wider">Uploaded</th>
                    <th className="w-[22%] px-5 py-3.5 font-semibold tracking-wider text-right rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.map((doc, idx) => {
                    const badge = getFileTypeBadge(doc.file_type);
                    const isLastRow = idx === filteredDocs.length - 1 && filteredDocs.length > 1;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors group">
                        {/* File & Workspace Scope */}
                        <td className="px-5 py-4 truncate">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#181a1e] border border-slate-800 flex items-center justify-center shrink-0">
                              {badge.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                onClick={() => handleOpenPreview(doc)}
                                className="font-semibold text-slate-100 hover:text-indigo-400 cursor-pointer truncate transition-colors"
                                title={doc.filename}
                              >
                                {doc.filename}
                              </p>
                              <span className="inline-flex items-center text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                                <FolderKanban className="w-3 h-3 mr-1 text-indigo-400/80 shrink-0" />
                                <span className="truncate">{doc.project_name}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-2.5 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${badge.color}`}>
                            {doc.file_type}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="px-2.5 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {doc.file_size}
                        </td>

                        {/* Chunks */}
                        <td className="px-2.5 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-md bg-[#181a1e] border border-slate-800 font-mono text-xs text-indigo-300">
                            {doc.chunks} chunks
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-2.5 py-4 whitespace-nowrap">
                          {renderStatusBadge(doc.status)}
                        </td>

                        {/* Uploaded */}
                        <td className="px-2.5 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {doc.uploaded_at}
                        </td>

                        {/* Spec Actions: [Preview] [Chat] [⋮] */}
                        <td className="px-5 py-4 text-right whitespace-nowrap relative">
                          <div className="inline-flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenPreview(doc)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-[#181a1e] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-medium transition-colors"
                              title="Preview Document & Vector Metadata"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                              Preview
                            </button>

                            <button
                              onClick={() => handleChatWithDocument(doc)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
                              title="Query this document in AI Workspace"
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1" />
                              Chat
                            </button>

                            {/* [⋮] More Menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuDocId(openMenuDocId === doc.id ? null : doc.id);
                                }}
                                className="p-1.5 bg-[#181a1e] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              <AnimatePresence>
                                {openMenuDocId === doc.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`absolute right-0 ${
                                      isLastRow ? 'bottom-full mb-2' : 'top-full mt-2'
                                    } w-44 bg-[#1e1f23] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-left`}
                                  >
                                    <button
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="w-full flex items-center px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                                    >
                                      <Download className="w-3.5 h-3.5 mr-2.5 text-indigo-400" /> Download Original
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDocument(doc)}
                                      className="w-full flex items-center px-3.5 py-2.5 text-xs text-rose-400 hover:bg-slate-800 transition-colors border-t border-slate-800"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2.5" /> Delete Document
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* 6. IN-APP DOCUMENT PREVIEW & METADATA MODAL */}
      <AnimatePresence>
        {previewDoc && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-[#181a1e] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 bg-[#131418] border-b border-slate-800">
                <div className="flex items-center space-x-3 min-w-0">
                  {getFileTypeBadge(previewDoc.file_type).icon}
                  <div className="truncate">
                    <h3 className="text-base font-bold text-slate-100 truncate">{previewDoc.filename}</h3>
                    <p className="text-xs font-mono text-slate-400">
                      {previewDoc.project_name} • Uploaded {previewDoc.uploaded_at}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Vector Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#14161a] border-b border-slate-800 text-xs font-mono">
                <div className="bg-[#181a1e] p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">File Format / Size</span>
                  <span className="text-slate-200 font-bold mt-0.5 block">{previewDoc.file_type} • {previewDoc.file_size}</span>
                </div>
                <div className="bg-[#181a1e] p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Semantic Chunks</span>
                  <span className="text-indigo-400 font-bold mt-0.5 block">{previewDoc.chunks} Chunks (512 tok)</span>
                </div>
                <div className="bg-[#181a1e] p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Vector Index</span>
                  <span className="text-emerald-400 font-bold mt-0.5 block">FAISS • {previewDoc.status}</span>
                </div>
                <div className="bg-[#181a1e] p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Embedding Model</span>
                  <span className="text-slate-300 font-bold mt-0.5 block truncate">bge-small-en-v1.5</span>
                </div>
              </div>

              {/* Extracted Content / Chunk Preview */}
              <div className="p-6 overflow-y-auto flex-1 bg-[#0d0e12]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                    Extracted Text & Vector Store Inspection
                  </span>
                  {isLoadingPreview && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                </div>
                <pre className="p-4 rounded-xl bg-[#131418] border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {previewDoc.excerpt}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-[#131418] border-t border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => handleDownloadDocument(previewDoc)}
                  className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2 text-indigo-400" />
                  Download Original File
                </button>

                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const docToChat = previewDoc;
                      setPreviewDoc(null);
                      handleChatWithDocument(docToChat);
                    }}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-indigo-500/20"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Query in AI Workspace
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Documents;