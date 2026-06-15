import React, { useState } from 'react';
import { ShieldAlert, TrendingUp, Users, ClipboardCopy } from 'lucide-react';
import { Patient } from '../App';

interface DashboardProps {
  role: string;
}

export default function Dashboard({ role }: DashboardProps) {
  const [patients, setPatients] = useState<Patient[]>([
    {
      id: 'NP-1082',
      name: 'Ananya Sharma',
      age: 67,
      gender: 'F',
      cohort: 'Alzheimer\'s Disease (AD) Risk',
      riskScore: 78,
      confidence: 91,
      mmse: 16,
      updrs: null,
      status: 'Active Monitoring',
      drift: 18.4,
      lastSession: '2026-05-18',
      history: [],
      shap: []
    },
    {
      id: 'NP-2041',
      name: 'Rahul Verma',
      age: 72,
      gender: 'M',
      cohort: 'Parkinson\'s Disease (PD) Risk',
      riskScore: 65,
      confidence: 87,
      mmse: 24,
      updrs: 18,
      status: 'Action Required',
      drift: 12.8,
      lastSession: '2026-05-15',
      history: [],
      shap: []
    }
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-primary-dark"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Active Screenings</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-3xl font-medium text-white">{patients.length} Subjects</h3>
          <p className="text-xs text-slate-400 mt-2"><span className="text-accent-teal">▲ +2 baseline</span> calibrated this week</p>
        </div>

        <div className="bg-bg-card border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent-red to-red-950"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Critical Drift Alerts</span>
            <ShieldAlert className="w-5 h-5 text-accent-red" />
          </div>
          <h3 className="text-3xl font-medium text-white">1 Subjects</h3>
          <p className="text-xs text-slate-400 mt-2"><span className="text-accent-red">▼ Over 15% deviation</span> registered in switch latency</p>
        </div>

        <div className="bg-bg-card border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent-amber to-amber-950"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Referrals Pending</span>
            <TrendingUp className="w-5 h-5 text-accent-amber" />
          </div>
          <h3 className="text-3xl font-medium text-white">1 Pending</h3>
          <p className="text-xs text-slate-400 mt-2">Awaiting specialist neuro-practitioner alignment</p>
        </div>
      </div>

      {/* Main panel patient queue grid */}
      <div className="bg-bg-card border border-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            🧠 Active Patient Screening Queue
          </h3>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-all text-slate-300">
            <ClipboardCopy className="w-3.5 h-3.5" />
            Export Logs CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                <th className="pb-3">Subject Name</th>
                <th className="pb-3">Cohort Classification</th>
                <th className="pb-3">Inference Risk</th>
                <th className="pb-3">Longitudinal Drift</th>
                <th className="pb-3">Latest assessment</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-bg-hover/30 transition-all cursor-pointer">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-primary flex items-center justify-center">
                        {p.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <strong className="text-white text-sm font-medium">{p.name}</strong>
                        <div className="text-[11px] text-slate-400">{p.id} · Age {p.age} · Gender {p.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      p.riskScore > 70 
                        ? 'bg-accent-red/10 text-accent-red border-accent-red/20' 
                        : 'bg-accent-teal/10 text-accent-teal border-accent-teal/20'
                    }`}>
                      {p.cohort}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="text-sm font-semibold text-white">{p.riskScore}%</div>
                    <div className="text-[10px] text-slate-500">Confidence: {p.confidence}%</div>
                  </td>
                  <td className="py-4">
                    <span className={p.drift > 15 ? 'text-accent-red' : 'text-accent-teal'}>
                      +{p.drift}%
                    </span>
                  </td>
                  <td className="py-4 text-sm text-slate-400">
                    {p.lastSession}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
