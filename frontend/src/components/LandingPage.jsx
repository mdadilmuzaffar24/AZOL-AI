import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  ArrowRight, Play, CheckCircle2, Globe, FileText,
  Terminal, Sparkles, Table, ExternalLink, ShieldCheck,
  Database, BarChart3, TrendingUp, MessageSquare, Send
} from 'lucide-react';

// ==========================================
// 1. OFFICIAL MERIDIAN LOGO MARK (100-UNIT GRID SPEC)
// ==========================================
export const AzolMeridianMark = ({
  size = 36,
  variant = 'm1',
  color = '#635BFF',
  accentColor = '#20D9A0',
  bgStroke = '#07090D',
  className = ''
}) => {
  const showOuterRing = size >= 24;
  const starPath = 'M50 8Q50 50 92 50Q50 50 50 92Q50 50 8 50Q50 50 50 8Z';
  const petalPath = 'M50 10Q61 35 50 43Q39 35 50 10Z';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color }}
      className={`shrink-0 select-none ${className}`}
      aria-label="AZOL AI Meridian Mark"
    >
      {variant === 'm1' && (
        <>
          <path d={starPath} fill="currentColor" />
          {showOuterRing && (
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.6"
            />
          )}
          <circle cx="50" cy="50" r="5.5" fill={accentColor} stroke={bgStroke} strokeWidth="2" />
        </>
      )}

      {variant === 'm3' && (
        <>
          <path d="M50 2Q50 50 90 50Q50 50 50 84Q50 50 10 50Q50 50 50 2Z" fill="currentColor" />
          <circle cx="50" cy="50" r="4.5" fill={accentColor} />
          {showOuterRing && (
            <path d="M28 92H72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          )}
        </>
      )}

      {variant === 'm4' && (
        <>
          <path d={starPath} fill="currentColor" />
          {showOuterRing && (
            <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M50 12A38 38 0 0 1 88 50" opacity="0.9" />
              <path d="M88 50A38 38 0 0 1 50 88" opacity="0.35" />
              <path d="M50 88A38 38 0 0 1 12 50" opacity="0.9" />
              <path d="M12 50A38 38 0 0 1 50 12" opacity="0.35" />
            </g>
          )}
          <circle cx="77" cy="23" r="5" fill={accentColor} />
        </>
      )}

      {variant === 'm6' && (
        <>
          <path
            d={starPath}
            fill="currentColor"
            opacity="0.45"
            transform="translate(50 50) rotate(45) scale(0.7) translate(-50 -50)"
          />
          <path d={starPath} fill="currentColor" />
          <circle cx="50" cy="50" r="5" fill={accentColor} stroke={bgStroke} strokeWidth="2" />
        </>
      )}

      {variant === 'm8' && (
        <>
          <g fill="currentColor">
            <path d={petalPath} />
            <path d={petalPath} transform="rotate(90 50 50)" />
            <path d={petalPath} transform="rotate(180 50 50)" />
            <path d={petalPath} transform="rotate(270 50 50)" />
          </g>
          <circle cx="50" cy="50" r="5" fill={accentColor} />
        </>
      )}
    </svg>
  );
};

export const AzolLogoMark = AzolMeridianMark;

// ==========================================
// 2. OFFICIAL CUSTOM WORDMARK LOCKUP (AZ◎L AI)
// ==========================================
export const AzolWordmarkLockup = ({
  iconSize = 34,
  fontSize = '22px',
  serifVariant = false,
  showBadge = false
}) => (
  <div className="inline-flex items-center select-none" style={{ gap: `${Math.round(iconSize * 0.34)}px` }}>
    <AzolMeridianMark size={iconSize} variant="m1" color="#635BFF" accentColor="#20D9A0" />
    <span
      style={{
        fontFamily: serifVariant ? "'Cormorant Garamond', Georgia, serif" : "'Jost', sans-serif",
        fontWeight: serifVariant ? 600 : 500,
        fontSize,
        letterSpacing: serifVariant ? '0.20em' : '0.24em',
        lineHeight: 1,
        color: '#F4F5FA'
      }}
      className="inline-flex items-baseline"
    >
      <span>AZ</span>
      <svg
        viewBox="0 0 10 10"
        style={{
          width: '0.74em',
          height: '0.74em',
          margin: '0 0.22em 0 0.04em',
          overflow: 'visible',
          alignSelf: 'center'
        }}
      >
        <circle cx="5" cy="5" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.15" />
        <circle cx="5" cy="5" r="1.25" fill="#20D9A0" />
      </svg>
      <span>L</span>
      <i
        style={{
          fontStyle: 'normal',
          fontSize: '0.52em',
          letterSpacing: '0.30em',
          color: '#61D8FF',
          marginLeft: '0.65em',
          fontWeight: 400
        }}
      >
        AI
      </i>
    </span>
    {showBadge && (
      <span
        style={{
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: '#20D9A0',
          border: '1px solid rgba(32, 217, 160, 0.45)',
          background: 'rgba(32, 217, 160, 0.08)'
        }}
        className="px-2.5 py-0.5 rounded-full font-mono font-semibold uppercase ml-1"
      >
        V1.0 LIVE
      </span>
    )}
  </div>
);

