import React, { useState } from 'react';
import { Shield, Brain, Activity, LogOut, HeartPulse, User } from 'lucide-react';
import Dashboard from './pages/Dashboard';

// Define TypeScript interfaces for Patient longitudinal files
export interface PatientHistory {
  date: string;
  risk: number;
  latency: number;
  accuracy: number;
  drift: number;
}

export interface SHAPContribution {
  feature: string;
  impact: number;
  description: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  cohort: string;
  riskScore: number;
  confidence: number;
  mmse: number;
  updrs: number | null;
  status: string;
  drift: number;
  lastSession: string;
  history: PatientHistory[];
  shap: SHAPContribution[];
}

export type Role = 'physician' | 'researcher' | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'landing' | 'assessment' | 'research'>('dashboard');
  const [role, setRole] = useState<Role>('physician');
  const [user, setUser] = useState<{ username: string; role: Role } | null>({
    username: 'dr.kishan.shetty',
    role: 'physician'
  });

  const handleLogout = () => {
    setUser(null);
    setCurrentView('landing');
  };

  return (
    <div className="flex min-h-screen bg-bg-main text-slate-100 font-sans">
      
      {/* 1. Left Navigation Sidebar */}
      <aside className="w-64 bg-bg-sidebar border-r border-slate-800 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shadow-glow-purple">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider text-white">NEUROPREDICT</h1>
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">RESEARCH · v0.2.1</span>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-grow p-4 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2">Clinical Workspace</span>
          
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentView === 'dashboard' ? 'bg-primary/10 text-primary border border-primary/20 font-semibold' : 'text-slate-400 hover:bg-bg-hover hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Physician Dashboard
          </button>
          
          <button 
            onClick={() => setCurrentView('assessment')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentView === 'assessment' ? 'bg-primary/10 text-primary border border-primary/20 font-semibold' : 'text-slate-400 hover:bg-bg-hover hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            Assessment Suite
          </button>

          {user && (user.role === 'researcher' || user.role === 'admin') && (
            <>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 mt-4">Research Engine</span>
              <button 
                onClick={() => setCurrentView('research')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  currentView === 'research' ? 'bg-primary/10 text-primary border border-primary/20 font-semibold' : 'text-slate-400 hover:bg-bg-hover hover:text-white'
                }`}
              >
                <Brain className="w-4 h-4" />
                Model Analytics
              </button>
            </>
          )}
        </nav>

        {/* Sidebar footer area */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
          {user ? (
            <div className="p-3 bg-bg-hover rounded-lg flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>{user.username}</span>
              </div>
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 self-start uppercase mt-1">
                {user.role}
              </span>
            </div>
          ) : (
            <div className="text-xs text-amber-500 font-semibold text-center py-2 bg-amber-500/10 rounded border border-amber-500/20">
              UNAUTHENTICATED
            </div>
          )}

          <div className="flex items-center gap-2.5 bg-accent-teal/10 border border-accent-teal/20 px-3 py-2.5 rounded-lg text-xs text-accent-teal font-medium">
            <span className="w-2 h-2 bg-accent-teal rounded-full animate-ping"></span>
            <span>NEUROSIFT PIPELINE ACTIVE</span>
          </div>

          {user && (
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-red-950 hover:text-red-400 hover:border-red-900 border border-slate-700 rounded-lg text-xs font-semibold transition-all text-slate-300"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock Workspace
            </button>
          )}
        </div>
      </aside>

      {/* 2. Main Right Content Area */}
      <main className="flex-grow p-10 flex flex-col gap-8 h-screen overflow-y-auto">
        <header className="flex justify-between items-center border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-2xl font-medium text-white capitalize">{currentView} Viewport</h2>
            <p className="text-sm text-slate-400">Low-cost early neurological screening and longitudinal tracking</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Node Location: India-South (DISHA)</span>
            <div className="text-[10px] bg-accent-teal/10 text-accent-teal px-2 py-0.5 rounded border border-accent-teal/20 font-bold">SECURE PIPELINE</div>
          </div>
        </header>

        {currentView === 'dashboard' ? (
          <Dashboard role={role} />
        ) : (
          <div className="p-8 bg-bg-card border border-slate-800 rounded-xl text-center">
            <HeartPulse className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold text-white">Interactive Assessment BAM-01 Loaded</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">Open the main interactive index.html inside the workspace directory directly to engage with the live games and pipeline simulations.</p>
          </div>
        )}
      </main>

    </div>
  );
}
