// client/src/components/CivilianLogs.jsx
import React, { useState } from 'react';
import { Terminal, Search, Filter, Clock, ShieldAlert, ArrowDownUp } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function CivilianLogs({ systemLogs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const filteredLogs = (systemLogs || []).filter(log => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.timestamp.includes(searchTerm);

    const matchesType = selectedType === 'ALL' || log.type === selectedType;

    return matchesSearch && matchesType;
  });

  const getLogTypeBadge = (type) => {
    switch (type) {
      case 'BREACH':
      case 'COMPROMISED':
      case 'INDICTMENT':
        return 'bg-rose-950/80 text-rose-400 border-rose-800';
      case 'ANOMALY':
      case 'AUDIT_WARN':
      case 'ATTACK_FAIL':
        return 'bg-amber-950/80 text-amber-400 border-amber-800';
      case 'FORENSIC_SOLVE':
      case 'VERDICT':
        return 'bg-cyan-950/80 text-cyan-400 border-cyan-800';
      default:
        return 'bg-slate-950 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Security Audit Log Terminal
          </h3>
          <p className="text-[11px] text-slate-400">
            Real-time event ledger. Correlate timestamps and node identifiers to isolate malicious signatures.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs, nodes, sigs..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48 md:w-60"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => { playClick(); setSelectedType(e.target.value); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="BREACH">Breaches</option>
            <option value="ANOMALY">Anomalies</option>
            <option value="FORENSIC_SOLVE">Forensic Solves</option>
            <option value="INDICTMENT">Indictments</option>
          </select>
        </div>
      </div>

      {/* Log Entries Viewport */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 max-h-[420px] overflow-y-auto space-y-1.5 text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No audit records matching query parameters.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-slate-900/60 border border-transparent hover:border-slate-800/80 transition-colors"
            >
              <span className="text-slate-500 shrink-0 text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {log.timestamp}
              </span>

              <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold shrink-0 ${getLogTypeBadge(log.type)}`}>
                {log.type}
              </span>

              <span className="text-cyan-400 font-bold shrink-0 text-[11px] bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/50">
                {log.source}
              </span>

              <span className="text-slate-300 break-words flex-1 text-[11px]">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-2">
        <span>Showing {filteredLogs.length} events</span>
        <span>Tip: Match identical timestamps with Node connection spikes to find the infiltrator.</span>
      </div>
    </div>
  );
}
