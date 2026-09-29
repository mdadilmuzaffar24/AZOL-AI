import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, Clock, Database, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Smart Glowing Node ---
const GlowingNode = ({ data }) => {
  const { label, isActive, isRunning, isInspected } = data;
  
  return (
    <div className={`relative px-5 py-3 rounded-xl border transition-all duration-500 cursor-pointer w-[220px] flex items-center justify-center font-mono text-[13px] font-semibold ${
      isActive || isInspected
        ? 'bg-[linear-gradient(145deg,#1e1b4b_0%,#312e81_100%)] border-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.5),inset_0_0_12px_rgba(99,102,241,0.3)] z-50 scale-105'
        : 'bg-[#0f172a] border-slate-700 text-slate-400 shadow-md z-10'
    }`}>
      
      {/* Pulse Indicator (Only when actively running) */}
      {isRunning && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
        </span>
      )}
      
      {/* Solid Indicator (When task is complete) */}
      {isActive && !isRunning && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
        </span>
      )}
      
      {label}
      
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { custom: GlowingNode };

export const GraphVisualizer = ({
  executionTimeline = [], // NEW: Accepts the full timeline array
  status = 'idle',
}) => {
  const [inspectedNode, setInspectedNode] = useState(null);

  const rawNodes = [
    { id: 'Supervisor', position: { x: 350, y: 40 }, data: { label: '🧠 Supervisor (Router)' } },
    { id: 'Researcher', position: { x: 50, y: 180 }, data: { label: '🔍 Researcher (Web/DB)' } },
    { id: 'Analyst', position: { x: 350, y: 180 }, data: { label: '⚡ Analyst (Sandbox)' } },
    { id: 'Planner', position: { x: 650, y: 180 }, data: { label: '📝 Planner (Tasks)' } },
    { id: 'MemoryAgent', position: { x: 650, y: 320 }, data: { label: '💾 Memory (3-Tier)' } },
    { id: 'Reviewer', position: { x: 350, y: 320 }, data: { label: '🛡️ QA Reviewer (Guard)' } },
  ];

  const isGlobalActive = status === 'executing' || status === 'thinking';

  // Map timeline data to graph nodes
  const nodes = useMemo(() => {
    return rawNodes.map((node) => {
      let searchId = node.id.toLowerCase();
      if (searchId === 'memoryagent') searchId = 'memory'; // Mapping fix
      
      const timelineEntry = executionTimeline.find(t => t.id === searchId);
      
      const isActive = timelineEntry && timelineEntry.status !== 'waiting';
      const isRunning = timelineEntry && timelineEntry.status === 'running';
      const isInspected = inspectedNode === node.id;
      
      return {
        ...node,
        type: 'custom',
        data: { ...node.data, isActive, isRunning, isInspected },
      };
    });
  }, [executionTimeline, inspectedNode]);

  // Map timeline data to flowing edges
  const edges = [
    { id: 'e-sup-res', source: 'Supervisor', target: 'Researcher', targetId: 'researcher' },
    { id: 'e-sup-ana', source: 'Supervisor', target: 'Analyst', targetId: 'analyst' },
    { id: 'e-sup-pla', source: 'Supervisor', target: 'Planner', targetId: 'planner' },
    { id: 'e-sup-mem', source: 'Supervisor', target: 'MemoryAgent', targetId: 'memory' },
    { id: 'e-ana-rev', source: 'Analyst', target: 'Reviewer', targetId: 'reviewer' },
    { id: 'e-res-rev', source: 'Researcher', target: 'Reviewer', targetId: 'reviewer' },
    { id: 'e-mem-rev', source: 'MemoryAgent', target: 'Reviewer', targetId: 'reviewer' },
  ].map((edge) => {
    const targetTimeline = executionTimeline.find(t => t.id === edge.targetId);
    const isTargetActive = targetTimeline && targetTimeline.status !== 'waiting';
    const isTargetRunning = targetTimeline && targetTimeline.status === 'running';

    return {
      ...edge,
      animated: isTargetRunning, // Edge flows ONLY when the target agent is actively working
      style: { 
        stroke: isTargetActive ? '#818cf8' : '#334155',
        strokeWidth: isTargetActive ? 3 : 1.5,
        transition: 'all 0.3s ease'
      },
      markerEnd: { 
        type: MarkerType.ArrowClosed, 
        color: isTargetActive ? '#818cf8' : '#334155' 
      },
    };
  });

  return (
    <div className="w-full h-full bg-[#020617] relative overflow-hidden flex flex-col rounded-b-xl">
      
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-[#0f172a]/80 backdrop-blur-md z-10 shrink-0">
        <span className="text-xs font-mono text-slate-400 tracking-widest flex items-center">
          <Activity className="w-4 h-4 mr-2 text-indigo-400" />
          ORCHESTRATION_PIPELINE
        </span>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isGlobalActive ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isGlobalActive ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </span>
          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">{status}</span>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative">
        <ReactFlow 
          nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setInspectedNode(node.id)}
          fitView fitViewOptions={{ padding: 0.2 }}
          panOnScroll={false} zoomOnScroll={false} panOnDrag={false} zoomOnDoubleClick={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#1e293b" />
        </ReactFlow>

        <AnimatePresence>
          {inspectedNode && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 w-64 bg-[#0f172a]/95 backdrop-blur-md rounded-xl border border-slate-700 p-4 shadow-2xl z-20"
            >
              <div className="flex justify-between items-start mb-4 border-b border-slate-700/50 pb-3">
                <h3 className="text-sm font-bold text-slate-200 font-mono">{inspectedNode}</h3>
                <button onClick={() => setInspectedNode(null)} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-400 flex items-center"><Zap className="w-3 h-3 mr-1"/> Status</span><span className="text-xs font-mono text-emerald-400">Idle (Ready)</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-400 flex items-center"><Clock className="w-3 h-3 mr-1"/> Avg Latency</span><span className="text-xs font-mono text-slate-300">1.2s</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-400 flex items-center"><Database className="w-3 h-3 mr-1"/> Tokens/Run</span><span className="text-xs font-mono text-slate-300">~850</span></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};