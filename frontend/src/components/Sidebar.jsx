import { 
  LayoutDashboard, 
  MessageSquare, 
  FolderKanban, 
  Files, 
  Cpu, 
  BarChart3, 
  Settings 
} from 'lucide-react'

export default function Sidebar({ activeModule, setActiveModule, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workspace', label: 'AI Workspace', icon: MessageSquare },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'documents', label: 'Documents', icon: Files },
    { id: 'agents', label: 'Agent Center', icon: Cpu },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="w-64 h-screen border-r border-slate-800/50 bg-slate-950/50 backdrop-blur-xl flex flex-col hidden md:flex">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold tracking-tight text-slate-100">Enterprise AI OS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Main Menu
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeModule === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Dynamic User Footer */}
      <div className="p-4 border-t border-slate-800/50">
        <div className="flex items-center px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-semibold text-sm mr-3">
            {user?.email?.charAt(0).toUpperCase() || 'OP'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">System Operator</p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email || 'Authenticating...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}