// ==========================================
// 3. PERSISTENT DEEP-SPACE AMBIENT ENVIRONMENT
// ==========================================
const AzolAmbientBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes = Array.from({ length: 36 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      r: 1.1 + Math.random() * 1.5
    }));

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.09;
            ctx.strokeStyle = `rgba(124, 108, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n, idx) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle =
          idx % 4 === 0
            ? 'rgba(32, 217, 160, 0.35)'
            : idx % 3 === 0
            ? 'rgba(97, 216, 255, 0.30)'
            : 'rgba(99, 91, 255, 0.35)';
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#07090D]">
      <div
        className="absolute -top-44 left-1/4 w-[780px] h-[520px] rounded-full blur-[160px] opacity-20"
        style={{ background: 'radial-gradient(circle, #635BFF 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 -right-36 w-[640px] h-[520px] rounded-full blur-[160px] opacity-15"
        style={{ background: 'radial-gradient(circle, #61D8FF 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 left-12 w-[680px] h-[460px] rounded-full blur-[160px] opacity-15"
        style={{ background: 'radial-gradient(circle, #20D9A0 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #7C6CFF 1px, transparent 1px), linear-gradient(to bottom, #7C6CFF 1px, transparent 1px)',
          backgroundSize: '68px 68px'
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

// ==========================================
// 4. INTERACTIVE 3D "AZOL CORE" (PERFECT DEAD-CENTER LOCK)
// ==========================================
const ORBITAL_AGENTS = [
  { id: 'planner', name: 'Planner', desc: 'Breaks goals into clear steps', icon: '📐', angle: 0, status: '01 • PLAN' },
  { id: 'researcher', name: 'Research Agent', desc: 'Web & private knowledge', icon: '🔎', angle: 60, status: '02 • RESEARCH' },
  { id: 'analyst', name: 'Data Analyst', desc: 'Quantitative & trend analysis', icon: '🧮', angle: 120, status: '03 • ANALYZE' },
  { id: 'coding', name: 'Coding Agent', desc: 'Builds & runs code pipelines', icon: '💻', angle: 180, status: '04 • EXECUTE' },
  { id: 'memory', name: 'RAG / Memory', desc: 'Recalls documents & context', icon: '📚', angle: 240, status: '05 • RETRIEVE' },
  { id: 'reviewer', name: 'QA Reviewer', desc: 'Verifies sources & accuracy', icon: '🛡️', angle: 300, status: '06 • VERIFIED ✓' }
];

const Azol3DCore = ({ activeAgentIndex, setActiveAgentIndex }) => {
  const canvasRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let rotation = 0;

    const vertices = [];
    const latSteps = 10;
    const lonSteps = 18;
    const radius = 72;

    for (let i = 0; i <= latSteps; i++) {
      const theta = (i * Math.PI) / latSteps;
      for (let j = 0; j < lonSteps; j++) {
        const phi = (j * 2 * Math.PI) / lonSteps;
        vertices.push({
          x: radius * Math.sin(theta) * Math.cos(phi),
          y: radius * Math.cos(theta),
          z: radius * Math.sin(theta) * Math.sin(phi)
        });
      }
    }

    const particles = Array.from({ length: 36 }, (_, i) => ({
      spoke: i % 6,
      progress: Math.random(),
      speed: 0.007 + Math.random() * 0.006,
      inbound: i % 2 === 0
    }));

    const render = () => {
      rotation += 0.0085;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 205);
      grad.addColorStop(0, 'rgba(99, 91, 255, 0.34)');
      grad.addColorStop(0.48, 'rgba(32, 217, 160, 0.10)');
      grad.addColorStop(1, 'rgba(7, 9, 13, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 205, 0, Math.PI * 2);
      ctx.fill();

      // Concentric Meridian Rings
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(124, 108, 255, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 178, 178, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(32, 217, 160, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 210, 84, rotation * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const orbitRadius = 178;
      ORBITAL_AGENTS.forEach((ag, idx) => {
        const rad = (ag.angle * Math.PI) / 180;
        const tx = cx + Math.cos(rad) * orbitRadius;
        const ty = cy + Math.sin(rad) * orbitRadius;
        const isHighlighted = idx === activeAgentIndex;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = isHighlighted ? 'rgba(32, 217, 160, 0.88)' : 'rgba(35, 40, 56, 0.75)';
        ctx.lineWidth = isHighlighted ? 2.4 : 1.1;
        ctx.stroke();
      });

      particles.forEach((p) => {
        const isActiveSpoke = p.spoke === activeAgentIndex;
        p.progress += isActiveSpoke ? p.speed * 1.85 : p.speed;
        if (p.progress > 1) p.progress = 0;

        const ag = ORBITAL_AGENTS[p.spoke];
        const rad = (ag.angle * Math.PI) / 180;
        const tx = cx + Math.cos(rad) * orbitRadius;
        const ty = cy + Math.sin(rad) * orbitRadius;

        const t = p.inbound ? 1 - p.progress : p.progress;
        const px = cx + (tx - cx) * t;
        const py = cy + (ty - cy) * t;

        ctx.beginPath();
        ctx.arc(px, py, isActiveSpoke ? 3.8 : 2.2, 0, Math.PI * 2);
        ctx.fillStyle = isActiveSpoke ? '#20D9A0' : '#61D8FF';
        ctx.fill();
      });

      // 3D Geodesic Sphere
      const cosY = Math.cos(rotation);
      const sinY = Math.sin(rotation);
      const cosX = Math.cos(0.36);
      const sinX = Math.sin(0.36);

      const projected = vertices.map((v) => {
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.z * cosY + v.x * sinY;
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + v.y * sinX;
        const scale = 270 / (270 + z2);
        return { x: cx + x1 * scale, y: cy + y2 * scale, z: z2, scale };
      });

      ctx.strokeStyle = 'rgba(124, 108, 255, 0.24)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (p1.z > 28) continue;
        const next = projected[(i + 1) % projected.length];
        if (Math.hypot(p1.x - next.x, p1.y - next.y) < 36) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
      }

      projected.forEach((p) => {
        const alpha = Math.max(0.2, (radius - p.z) / (radius * 2));
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.9 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 245, 250, ${alpha * 0.75})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeAgentIndex]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 15;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -15;
    setTilt({ x, y });
  };

  const activeAgent = ORBITAL_AGENTS[activeAgentIndex];

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ perspective: '1200px' }}
      className="relative w-full max-w-[580px] h-[470px] sm:h-[520px] mx-auto flex items-center justify-center select-none"
    >
      <motion.div
        animate={{ rotateY: tilt.x, rotateX: tilt.y }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <canvas ref={canvasRef} width={520} height={520} className="w-[350px] h-[350px] sm:w-[500px] sm:h-[500px]" />

        {/* Central Meridian Classic Mark — Locked to Exact Geometric Center (50%, 50%) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[#07090D] border border-[#232838] flex items-center justify-center shadow-[0_0_40px_rgba(99,91,255,0.4)]">
              <AzolMeridianMark size={54} variant="m1" color="#635BFF" accentColor="#20D9A0" />
            </div>
            {/* Floating Status Pill anchored below the circle so it never shifts the logo upward */}
            <div
              style={{ borderColor: 'rgba(32, 217, 160, 0.45)', color: '#20D9A0' }}
              className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-3.5 py-1 rounded-full bg-[#0E1118]/95 border text-[11px] font-mono font-semibold shadow-lg"
            >
              {activeAgent.status}
            </div>
          </div>
        </div>

        {/* 6 Interactive Orbital Agent Nodes */}
        {ORBITAL_AGENTS.map((agent, idx) => {
          const rad = (agent.angle * Math.PI) / 180;
          const radiusPct = 39;
          const left = `${50 + Math.cos(rad) * radiusPct}%`;
          const top = `${50 + Math.sin(rad) * radiusPct}%`;
          const isActive = idx === activeAgentIndex;

          return (
            <div
              key={agent.id}
              onMouseEnter={() => setActiveAgentIndex(idx)}
              onClick={() => setActiveAgentIndex(idx)}
              style={{
                left,
                top,
                borderColor: isActive ? '#20D9A0' : '#232838',
                background: isActive ? '#141928' : 'rgba(14, 17, 24, 0.92)'
              }}
              className={`-translate-x-1/2 -translate-y-1/2 absolute cursor-pointer transition-all duration-300 px-3.5 py-2.5 rounded-2xl border backdrop-blur-xl ${
                isActive ? 'shadow-[0_0_28px_rgba(32,217,160,0.28)] scale-110 z-20' : 'hover:border-[#635BFF] z-10'
              }`}
            >
              <div className="flex items-center space-x-2.5 whitespace-nowrap">
                <span className="text-base">{agent.icon}</span>
                <div>
                  <p className="text-xs sm:text-[13.5px] font-semibold text-[#F4F5FA] leading-tight">{agent.name}</p>
                  <p className="text-[11px] text-[#9AA0B4] mt-0.5 hidden sm:block">{agent.desc}</p>
                </div>
                {isActive && <span className="w-2.5 h-2.5 rounded-full bg-[#20D9A0] animate-ping" />}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

// ==========================================
// 5. PAGE CONTENT DATA (HUMAN + TECHNICAL LAYERS)
// ==========================================
const LIVE_GOALS = [
  {
    id: 'report',
    label: 'Business Report',
    goal: 'Analyze these documents and prepare a verified business & research report.',
    steps: [
      { num: '01', agent: 'Planner', action: 'Breaking the goal into 5 coordinated operations', time: '0.4s' },
      { num: '02', agent: 'Researcher', action: 'Reading uploaded PDFs & live web sources', time: '1.1s' },
      { num: '03', agent: 'Data Analyst', action: 'Extracting key performance metrics & benchmarks', time: '0.9s' },
      { num: '04', agent: 'Coding Agent', action: 'Formatting the executive summary & tables', time: '0.7s' },
      { num: '05', agent: 'QA Reviewer', action: 'Checking every claim against its source citation', time: '0.4s' }
    ],
    resultTitle: 'Executive Synthesis Ready',
    resultSummary: '✓ 4 documents analyzed  ·  18 citations verified  ·  Zero hallucinations',
    resultBody: `1. Findings synthesized across your uploaded technical & financial documents.\n2. Key metrics isolated: 98.1% peak accuracy benchmark and 24% latency reduction.\n3. Full report and runnable pipeline ready for 1-click download.`
  },
  {
    id: 'sales',
    label: 'Sales Analysis',
    goal: 'Find why Q3 revenue declined across regional enterprise cohorts.',
    steps: [
      { num: '01', agent: 'Planner', action: 'Structuring the cohort & regional analysis plan', time: '0.3s' },
      { num: '02', agent: 'Researcher', action: 'Checking Q3 pricing updates in company docs', time: '0.8s' },
      { num: '03', agent: 'Data Analyst', action: 'Scanning 14,200 customer subscription rows', time: '1.2s' },
      { num: '04', agent: 'Coding Agent', action: 'Writing the Python anomaly detection script', time: '0.8s' },
      { num: '05', agent: 'QA Reviewer', action: 'Validating calculations & schema integrity', time: '0.3s' }
    ],
    resultTitle: 'Root-Cause Analysis Ready',
    resultSummary: '✓ 14,200 rows scanned  ·  2 primary drivers isolated  ·  Script attached',
    resultBody: `1. Primary driver (-14.2%): Renewal lag after the August pricing update.\n2. Regional variance: APAC dipped 9.4% while EMEA grew +6.1%.\n3. Recommended action: Restore the annual discount trigger for accounts >50 seats.`
  },
  {
    id: 'code',
    label: 'Pipeline Automation',
    goal: 'Research the latest AI releases and build an automated Python data pipeline.',
    steps: [
      { num: '01', agent: 'Planner', action: 'Designing modular architecture & dependency graph', time: '0.4s' },
      { num: '02', agent: 'Researcher', action: 'Fetching current documentation & release specs', time: '1.3s' },
      { num: '03', agent: 'Data Analyst', action: 'Defining input/output JSON validation schemas', time: '0.6s' },
      { num: '04', agent: 'Coding Agent', action: 'Writing production-grade async Python pipeline', time: '1.0s' },
      { num: '05', agent: 'QA Reviewer', action: 'Verifying edge cases, syntax & security rules', time: '0.4s' }
    ],
    resultTitle: 'Production Pipeline Ready',
    resultSummary: '✓ Live web sources cited  ·  pipeline_v1.py generated & linted',
    resultBody: `async def run_pipeline(source_url: str) -> dict:\n    # Synthesized, linted, and verified by AZOL AI Workforce\n    data = await fetch_verified_stream(source_url)\n    return validate_and_store(data)`
  }
];

