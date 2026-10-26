// client/src/components/CivilianInspect.jsx
import React, { useState } from 'react';
import { Search, Cookie, Globe, Code, ShieldCheck, AlertTriangle, Database, Cpu } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function CivilianInspect({ myTeam, systemLogs }) {
  const [activeTab, setActiveTab] = useState('SESSION');

  // Simulated session and cookie state
  const isVaultCompromised = myTeam?.modules?.evidenceVault === 'DISABLED';
  const isNetworkCompromised = myTeam?.modules?.networkMonitor === 'DISABLED';
  const isInvestigationCompromised = myTeam?.modules?.investigation === 'DISABLED';

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Simulated System & Telemetry Inspector
          </h3>
          <p className="text-[11px] text-slate-400">
            Inspect local storage, live session cookies, virtual network requests, and simulated source code.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => { playClick(); setActiveTab('SESSION'); }}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'SESSION' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cookie className="w-3.5 h-3.5 inline mr-1" /> Cookies & Session
          </button>
          <button
            onClick={() => { playClick(); setActiveTab('NETWORK'); }}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'NETWORK' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 inline mr-1" /> Network Requests
          </button>
          <button
            onClick={() => { playClick(); setActiveTab('DOM'); }}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'DOM' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5 inline mr-1" /> Source & DOM
          </button>
          <button
            onClick={() => { playClick(); setActiveTab('MODULES'); }}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'MODULES' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 inline mr-1" /> Subsystems
          </button>
        </div>
      </div>

      {/* Tab 1: Cookies & Session State */}
      {activeTab === 'SESSION' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-900 pb-1.5">
              <span>COOKIE NAME</span>
              <span>VALUE & ATTRIBUTES</span>
              <span>STATUS</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900/60">
              <span className="text-cyan-400 font-bold">SESSION_ID</span>
              <span className="text-slate-300 break-all">
                {btoa(`team=${myTeam?.id};role=user;access=${isVaultCompromised ? '1' : '0'};module=evidence`)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                isVaultCompromised ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400'
              }`}>
                {isVaultCompromised ? 'TAMPERED (CS-04)' : 'INTEACT'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900/60">
              <span className="text-cyan-400 font-bold">AUTH_TOKEN</span>
              <span className="text-slate-300">0x99F4A...Bearer_JWT</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400">VALID</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-cyan-400 font-bold">SEC_NODE</span>
              <span className="text-slate-300">NODE-{myTeam?.id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400">ASSIGNED</span>
            </div>
          </div>

          {isVaultCompromised && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">ANOMALY DETECTED:</span> Privilege bit altered in SESSION_ID payload.
                Evidence Vault locked. Cross-reference timestamp in Log Analyzer.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Simulated Network Stream */}
      {activeTab === 'NETWORK' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="grid grid-cols-12 text-slate-500 border-b border-slate-900 pb-1.5 text-[11px]">
              <span className="col-span-2">METHOD</span>
              <span className="col-span-5">PATH / ENDPOINT</span>
              <span className="col-span-2">STATUS</span>
              <span className="col-span-3 text-right">PAYLOAD SIGNATURE</span>
            </div>

            <div className="grid grid-cols-12 py-1.5 border-b border-slate-900/60 items-center">
              <span className="col-span-2 text-emerald-400 font-bold">GET</span>
              <span className="col-span-5 text-slate-300">/api/v1/system/status</span>
              <span className="col-span-2 text-emerald-400 font-bold">200 OK</span>
              <span className="col-span-3 text-right text-slate-500">64 B</span>
            </div>

            <div className="grid grid-cols-12 py-1.5 border-b border-slate-900/60 items-center">
              <span className="col-span-2 text-amber-400 font-bold">POST</span>
              <span className="col-span-5 text-slate-300">/api/v1/vault/session</span>
              <span className="col-span-2 text-rose-400 font-bold">
                {isVaultCompromised ? '401 FORGED' : '200 OK'}
              </span>
              <span className="col-span-3 text-right text-rose-400">
                {isVaultCompromised ? 'CS-04 [UNAUTHORIZED]' : '128 B'}
              </span>
            </div>

            <div className="grid grid-cols-12 py-1.5 border-b border-slate-900/60 items-center">
              <span className="col-span-2 text-cyan-400 font-bold">GET</span>
              <span className="col-span-5 text-slate-300">/debug/memdump</span>
              <span className="col-span-2 text-amber-400 font-bold">403 PROBE</span>
              <span className="col-span-3 text-right text-amber-400">FRAG-LEAK</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Simulated DOM & Source */}
      {activeTab === 'DOM' && (
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
          <div className="text-slate-500">// Simulated Client Application Source</div>
          <div>&lt;<span className="text-rose-400">div</span> <span className="text-amber-400">id</span>=<span className="text-emerald-400">"cyber-node-root"</span> <span className="text-amber-400">data-node</span>=<span className="text-emerald-400">"NODE-{myTeam?.id}"</span>&gt;</div>
          <div className="pl-4">&lt;<span className="text-rose-400">meta</span> <span className="text-amber-400">name</span>=<span className="text-emerald-400">"telemetry-beacon"</span> <span className="text-amber-400">content</span>=<span className="text-emerald-400">"ACTIVE"</span> /&gt;</div>
          <div className="pl-4 text-slate-500">&lt;!-- DEVELOPER NOTE: Legacy auth routes still listening on /sys/maintenance/bypass?key=root_{myTeam?.id?.toLowerCase()} --&gt;</div>
          <div className="pl-4 text-slate-500">&lt;!-- ATTENTION: MD5 checksum verification applied to internal packet frames --&gt;</div>
          <div className="pl-4">&lt;<span className="text-rose-400">section</span> <span className="text-amber-400">class</span>=<span className="text-emerald-400">"vault-encrypted-grid"</span> /&gt;</div>
          <div>&lt;/<span className="text-rose-400">div</span>&gt;</div>
        </div>
      )}

      {/* Tab 4: Subsystems Health */}
      {activeTab === 'MODULES' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-mono">DASHBOARD</span>
            <div className="text-sm font-bold text-emerald-400">OPERATIONAL</div>
            <div className="text-[11px] text-slate-400">Telemetry rendering nominal</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-mono">INVESTIGATION</span>
            <div className={`text-sm font-bold ${isInvestigationCompromised ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isInvestigationCompromised ? 'OFFLINE' : 'ONLINE'}
            </div>
            <div className="text-[11px] text-slate-400">Forensic tools available</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-mono">EVIDENCE VAULT</span>
            <div className={`text-sm font-bold ${isVaultCompromised ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isVaultCompromised ? 'COMPROMISED' : 'SECURE'}
            </div>
            <div className="text-[11px] text-slate-400">Storage encrypted</div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-mono">NETWORK MONITOR</span>
            <div className={`text-sm font-bold ${isNetworkCompromised ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isNetworkCompromised ? 'BLINDED' : 'ONLINE'}
            </div>
            <div className="text-[11px] text-slate-400">Packet sniffer active</div>
          </div>
        </div>
      )}
    </div>
  );
}
