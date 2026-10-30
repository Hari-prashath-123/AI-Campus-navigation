import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Settings, Users, LibraryBig, Type, Building2, ChevronRight, Bot, ChevronLeft, Menu, Network } from 'lucide-react';
import React, { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Network,         label: 'Organizations', path: '/admin/organizations' },
  { icon: Building2,       label: 'Campuses', path: '/admin/campuses' },
  { icon: Map,             label: 'Map Editor', path: '/admin/map' },
  { icon: Type,            label: 'Object Types', path: '/admin/object-types' },
  { icon: Users,           label: 'Access Control', path: '/admin/access' },
  { icon: Bot,             label: 'AI Assistant', path: '/admin/ai-assistant' },
  { icon: LibraryBig,      label: 'Assets', path: '/admin/assets' },
  { icon: Settings,        label: 'Settings', path: '/admin/settings' },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-inter">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col h-full shadow-sm shrink-0 transition-all duration-300 relative`}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-6 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-full p-1 shadow-sm z-20 transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <Menu size={14} />}
        </button>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold font-outfit text-lg shadow-sm shrink-0">
            O
          </div>
          {isSidebarOpen && (
            <div className="whitespace-nowrap overflow-hidden opacity-100 transition-opacity duration-300">
              <h1 className="font-outfit font-bold text-lg tracking-tight text-slate-900 leading-none">OmniCampus</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none mt-0.5">Admin Platform</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${!isSidebarOpen && 'justify-center'} ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={18} className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} shrink-0`} />
                {isSidebarOpen && (
                  <>
                    <span className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                    {isActive && <ChevronRight size={14} className="text-blue-400 opacity-60 shrink-0" />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-3 border-t border-slate-100">
          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-semibold text-sm shadow-sm shrink-0">
              AD
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800 truncate">Admin User</span>
                <span className="text-xs text-slate-400 truncate">admin@omnicampus.app</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col h-full min-w-0">
        <Outlet />
      </main>
    </div>
  );
};