const V1_MODULES = [
  {
    icon: '🧠',
    title: 'AI Workspace',
    subtitle: 'Coordinated execution',
    desc: 'Give AZOL a complex goal and watch specialist agents plan, collaborate, and deliver the result together inside one resizable workspace.',
    pipeline: ['Goal', 'Supervisor', 'Agents', 'QA', 'Result'],
    techLayer: 'LangGraph StateGraph · SSE Streaming'
  },
  {
    icon: '🔎',
    title: 'Research Agent',
    subtitle: 'Live web + private docs',
    desc: 'Combines real-time internet search with your private files so answers stay current, grounded, and backed by clickable citations.',
    pipeline: ['Query', 'Web', 'Docs', 'Cross-check', 'Brief'],
    techLayer: 'Live Web SERP · Dynamic Citations'
  },
  {
    icon: '📚',
    title: 'RAG Knowledge Base',
    subtitle: 'Instant document recall',
    desc: 'Upload PDFs, Word docs, presentations, or sheets — AZOL indexes every paragraph for instant, accurate recall across sessions.',
    pipeline: ['Upload', 'Chunk', 'Embed', 'FAISS Index', 'Answer'],
    techLayer: 'FAISS Vector Store · BAAI/bge-small-en-v1.5'
  },
  {
    icon: '💻',
    title: 'Coding Agent',
    subtitle: 'Autonomous code & artifacts',
    desc: 'Generates runnable scripts, SQL queries, and structured reports that you can preview in-app or download with a single click.',
    pipeline: ['Spec', 'Design', 'Code', 'Lint', 'File'],
    techLayer: 'Automated Artifact Extraction & Linting'
  },
  {
    icon: '🧮',
    title: 'Data Analyst',
    subtitle: 'Trend & variance analysis',
    desc: 'Turns raw numbers, CSVs, and structured datasets into clear summaries, root-cause explanations, and business takeaways.',
    pipeline: ['Data', 'Clean', 'Analyze', 'Anomaly', 'Insight'],
    techLayer: 'Python Quantitative Sandbox'
  },
  {
    icon: '🛡️',
    title: 'QA Reviewer',
    subtitle: 'Built-in trust layer',
    desc: 'Every output is checked for factual grounding, source citations, and safety before it reaches you — eliminating unverified guesses.',
    pipeline: ['Draft', 'Check', 'Audit', 'Gate', 'Verified ✓'],
    techLayer: 'Automated Grounding & Citation Audit'
  },
  {
    icon: '💾',
    title: 'Persistent Memory',
    subtitle: 'Remembers your projects',
    desc: 'Keeps isolated project context, tasks, and documents across sessions so you never have to repeat yourself from scratch.',
    pipeline: ['Session', 'Scope', 'Memory', 'Save', 'Recall'],
    techLayer: '3-Tier Memory · PostgreSQL + Scoped FAISS'
  }
];

const COMPARISON_ROWS = [
  { label: 'Scope', bad: 'One prompt, one isolated answer', ok: 'One goal, multi-step autonomous execution' },
  { label: 'Tools', bad: 'You switch between tools yourself', ok: 'Agents route work & tools automatically' },
  { label: 'Memory', bad: 'Forgets your project each time', ok: 'Persistent memory across sessions (FAISS + Postgres)' },
  { label: 'Trust', bad: 'You fact-check the final answer', ok: 'Built-in QA reviewer verifies & cites sources' },
  { label: 'Coordination', bad: 'You run the workflow manually', ok: 'AZOL runs the workflow, end to end' }
];

const USE_CASES = [
  {
    category: '📄 Research',
    prompt: '"Analyze 20 papers into a cited literature review."',
    outcome: 'Extracts methods, compares benchmarks, and links every claim to its exact source chunk.'
  },
  {
    category: '📊 Revenue',
    prompt: '"Find why sales dropped this quarter."',
    outcome: 'Isolates the primary driver and hands you a ready executive summary with the Python script behind it.'
  },
  {
    category: '🌐 Market Intel',
    prompt: '"Research the latest AI developments."',
    outcome: 'Checks live web sources, filters out noise, and returns a structured, verifiable competitive brief.'
  },
  {
    category: '💻 Engineering',
    prompt: '"Build and test a Python data pipeline."',
    outcome: 'Writes, lints, and packages runnable, schema-validated code ready for 1-click download.'
  },
  {
    category: '🧠 Internal Knowledge',
    prompt: '"Search our internal policy & architecture docs."',
    outcome: 'Finds exact clauses from your private files, kept strictly isolated per operator account.'
  },
  {
    category: '⚙️ Automation',
    prompt: '"Turn this quarterly objective into a workflow."',
    outcome: 'Breaks the goal into Kanban tasks, assigns specialist agents, and tracks completion.'
  }
];

const V2_QUERIES = [
  {
    question: '"Why did enterprise revenue dip in Q3 across APAC?"',
    dbSource: 'PostgreSQL (prod_orders) + MongoDB (user_events)',
    sqlGenerated: "SELECT region, tier, SUM(mrr_delta) FROM subscriptions WHERE quarter = 'Q3' GROUP BY 1, 2;",
    insight: 'APAC Enterprise renewals shifted 18 days later due to new procurement approval tiers; net retention remains strong at 104.2%.',
    kpis: [
      { label: 'APAC Pipeline', val: '$1.42M', delta: '+12.4% YoY', up: true },
      { label: 'Approval Cycle', val: '34 Days', delta: '+11 Days', up: false },
      { label: 'Net Retention', val: '104.2%', delta: '+2.1% QoQ', up: true }
    ],
    bars: [
      { week: 'W1', pct: 62, val: '$184K', tag: 'Baseline' },
      { week: 'W2', pct: 78, val: '$218K', tag: '+18%' },
      { week: 'W3', pct: 54, val: '$152K', tag: 'Dip (-14%)' },
      { week: 'W4', pct: 84, val: '$236K', tag: 'Recovery' },
      { week: 'W5', pct: 91, val: '$254K', tag: '+14%' },
      { week: 'W6', pct: 76, val: '$212K', tag: 'Stable' },
      { week: 'W7', pct: 96, val: '$278K', tag: 'Peak ✓' }
    ],
    svgLinePath: 'M 28 76 L 108 48 L 188 92 L 268 38 L 348 24 L 428 52 L 508 14',
    svgAreaPath: 'M 28 76 L 108 48 L 188 92 L 268 38 L 348 24 L 428 52 L 508 14 L 508 140 L 28 140 Z',
    chatFollowUp: 'Autonomous Action: Flagged 14 delayed APAC renewals in PostgreSQL & generated Q4 recovery forecast.'
  },
  {
    question: '"Which product lines are outperforming margin targets this month?"',
    dbSource: 'MySQL (erp_ledger) + Snowflake Cloud Warehouse',
    sqlGenerated: 'SELECT product_line, AVG(gross_margin_pct) FROM ledger_v2 GROUP BY 1 HAVING AVG(gross_margin_pct) > 0.65;',
    insight: 'AI Automation Suite exceeded target margin by +8.6%, driven by 38% lower inference compute cost.',
    kpis: [
      { label: 'Gross Margin', val: '73.6%', delta: '+8.6% vs Target', up: true },
      { label: 'Unit Compute Cost', val: '$0.04', delta: '-38% Reduction', up: true },
      { label: 'Active Enterprise Seats', val: '18,940', delta: '+24% Growth', up: true }
    ],
    bars: [
      { week: 'W1', pct: 52, val: '64.2%', tag: 'Target' },
      { week: 'W2', pct: 64, val: '66.8%', tag: '+2.6%' },
      { week: 'W3', pct: 74, val: '68.9%', tag: '+4.7%' },
      { week: 'W4', pct: 82, val: '70.4%', tag: '+6.2%' },
      { week: 'W5', pct: 89, val: '71.8%', tag: '+7.6%' },
      { week: 'W6', pct: 94, val: '72.9%', tag: '+8.1%' },
      { week: 'W7', pct: 98, val: '73.6%', tag: 'Record ✓' }
    ],
    svgLinePath: 'M 28 94 L 108 72 L 188 54 L 268 38 L 348 26 L 428 18 L 508 10',
    svgAreaPath: 'M 28 94 L 108 72 L 188 54 L 268 38 L 348 26 L 428 18 L 508 10 L 508 140 L 28 140 Z',
    chatFollowUp: 'Autonomous Action: Exported live margin breakdown dashboard & scheduled weekly Snowflake anomaly alert.'
  }
];

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.1 }
  }
};

const itemReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export default function LandingPage({ onOpenAuth }) {
  const [showBootIntro, setShowBootIntro] = useState(true);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorExpanded, setCursorExpanded] = useState(false);

  const [activeOrbitalIdx, setActiveOrbitalIdx] = useState(0);
  const [selectedGoalIdx, setSelectedGoalIdx] = useState(0);
  const [activeSimStep, setActiveSimStep] = useState(0);
  const [isSimRunning, setIsSimRunning] = useState(true);
  const [v2QueryIdx, setV2QueryIdx] = useState(0);
  const [hoveredV1Card, setHoveredV1Card] = useState(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const fontId = 'azol-meridian-google-fonts';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,600&family=Jost:wght@400;500;600;700&family=Mrs+Saint+Delafield&display=swap';
      document.head.appendChild(link);
    }

    const svgFavicon = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2222%22 fill=%22%2307090D%22/><path d=%22M50 8Q50 50 92 50Q50 50 50 92Q50 50 8 50Q50 50 50 8Z%22 fill=%22%23635BFF%22/><circle cx=%2250%22 cy=%2250%22 r=%2230%22 fill=%22none%22 stroke=%22%23635BFF%22 stroke-width=%222.6%22 opacity=%220.6%22/><circle cx=%2250%22 cy=%2250%22 r=%226%22 fill=%22%2320D9A0%22 stroke=%22%2307090D%22 stroke-width=%222%22/></svg>`;
    let fav = document.querySelector("link[rel~='icon']");
    if (!fav) {
      fav = document.createElement('link');
      fav.rel = 'icon';
      document.head.appendChild(fav);
    }
    fav.href = svgFavicon;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootIntro(false), 1350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const moveCursor = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      const interactive = e.target.closest('button, a, [data-interactive="true"]');
      setCursorExpanded(Boolean(interactive));
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveOrbitalIdx((prev) => (prev + 1) % ORBITAL_AGENTS.length);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isSimRunning) return;
    const t = setInterval(() => {
      setActiveSimStep((prev) => (prev + 1) % 6);
    }, 1450);
    return () => clearInterval(t);
  }, [selectedGoalIdx, isSimRunning]);

  const triggerLiveWorkflowRun = (goalIndex = selectedGoalIdx) => {
    setSelectedGoalIdx(goalIndex);
    setActiveSimStep(0);
    setIsSimRunning(true);
  };

  const currentGoal = LIVE_GOALS[selectedGoalIdx];
  const currentV2 = V2_QUERIES[v2QueryIdx];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      style={{ fontFamily: "'Jost', sans-serif", backgroundColor: '#07090D', color: '#F4F5FA' }}
      className="min-h-screen w-full overflow-x-hidden relative selection:bg-[#635BFF]/30 selection:text-white"
    >
      {/* Top Scroll Progress Indicator */}
      <motion.div
        style={{
          scaleX,
          background: 'linear-gradient(90deg, #635BFF 0%, #61D8FF 50%, #20D9A0 100%)',
          transformOrigin: '0%'
        }}
        className="fixed top-0 left-0 right-0 h-[3px] z-[80]"
      />

      {/* =========================================================
          00. MERIDIAN MOTION SPEC BOOT INTRO
         ========================================================= */}
      <AnimatePresence>
        {showBootIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45 } }}
            onClick={() => setShowBootIntro(false)}
            className="fixed inset-0 z-[100] bg-[#07090D] flex flex-col items-center justify-center cursor-pointer select-none"
          >
            <motion.div
              initial={{ scale: 0.78, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <AzolWordmarkLockup iconSize={64} fontSize="34px" showBadge />
              <p className="text-sm font-mono text-[#9AA0B4] mt-4 tracking-widest uppercase">
                Autonomous Multi-Agent Operating System
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Deep-Space Ambient Environment & Custom Cursor */}
      <AzolAmbientBackground />

      <div
        style={{
          transform: `translate3d(${cursorPos.x - 16}px, ${cursorPos.y - 16}px, 0)`
        }}
        className={`hidden lg:flex fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[90] items-center justify-center transition-transform duration-75 ease-out ${
          cursorExpanded ? 'scale-150 bg-[#635BFF]/15 border border-[#61D8FF]/60' : 'border border-[#635BFF]/40'
        }`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#20D9A0]" />
      </div>

      {/* =========================================================
          01. STICKY GLASSMORPHIC NAVBAR (MERIDIAN LOCKUP)
         ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-[#1E2330] bg-[#07090D]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="cursor-pointer flex items-center"
          >
            <AzolWordmarkLockup iconSize={34} fontSize="21px" showBadge />
          </div>

          <nav className="hidden lg:flex items-center space-x-8 text-[15px] font-medium text-[#9AA0B4]">
            <button onClick={() => scrollTo('why-azol')} className="hover:text-[#F4F5FA] transition-colors">
              Why AZOL
            </button>
            <button onClick={() => scrollTo('watch-azol-work')} className="hover:text-[#F4F5FA] transition-colors">
              Watch It Work
            </button>
            <button onClick={() => scrollTo('v1-capabilities')} className="hover:text-[#F4F5FA] transition-colors">
              V1.0 Workspace
            </button>
            <button onClick={() => scrollTo('use-cases')} className="hover:text-[#F4F5FA] transition-colors">
              Use Cases
            </button>
            <button
              onClick={() => scrollTo('v2-roadmap')}
              className="text-[#7C6CFF] hover:text-[#61D8FF] transition-colors flex items-center font-semibold"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-[#61D8FF]" /> V2.0 Data Intelligence
            </button>
          </nav>

          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2.5 text-[15px] font-medium text-[#9AA0B4] hover:text-[#F4F5FA] transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              style={{ backgroundColor: '#635BFF' }}
              className="group flex items-center px-5 py-2.5 hover:opacity-95 text-white text-[15px] font-semibold rounded-xl shadow-lg shadow-[#635BFF]/25 transition-all hover:-translate-y-0.5"
            >
              <span>Start Building</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* System Status Telemetry Bar */}
        <div className="border-t border-[#1E2330]/80 bg-[#0B0E15]/90 py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-between gap-4 text-xs font-mono text-[#9AA0B4]">
            <div className="flex items-center space-x-6">
              <span className="flex items-center text-[#20D9A0] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#20D9A0] mr-2 animate-pulse" />
                AZOL CORE ONLINE
              </span>
              <span className="hidden sm:inline">● 6 SPECIALIST AGENTS READY</span>
              <span className="hidden md:inline">● FAISS RAG MEMORY CONNECTED</span>
              <span className="hidden lg:inline">● QA VERIFICATION ACTIVE</span>
            </div>
            <span className="text-[#7C6CFF] hidden sm:inline font-medium">
              Architected by MD Adil Muzaffar
            </span>
          </div>
        </div>
      </header>

      {/* =========================================================
          02. HERO SECTION — "YOUR AI WORKFORCE. WORKING AS ONE."
         ========================================================= */}
      <section className="relative pt-14 pb-24 sm:pt-20 sm:pb-28 px-4 sm:px-8 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={sectionReveal}
            className="lg:col-span-6 text-center lg:text-left"
          >
            <motion.div
              variants={itemReveal}
              className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-[#0E1118] border border-[#232838] text-xs font-semibold uppercase tracking-[0.18em] text-[#7C6CFF] mb-6"
            >
              <AzolMeridianMark size={16} variant="m1" color="#635BFF" accentColor="#20D9A0" />
              <span>Autonomous Multi-Agent AI Operating System</span>
            </motion.div>

            <motion.h1
              variants={itemReveal}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-5xl sm:text-6xl lg:text-[74px] font-semibold text-[#F4F5FA] leading-[1.04] tracking-tight"
            >
              Your AI workforce.
              <span
                style={{
                  background: 'linear-gradient(90deg, #635BFF 0%, #61D8FF 52%, #20D9A0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
                className="block mt-1"
              >
                Working as one.
              </span>
            </motion.h1>

            <motion.p
              variants={itemReveal}
              className="mt-6 text-lg sm:text-[19.5px] text-[#9AA0B4] leading-relaxed max-w-2xl mx-auto lg:mx-0"
            >
              Give <strong className="text-[#F4F5FA] font-medium">AZOL AI</strong> a goal in plain language. It plans the
              work, researches, analyzes data, writes code, recalls what it already knows, and checks its own answer — so
              you get <strong className="text-[#20D9A0] font-medium">one verified result</strong> instead of ten browser tabs.
            </motion.p>

            <motion.div
              variants={itemReveal}
              className="mt-9 flex flex-wrap items-center justify-center lg:justify-start gap-4"
            >
              <button
                onClick={() => onOpenAuth('signup')}
                style={{ backgroundColor: '#635BFF' }}
                className="group flex items-center px-8 py-4 text-white text-base font-semibold rounded-2xl shadow-xl shadow-[#635BFF]/30 hover:-translate-y-0.5 transition-all"
              >
                <span>Start Building</span>
                <ArrowRight className="w-5 h-5 ml-2.5 group-hover:translate-x-1.5 transition-transform" />
              </button>

              <button
                onClick={() => scrollTo('watch-azol-work')}
                className="flex items-center px-7 py-4 bg-[#0E1118] hover:bg-[#141824] text-[#F4F5FA] border border-[#232838] hover:border-[#635BFF] text-base font-medium rounded-2xl hover:-translate-y-0.5 transition-all"
              >
                <Play className="w-4 h-4 mr-2.5 text-[#20D9A0] fill-[#20D9A0]/20" />
                <span>Watch AZOL AI Work</span>
              </button>
            </motion.div>

            {/* Execution Pipeline Strip */}
            <motion.div variants={itemReveal} className="mt-11 pt-7 border-t border-[#1E2330]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9AA0B4] mb-3">
                Autonomous End-to-End Execution Pipeline
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs sm:text-sm font-semibold tracking-wider">
                {['PLAN', 'RESEARCH', 'ANALYZE', 'EXECUTE', 'VERIFY'].map((stage, i) => (
                  <React.Fragment key={stage}>
                    <span className="px-3.5 py-1.5 rounded-xl bg-[#0E1118] border border-[#232838] text-[#F4F5FA]">
                      {stage}
                    </span>
                    {i < 4 && <span className="text-[#7C6CFF] font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right 3D AZOL Core + Dead-Centered Meridian Star */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75 }}
            className="lg:col-span-6"
          >
            <Azol3DCore
              activeAgentIndex={activeOrbitalIdx}
              setActiveAgentIndex={setActiveOrbitalIdx}
            />
            <p className="text-center text-sm text-[#9AA0B4] mt-1">
              One Meridian Core, six specialist agents — hover to tilt in 3D or click any node to inspect.
            </p>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          03. WHY AZOL AI EXISTS (FRAGMENTED vs. CONNECTED)
         ========================================================= */}
      <motion.section
        id="why-azol"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
        className="relative z-10 py-24 px-4 sm:px-8 border-t border-[#1E2330] bg-[#0B0E15]/85"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div variants={itemReveal} className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C6CFF]">
              Why AZOL AI Exists
            </span>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-medium text-[#F4F5FA] mt-2 leading-tight"
            >
              AI is powerful. Your workflow still isn't.
            </h2>
            <p className="text-base sm:text-[18.5px] text-[#9AA0B4] mt-4 leading-relaxed">
              Getting one real task done today means jumping between a chatbot, a spreadsheet, ten search tabs, and a
              code editor — copying and checking everything yourself.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Left: Without AZOL */}
            <motion.div
              variants={itemReveal}
              whileHover={{ y: -5 }}
              className="p-8 bg-[#0E1118] border border-[#3a2230] rounded-3xl flex flex-col justify-between transition-all"
            >
              <div>
                <span className="inline-block px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-6">
                  ✕ Today, without AZOL
                </span>

                <div className="divide-y divide-[#1E2330]">
                  {[
                    ['Docs', 'You paste files into a chatbot, then copy the answer somewhere else.'],
                    ['Data', 'You open Excel or SQL yourself and dig manually for the numbers.'],
                    ['Web', 'You open ten browser tabs and decide which source to trust.'],
                    ['Check', 'You are the one fact-checking and connecting the final answer.']
                  ].map(([tag, text]) => (
                    <div key={tag} className="py-4 flex items-start gap-4 text-base sm:text-[17px]">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-300 min-w-[68px] pt-1">
                        {tag}
                      </span>
                      <span className="text-[#9AA0B4]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-rose-950/20 border border-rose-500/25 rounded-2xl text-center text-sm text-rose-300 font-medium">
                ⚠️ Human manually coordinates and verifies every step
              </div>
            </motion.div>

            {/* Right: With AZOL AI */}
            <motion.div
              variants={itemReveal}
              whileHover={{ y: -5 }}
              style={{ background: 'linear-gradient(160deg, #141a2c 0%, #0E1118 100%)' }}
              className="p-8 border border-[#635BFF] rounded-3xl flex flex-col justify-between shadow-2xl transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#20D9A0]/15 border border-[#20D9A0]/35 text-[#20D9A0] text-xs font-semibold">
                    ✓ With AZOL AI
                  </span>
                  <AzolWordmarkLockup iconSize={24} fontSize="15px" />
                </div>

                <div className="divide-y divide-[#232838]">
                  {[
                    ['Docs', 'A research agent reads, indexes, and cites your files automatically.'],
                    ['Data', 'A data-analyst agent finds the exact number and explains the trend.'],
                    ['Web', 'A live research agent checks current web sources for you.'],
                    ['Check', 'A QA reviewer agent verifies the result before you ever see it.']
                  ].map(([tag, text]) => (
                    <div key={tag} className="py-4 flex items-start gap-4 text-base sm:text-[17px]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#20D9A0] min-w-[68px] pt-1">
                        {tag}
                      </span>
                      <span className="text-[#F4F5FA]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#20D9A0]/12 border border-[#20D9A0]/35 rounded-2xl text-center text-sm text-[#20D9A0] font-semibold flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                One Connected Workflow → Verified Result & Downloadable Artifacts
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* =========================================================
          04. WATCH AZOL AI THINK & WORK (LIVE EXECUTION CONSOLE)
         ========================================================= */}
      <motion.section
        id="watch-azol-work"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
        className="relative z-10 py-24 px-4 sm:px-8 border-t border-[#1E2330]"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemReveal} className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C6CFF]">
              Show, Don't Explain
            </span>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-medium text-[#F4F5FA] mt-2"
            >
              Watch AZOL AI think and work
            </h2>
            <p className="text-base sm:text-[18.5px] text-[#9AA0B4] mt-3">
              Pick a real goal below or click <strong className="text-[#F4F5FA]">Run This Workflow</strong> to watch five
              specialist agents hand off the work, end to end.
            </p>
          </motion.div>

          {/* Scenario Tabs */}
          <motion.div variants={itemReveal} className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {LIVE_GOALS.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => triggerLiveWorkflowRun(idx)}
                style={{
                  backgroundColor: selectedGoalIdx === idx ? '#635BFF' : '#0E1118',
                  borderColor: selectedGoalIdx === idx ? '#635BFF' : '#232838'
                }}
                className="px-5 py-3 rounded-xl text-[15px] font-semibold transition-all border text-[#F4F5FA]"
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => triggerLiveWorkflowRun(selectedGoalIdx)}
              className="px-5 py-3 rounded-xl text-[15px] font-semibold bg-[#20D9A0]/15 hover:bg-[#20D9A0]/25 text-[#20D9A0] border border-[#20D9A0]/40 flex items-center transition-all"
            >
              <Play className="w-4 h-4 mr-2 fill-[#20D9A0]" />
              Run This Workflow
            </button>
          </motion.div>

          {/* Console Window */}
          <motion.div
            variants={itemReveal}
            className="bg-[#0B0E15] border border-[#232838] rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 bg-[#111522] border-b border-[#232838] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 text-sm sm:text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-[#20D9A0] animate-ping" />
                <span className="text-[#9AA0B4] font-mono">GOAL:</span>
                <strong className="text-[#7C6CFF] font-semibold">"{currentGoal.goal}"</strong>
              </div>
              <span className="text-xs font-mono text-[#20D9A0] uppercase tracking-wider">
                Live Agent Execution
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#232838]">
              <div className="lg:col-span-6 p-6 sm:p-7 space-y-3">
                {currentGoal.steps.map((st, idx) => {
                  const isCurrent = idx === activeSimStep;
                  const isDone = idx < activeSimStep || activeSimStep === 5;

                  return (
                    <div
                      key={st.num}
                      onClick={() => setActiveSimStep(idx)}
                      style={{
                        borderColor: isCurrent ? '#635BFF' : isDone ? 'rgba(32,217,160,0.35)' : '#1E2330',
                        backgroundColor: isCurrent
                          ? 'rgba(99,91,255,0.10)'
                          : isDone
                          ? 'rgba(32,217,160,0.06)'
                          : '#0E1118'
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        !isCurrent && !isDone ? 'opacity-60 hover:opacity-100' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                        <span
                          style={{
                            backgroundColor: isDone ? 'rgba(32,217,160,0.2)' : isCurrent ? '#635BFF' : '#1a1f2e',
                            color: isDone ? '#20D9A0' : '#F4F5FA'
                          }}
                          className="w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0"
                        >
                          {isDone ? '✓' : st.num}
                        </span>
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-[#F4F5FA]">{st.agent}</p>
                          <p className="text-sm text-[#9AA0B4] truncate">{st.action}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[#9AA0B4] shrink-0">{st.time}</span>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between bg-[#07090D]/60">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3.5 py-1 rounded-full bg-[#20D9A0]/15 border border-[#20D9A0]/35 text-[#20D9A0] text-xs font-semibold">
                      ✓ Verified Result
                    </span>
                    <span className="text-xs font-mono text-[#9AA0B4]">QA Reviewer Approved</span>
                  </div>

                  <h3
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl sm:text-3xl font-semibold text-[#F4F5FA] mb-1"
                  >
                    {currentGoal.resultTitle}
                  </h3>
                  <p className="text-sm text-[#7C6CFF] font-medium mb-4">{currentGoal.resultSummary}</p>

                  <pre className="p-5 bg-[#0E1118] border border-[#232838] rounded-2xl text-sm font-mono text-[#dbe0f0] whitespace-pre-wrap leading-relaxed">
                    {currentGoal.resultBody}
                  </pre>
                </div>

                <div className="mt-6 pt-4 border-t border-[#1E2330] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-[#9AA0B4]">Want to run your own goal inside AZOL AI?</span>
                  <button
                    onClick={() => onOpenAuth('signup')}
                    style={{ backgroundColor: '#635BFF' }}
                    className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-all flex items-center"
                  >
                    Try It Live <ArrowRight className="w-4 h-4 ml-1.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* =========================================================
          05. AZOL AI V1.0 — 7 CAPABILITIES
         ========================================================= */}
      <motion.section
        id="v1-capabilities"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionReveal}
        className="relative z-10 py-24 px-4 sm:px-8 border-t border-[#1E2330] bg-[#0B0E15]/85"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div variants={itemReveal} className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-3.5 py-1 rounded-full bg-[#20D9A0]/12 border border-[#20D9A0]/35 text-[#20D9A0] text-xs font-semibold">
              Live & production-ready today
            </span>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-medium text-[#F4F5FA] mt-3"
            >
              AZOL AI V1.0 — the autonomous workspace
            </h2>
            <p className="text-base sm:text-[18.5px] text-[#9AA0B4] mt-2">
              Seven capabilities, working together instead of as separate tools.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {V1_MODULES.map((mod, i) => {
              const isHovered = hoveredV1Card === mod.title;
              return (
                <motion.div
                  key={mod.title}
                  variants={itemReveal}
                  onMouseEnter={() => setHoveredV1Card(mod.title)}
                  onMouseLeave={() => setHoveredV1Card(null)}
                  whileHover={{ y: -6 }}
                  className={`p-7 bg-[#0E1118] border border-[#1E2330] hover:border-[#635BFF] rounded-3xl flex flex-col justify-between transition-all group ${
                    i === 0 ? 'lg:col-span-2 bg-gradient-to-br from-[#141a2c] to-[#0E1118]' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#141826] border border-[#232838] grid place-items-center text-2xl">
                        {mod.icon}
                      </div>
                      <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#141826] text-[#7C6CFF] border border-[#232838]">
                        {mod.techLayer}
                      </span>
                    </div>

                    <h3
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      className="text-2xl sm:text-[26px] font-semibold text-[#F4F5FA]"
                    >
                      {mod.title}
                    </h3>
                    <div className="text-sm font-semibold text-[#20D9A0] mt-0.5 mb-2.5">{mod.subtitle}</div>
                    <p className="text-base text-[#9AA0B4] leading-relaxed">{mod.desc}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#1E2330] flex flex-wrap items-center gap-1.5 text-xs">
                    {mod.pipeline.map((step, sIdx) => (
                      <React.Fragment key={step}>
                        <span
                          className={`px-2.5 py-1 rounded-lg border transition-colors ${
                            isHovered
                              ? 'bg-[#635BFF]/20 border-[#635BFF] text-white font-medium'
                              : 'bg-[#07090D] border-[#1E2330] text-[#9AA0B4]'
                          }`}
                        >
                          {step}
                        </span>
                        {sIdx < mod.pipeline.length - 1 && <span className="text-[#20D9A0] font-bold">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* =========================================================
          06. BUILT DIFFERENTLY ("NOT JUST A CHATBOT. A COORDINATED TEAM.")
         ========================================================= */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
        className="relative z-10 py-24 px-4 sm:px-8 border-t border-[#1E2330]"
      >
        <div className="max-w-5xl mx-auto">
          <motion.div variants={itemReveal} className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C6CFF]">
              Built Differently
            </span>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-medium text-[#F4F5FA] mt-2"
            >
              Not just a chatbot. A coordinated team.
            </h2>
          </motion.div>

          <motion.div
            variants={itemReveal}
            className="overflow-x-auto rounded-3xl border border-[#232838] bg-[#0E1118] shadow-2xl"
          >
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#111522] border-b border-[#232838] text-xs uppercase tracking-wider text-[#9AA0B4]">
                  <th className="py-4 px-6">Dimension</th>
                  <th className="py-4 px-6">Traditional AI Chatbot</th>
                  <th className="py-4 px-6 text-[#61D8FF]">AZOL AI Operating System</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2330] text-base sm:text-[17px]">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="hover:bg-[#141826]/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#F4F5FA]">{row.label}</td>
                    <td className="py-4 px-6 text-[#9AA0B4]">{row.bad}</td>
                    <td className="py-4 px-6 text-[#20D9A0] font-semibold">✓ {row.ok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </motion.section>

      {/* =========================================================
          07. PRACTICAL APPLICATIONS ("WHAT CAN AZOL AI ACTUALLY DO?")
         ========================================================= */}
      <motion.section
        id="use-cases"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionReveal}
        className="relative z-10 py-24 px-4 sm:px-8 border-t border-[#1E2330] bg-[#0B0E15]/85"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div variants={itemReveal} className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C6CFF]">
              Practical Applications
            </span>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-medium text-[#F4F5FA] mt-2"
            >
              What can AZOL AI actually do?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_CASES.map((uc) => (
              <motion.div
                key={uc.category}
                variants={itemReveal}
                whileHover={{ y: -6 }}
                onClick={() => onOpenAuth('signup')}
                className="p-7 bg-[#0E1118] border border-[#1E2330] hover:border-[#635BFF] rounded-3xl cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7C6CFF]">{uc.category}</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#F4F5FA] mt-3 mb-2.5 group-hover:text-[#61D8FF] transition-colors">
                    {uc.prompt}
                  </h3>
                  <p className="text-base text-[#9AA0B4] leading-relaxed">{uc.outcome}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1E2330] flex items-center justify-between text-sm font-semibold text-[#20D9A0]">
                  <span>Run this workflow</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* =========================================================
          08. COMING IN V2.0 — AUTONOMOUS DATA INTELLIGENCE & LIVE BI DASHBOARDS
         ========================================================= */}
      <motion.section
        id="v2-roadmap"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionReveal}
        className="relative z-10 py-24 px-4 sm:px-8 border-t border-[#1E2330]"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div variants={itemReveal} className="text-center max-w-4xl mx-auto mb-14">
            <span className="px-4 py-1.5 rounded-full bg-[#7C6CFF]/15 border border-[#7C6CFF]/35 text-[#7C6CFF] text-xs font-semibold">
              🚀 Coming in V2.0
            </span>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-4xl sm:text-5xl lg:text-[58px] font-medium text-[#F4F5FA] mt-4 leading-tight"
            >
              From AI workforce →{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #7C6CFF 0%, #61D8FF 50%, #20D9A0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                autonomous data intelligence
              </span>
            </h2>
            <p className="text-base sm:text-[19px] text-[#9AA0B4] mt-4 leading-relaxed">
              V2.0 connects AZOL directly to your live databases —{' '}
              <strong className="text-[#F4F5FA] font-semibold">
                SQL, PostgreSQL, MySQL, MongoDB, Snowflake and more
              </strong>{' '}
              — so it can query, analyze, and turn raw data into{' '}
              <strong className="text-[#20D9A0] font-semibold">
                interactive, PowerBI-and-Tableau-grade dashboards
              </strong>{' '}
              entirely on its own, automating the data analyst's job end to end.
            </p>
          </motion.div>

          {/* V2.0 Visual Pipeline */}
          <motion.div
            variants={itemReveal}
            className="flex flex-wrap items-center justify-center gap-2.5 p-5 bg-[#0E1118] border border-[#232838] rounded-2xl mb-10 text-sm font-semibold"
          >
            {['🗄️ PostgreSQL', '🗄️ MySQL', '🗄️ MongoDB', '🗄️ Snowflake', '🗄️ Excel / CSV'].map((db) => (
              <span key={db} className="px-3.5 py-2 rounded-xl bg-[#111522] border border-[#232838] text-[#F4F5FA]">
                {db}
              </span>
            ))}
            <span className="text-[#20D9A0] px-1">➔</span>
            <span className="px-4 py-2 rounded-xl bg-[#635BFF]/20 border border-[#635BFF] text-white">
              🧠 AZOL Data Analyst Agent
            </span>
            <span className="text-[#20D9A0] px-1">➔</span>
            <span className="px-4 py-2 rounded-xl bg-[#20D9A0]/15 border border-[#20D9A0] text-[#20D9A0]">
              📊 Live Interactive BI Dashboard
            </span>
          </motion.div>

          {/* Interactive V2.0 BI Dashboard Simulator (With Live Hybrid Chart + Analyst Chat) */}
          <motion.div
            variants={itemReveal}
            className="bg-[#0E1118] border border-[#232838] rounded-3xl p-6 sm:p-9 shadow-2xl mb-16"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-[#1E2330]">
              <div>
                <span className="text-xs font-mono uppercase text-[#7C6CFF] font-semibold block">
                  V2.0 Interactive Preview · Autonomous BI Dashboard Engine
                </span>
                <h3
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl sm:text-3xl font-semibold text-[#F4F5FA] mt-1"
                >
                  From Raw Database → Insight → Interactive Dashboard → Decision
                </h3>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {V2_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setV2QueryIdx(i)}
                    style={{
                      backgroundColor: v2QueryIdx === i ? '#635BFF' : '#111522',
                      borderColor: v2QueryIdx === i ? '#635BFF' : '#232838'
                    }}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#F4F5FA] border transition-all"
                  >
                    Scenario #{i + 1}: {q.question.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
              {/* Left Column: NL Query + Generated SQL + AI Root-Cause */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="p-5 bg-[#111522] border border-[#232838] rounded-2xl">
                  <span className="text-xs font-mono text-[#9AA0B4] uppercase block mb-1">
                    Natural Language Question
                  </span>
                  <p className="text-base sm:text-lg font-semibold text-[#F4F5FA]">{currentV2.question}</p>
                </div>

                <div className="p-5 bg-[#111522] border border-[#232838] rounded-2xl font-mono text-xs sm:text-sm">
                  <span className="text-xs text-[#20D9A0] uppercase font-bold block mb-1.5">
                    Connected Source: {currentV2.dbSource}
                  </span>
                  <code className="text-[#61D8FF] block leading-relaxed">{currentV2.sqlGenerated}</code>
                </div>

                <div className="p-5 bg-[#635BFF]/10 border border-[#635BFF]/35 rounded-2xl">
                  <span className="text-xs font-mono text-[#7C6CFF] uppercase font-bold block mb-1">
                    AI Root-Cause Explanation
                  </span>
                  <p className="text-base text-[#F4F5FA] leading-relaxed">{currentV2.insight}</p>
                </div>
              </div>

              {/* Right Column: Live KPI Cards + Hybrid Bar/Area Chart + AI Analyst Chat Bar */}
              <div className="lg:col-span-7 p-6 bg-[#07090D] border border-[#232838] rounded-2xl flex flex-col justify-between space-y-5">
                {/* 3 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {currentV2.kpis.map((k) => (
                    <div key={k.label} className="p-4 bg-[#0E1118] border border-[#1E2330] rounded-xl">
                      <span className="text-xs font-mono text-[#9AA0B4] block">{k.label}</span>
                      <span className="text-2xl font-bold text-[#F4F5FA] mt-1 block">{k.val}</span>
                      <span className={`text-xs font-mono font-semibold ${k.up ? 'text-[#20D9A0]' : 'text-amber-400'}`}>
                        {k.delta}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Hybrid SVG Trend Curve + Interactive Bar Chart */}
                <div className="p-5 bg-[#0E1118] border border-[#1E2330] rounded-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-mono text-[#9AA0B4] mb-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-[#61D8FF]" />
                      <span className="text-[#F4F5FA] font-semibold">
                        Auto-Generated Cohort & Margin Visualization
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center text-[#61D8FF]">
                        <span className="w-2.5 h-0.5 bg-[#61D8FF] mr-1.5" /> AI Forecast Curve
                      </span>
                      <span className="text-[#20D9A0] font-semibold">● Live DB Sync</span>
                    </div>
                  </div>

                  {/* Chart Canvas with Horizontal Grid Lines, SVG Curve Overlay & Explicit Height Bars */}
                  <div className="relative h-44 w-full pt-4 pb-6 px-2">
                    {/* Subtle Horizontal Grid Lines & Target Threshold */}
                    <div className="absolute inset-x-2 top-4 bottom-6 flex flex-col justify-between pointer-events-none">
                      <div className="border-b border-dashed border-[#232838]/80 w-full flex justify-end">
                        <span className="text-[10px] font-mono text-[#20D9A0] -mt-4 bg-[#0E1118] px-1.5">
                          Target Threshold
                        </span>
                      </div>
                      <div className="border-b border-[#1E2330]/70 w-full" />
                      <div className="border-b border-[#1E2330]/70 w-full" />
                      <div className="border-b border-[#1E2330] w-full" />
                    </div>

                    {/* SVG Area & Smooth Trend Line Overlay */}
                    <svg
                      viewBox="0 0 536 140"
                      preserveAspectRatio="none"
                      className="absolute inset-x-2 top-4 bottom-6 w-[calc(100%-16px)] h-[calc(100%-40px)] pointer-events-none z-10 overflow-visible"
                    >
                      <defs>
                        <linearGradient id="v2AreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#61D8FF" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#635BFF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={currentV2.svgAreaPath} fill="url(#v2AreaGrad)" />
                      <motion.path
                        key={`line-${v2QueryIdx}`}
                        d={currentV2.svgLinePath}
                        fill="none"
                        stroke="#61D8FF"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    </svg>

                    {/* 7 Interactive Bar Columns with Explicit h-full justify-end */}
                    <div className="relative z-20 h-full w-full flex items-end justify-between gap-3 sm:gap-4">
                      {currentV2.bars.map((barObj, idx) => {
                        const isHovered = hoveredBarIdx === idx;
                        return (
                          <div
                            key={barObj.week}
                            onMouseEnter={() => setHoveredBarIdx(idx)}
                            onMouseLeave={() => setHoveredBarIdx(null)}
                            className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer"
                          >
                            {/* Top Value Label */}
                            <span
                              className={`text-[10px] sm:text-[11px] font-mono mb-1.5 transition-colors ${
                                isHovered || idx === 6 ? 'text-[#20D9A0] font-bold' : 'text-[#9AA0B4]'
                              }`}
                            >
                              {barObj.val}
                            </span>

                            {/* Animated Bar */}
                            <div className="w-full max-w-[42px] h-[108px] flex items-end bg-[#141826]/60 rounded-t-lg p-0.5">
                              <motion.div
                                key={`${v2QueryIdx}-${idx}`}
                                initial={{ height: '10%' }}
                                animate={{ height: `${barObj.pct}%` }}
                                transition={{ duration: 0.55, delay: idx * 0.05, ease: 'easeOut' }}
                                style={{
                                  background:
                                    idx === 2 && v2QueryIdx === 0
                                      ? 'linear-gradient(180deg, #fb7185 0%, #9f1239 100%)'
                                      : 'linear-gradient(180deg, #20D9A0 0%, #61D8FF 45%, #635BFF 100%)'
                                }}
                                className="w-full rounded-t-md shadow-[0_0_15px_rgba(99,91,255,0.25)] group-hover:brightness-125 transition-all"
                              />
                            </div>

                            {/* Week Label */}
                            <span className="text-xs font-mono text-[#9AA0B4] mt-2">{barObj.week}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live AI Analyst Follow-Up Chat Strip */}
                <div className="px-4 py-3 bg-[#111522] border border-[#232838] rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 text-xs sm:text-sm">
                    <span className="w-6 h-6 rounded-lg bg-[#635BFF]/20 border border-[#635BFF]/40 flex items-center justify-center text-[#61D8FF] font-mono text-xs font-bold shrink-0">
                      AI
                    </span>
                    <span className="text-[#F4F5FA] font-medium">{currentV2.chatFollowUp}</span>
                  </div>
                  <button
                    onClick={() => setV2QueryIdx((prev) => (prev + 1) % V2_QUERIES.length)}
                    className="text-xs font-mono text-[#61D8FF] hover:text-[#20D9A0] flex items-center shrink-0 transition-colors"
                  >
                    <span>Switch Query</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* The AZOL Evolution (V1.0 -> V2.0 -> V3.0) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemReveal} className="p-7 bg-[#0E1118] border border-[#20D9A0]/50 rounded-3xl">
              <span className="px-3 py-1 rounded-full bg-[#20D9A0]/15 text-[#20D9A0] text-xs font-semibold">
                V1.0 · Live now
              </span>
              <h3
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-2xl font-semibold text-[#F4F5FA] mt-4"
              >
                AI Workforce
              </h3>
              <ul className="mt-4 space-y-2.5 text-base text-[#F4F5FA]">
                <li>✓ Multi-agent orchestration</li>
                <li>✓ RAG + persistent memory</li>
                <li>✓ Live web research</li>
                <li>✓ Coding & data analysis</li>
                <li>✓ QA source verification</li>
              </ul>
            </motion.div>

            <motion.div variants={itemReveal} className="p-7 bg-[#0E1118] border border-[#7C6CFF]/60 rounded-3xl">
              <span className="px-3 py-1 rounded-full bg-[#7C6CFF]/15 text-[#7C6CFF] text-xs font-semibold">
                V2.0 · Next
              </span>
              <h3
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-2xl font-semibold text-[#F4F5FA] mt-4"
              >
                Data Intelligence
              </h3>
              <ul className="mt-4 space-y-2.5 text-base text-[#F4F5FA]">
                <li>→ SQL + MongoDB connectors</li>
                <li>→ Autonomous data-analyst agent</li>
                <li>→ Live data pipelines</li>
                <li>→ Auto-generated BI dashboards</li>
                <li>→ Automated anomaly detection</li>
              </ul>
            </motion.div>

            <motion.div variants={itemReveal} className="p-7 bg-[#0E1118] border border-[#232838] rounded-3xl">
              <span className="px-3 py-1 rounded-full bg-[#1a1f2e] text-[#9AA0B4] text-xs font-semibold">
                V3.0 · Vision
              </span>
              <h3
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-2xl font-semibold text-[#F4F5FA] mt-4"
              >
                Autonomous Business OS
              </h3>
              <ul className="mt-4 space-y-2.5 text-base text-[#9AA0B4]">
                <li>• Agents + data + knowledge, unified</li>
                <li>• Cross-department workflows</li>
                <li>• Continuous decision intelligence</li>
                <li>• Autonomous action execution</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* =========================================================
          09. FINAL CTA & OFFICIAL CREATOR SIGNATURE BLOCK
         ========================================================= */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
        className="relative z-10 py-24 px-4 sm:px-8 border-t border-[#1E2330] bg-[#0B0E15]/90"
      >
        <motion.div
          variants={itemReveal}
          style={{ background: 'linear-gradient(160deg, #151a2b 0%, #0d1018 100%)' }}
          className="max-w-4xl mx-auto p-10 sm:p-14 rounded-3xl border border-[#635BFF] text-center shadow-2xl mb-20"
        >
          <div className="flex justify-center mb-4">
            <AzolMeridianMark size={58} variant="m1" color="#635BFF" accentColor="#20D9A0" />
          </div>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            className="text-4xl sm:text-5xl lg:text-[56px] font-medium text-[#F4F5FA]"
          >
            Give AZOL a goal.
          </h2>
          <p className="text-base sm:text-lg text-[#9AA0B4] mt-3 max-w-xl mx-auto leading-relaxed">
            Experience the autonomous multi-agent operating system, backed by vector memory, live research, and verified execution.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onOpenAuth('signup')}
              style={{ backgroundColor: '#635BFF' }}
              className="group px-8 py-4 text-white text-base font-semibold rounded-2xl shadow-xl shadow-[#635BFF]/30 hover:-translate-y-0.5 transition-all flex items-center"
            >
              <span>Start Building with AZOL AI</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-8 py-4 bg-transparent hover:bg-[#141826] text-[#F4F5FA] border border-[#232838] text-base font-semibold rounded-2xl transition-all"
            >
              Sign In
            </button>
          </div>
        </motion.div>

        {/* Official Footer + Meridian Creator Signature Card */}
        <footer className="max-w-7xl mx-auto pt-8 border-t border-[#232838]">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <AzolWordmarkLockup iconSize={38} fontSize="22px" />
              <div className="sm:pl-4 sm:border-l border-[#232838]">
                <div className="text-sm font-medium text-[#F4F5FA]">
                  Autonomous Multi-Agent Operating System
                </div>
                <div className="text-xs font-mono text-[#9AA0B4] mt-0.5">
                  FastAPI · LangGraph · FAISS · PostgreSQL · React
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 px-7 py-5 bg-[#0E1118] border border-[#232838] rounded-2xl shadow-xl">
              <svg className="w-16 h-16 shrink-0 hidden sm:block" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="46" stroke="#635BFF" strokeWidth="2" />
                <circle cx="50" cy="50" r="40" stroke="#635BFF" strokeWidth="0.8" opacity="0.5" />
                <text
                  x="50"
                  y="61"
                  textAnchor="middle"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontWeight="600"
                  fontSize="34"
                  fill="#F4F5FA"
                  letterSpacing="1"
                >
                  AM
                </text>
                <circle cx="50" cy="4" r="3.5" fill="#20D9A0" />
              </svg>

              <div className="text-center sm:text-right">
                <small className="block text-[11px] tracking-[0.2em] uppercase text-[#7C6CFF] font-medium">
                  IDEALIZED, ARCHITECTED & BUILT BY
                </small>
                <h3
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-semibold text-[#F4F5FA] mt-1"
                >
                  MD Adil Muzaffar
                </h3>
                <p className="text-[13px] text-[#20D9A0] font-medium">
                  Founder • AI/ML & Agentic Systems Engineer
                </p>
                <nav className="mt-2.5 flex items-center justify-center sm:justify-end gap-4 text-[13px]">
                  <a
                    href="https://md-adil-muzaffar-portfolia.lovable.app"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#61D8FF] hover:underline"
                  >
                    Portfolio ↗
                  </a>
                  <a
                    href="https://github.com/mdadilmuzaffar24"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#61D8FF] hover:underline"
                  >
                    GitHub ↗
                  </a>
                  <a
                    href="https://www.linkedin.com/in/md-adil-muzaffar"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#61D8FF] hover:underline"
                  >
                    LinkedIn ↗
                  </a>
                </nav>
              </div>

              <div className="sm:border-l border-[#232838] sm:pl-6 text-center">
                <div
                  style={{
                    fontFamily: "'Mrs Saint Delafield', cursive",
                    fontSize: '52px',
                    lineHeight: 0.9,
                    color: '#F4F5FA'
                  }}
                >
                  Adil Muzaffar
                </div>
                <svg className="block w-[170px] h-[16px] mx-auto -mt-0.5 mb-1" viewBox="0 0 170 16" fill="none">
                  <defs>
                    <linearGradient id="azolSigGrad">
                      <stop stopColor="#635BFF" />
                      <stop offset="1" stopColor="#61D8FF" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M2 11C40 2 90 2 140 8s26 3 28 1"
                    stroke="url(#azolSigGrad)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.6, delay: 0.25, ease: 'easeOut' }}
                  />
                </svg>
                <small className="block text-[10px] tracking-[0.2em] text-[#5A6078] uppercase">
                  CREATOR SIGNATURE
                </small>
              </div>
            </div>
          </div>
        </footer>
      </motion.section>
    </div>
  );
}