import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Bell } from 'lucide-react'
import { GoogleOAuthProvider } from '@react-oauth/google';

// Import all sub-components
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Documents from './components/Documents'
import Projects from './components/Projects'
import AgentCenter from './components/AgentCenter'
import Analytics from './components/Analytics'
import Settings from './components/Settings'
import ChatInterface from './components/ChatInterface'
import AuthModal from './components/AuthModal'

function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [currentUser, setCurrentUser] = useState(null)
  
  // Controls which SaaS module is currently active
  const [activeModule, setActiveModule] = useState('dashboard')

  // Shared state for the visualizer/chat
  const [activeAgent, setActiveAgent] = useState('Supervisor')
  const [systemStatus, setSystemStatus] = useState('idle')

  // Fetch backend health and User Profile if logged in
  const [healthStatus, setHealthStatus] = useState('Checking backend system...')

  useEffect(() => {
    if (token) {
      // 1. Check Backend Health
      axios.get('/api/v1/health')
        .then((response) => {
          if (response.data.status === 'healthy') {
            setHealthStatus(`✅ Full-Stack Operational | Database: ${response.data.database}`)
          }
        })
        .catch(() => {
          setHealthStatus('❌ Error connecting to backend control plane.')
        })

      // 2. Fetch Logged-in User Profile
      axios.get('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then((response) => setCurrentUser(response.data))
      .catch(() => {
        // If the token is invalid or expired, clear it out
        localStorage.removeItem('token')
        setToken('')
        setCurrentUser(null)
      })
    }
  }, [token])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken('')
    setCurrentUser(null)
    setActiveModule('dashboard')
  }

  // ==========================================
  // STATE 1: UN-AUTHENTICATED (AUTH MODAL)
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0d0f11] flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Replace YOUR_CLIENT_ID with the exact ID you copied from Google Cloud */}
        <GoogleOAuthProvider clientId="756265510472-qq1qgetk24h0bhr25o8ropdkqmkdfca6.apps.googleusercontent.com">
          <AuthModal onLoginSuccess={() => setToken(localStorage.getItem('token'))} />
        </GoogleOAuthProvider>
      </div>
    )
  }

  // ==========================================
  // STATE 2: AUTHENTICATED SAAS PLATFORM
  // ==========================================
  return (
    <div className="flex h-screen w-full bg-[#0d0e12] overflow-hidden selection:bg-indigo-500/30">
      
      {/* Left Navigation Sidebar */}
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} user={currentUser} />

      {/* Main Application Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0e12] relative overflow-hidden">
        
        {/* Global Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50 bg-[#131418] z-10 shrink-0">
          <div className="flex-1 max-w-2xl relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search projects, documents, or agents... (Ctrl+K)" 
              className="w-full bg-[#212327] border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
            />
          </div>
          
          <div className="flex items-center space-x-4 pl-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800/50">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            </button>
            <button 
              onClick={handleLogout}
              className="px-4 py-1.5 text-xs font-semibold tracking-wide bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors border border-slate-700"
            >
              Disconnect
            </button>
          </div>
        </header>

        {/* Dynamic Module Content */}
        <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
          
          {/* Dashboard Module */}
          {activeModule === 'dashboard' && (
            <div className="h-full w-full overflow-y-auto p-6">
              <Dashboard setActiveModule={setActiveModule} user={currentUser} />
            </div>
          )}

          {/* Core Modules (Padding applied individually) */}
          {activeModule === 'projects' && <div className="h-full w-full overflow-y-auto p-6"><Projects /></div>}
          {activeModule === 'documents' && <div className="h-full w-full overflow-y-auto p-6"><Documents /></div>}
          {activeModule === 'agents' && <div className="h-full w-full overflow-y-auto p-6"><AgentCenter /></div>}
          {activeModule === 'analytics' && <div className="h-full w-full overflow-y-auto p-6"><Analytics /></div>}
          {activeModule === 'settings' && <div className="h-full w-full overflow-y-auto p-6"><Settings user={currentUser} /></div>}

          {/* Module: AI Workspace (Zero padding so it snaps edge-to-edge) */}
          {activeModule === 'workspace' && (
            <div className="flex-1 h-full w-full animate-in fade-in duration-500">
              <ChatInterface 
                setActiveAgent={setActiveAgent} 
                setSystemStatus={setSystemStatus}
                user={currentUser} 
              />
            </div>
          )}
          
        </main>
      </div>
    </div>
  )
}

export default App