// client/src/components/EvidenceBoard.jsx
import React, { useState } from 'react';
import { Pin, ShieldAlert, Send, FileText, CheckCircle2 } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function EvidenceBoard({ visibleEvidence, onOpenAccusationModal }) {
  const [selectedClueId, setSelectedClueId] = useState(
    visibleEvidence && visibleEvidence.length > 0 ? visibleEvidence[0].id : null
  );

  const activeClue = visibleEvidence?.find(e => e.id === selectedClueId) || visibleEvidence?.[0];

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono">
      {/* Minimal Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Case Evidence Files ({visibleEvidence?.length || 0})
          </h3>
        </div>

        <button
          onClick={() => { playClick(); onOpenAccusationModal(); }}
          className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-rose-950 flex items-center gap-2 cursor-pointer transition-all"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          File Accusation (MCQ)
        </button>
      </div>

      {/* Main Evidence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Evidence Cards List */}
        <div className="lg:col-span-5 space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {visibleEvidence?.length === 0 ? (
            <div className="p-8 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No evidence collected yet.
            </div>
          ) : (
            visibleEvidence?.map((ev) => {
              const isSelected = selectedClueId === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => { playClick(); setSelectedClueId(ev.id); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/50'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-rose-300">{ev.id}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {ev.confidence ? `${ev.confidence}% Confidence` : 'VERIFIED'}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {ev.title || ev.attackType}
                  </div>

                  <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                    <span>{ev.originNodeHint || 'Forensic Lab'}</span>
                    <span>{ev.timestamp}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Evidence Detail Dossier */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 md:p-5 space-y-3">
          {activeClue ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">{activeClue.id}</span>
                  <h4 className="text-sm font-bold text-slate-100">{activeClue.title}</h4>
                </div>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-mono">
                  {activeClue.timestamp}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div><span className="text-slate-500">Location Origin:</span> <span className="text-slate-200">{activeClue.originNodeHint || 'Central Archives'}</span></div>
                <div><span className="text-slate-500">Classification:</span> <span className="text-cyan-400 font-mono">{activeClue.attackType || 'FORENSIC'}</span></div>
              </div>

              {/* Findings */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Forensic Findings:</span>
                {activeClue.cluesFound?.length > 0 ? (
                  activeClue.cluesFound.map((clue, idx) => (
                    <div key={idx} className="text-emerald-300 text-[11px] flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{clue}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-[11px]">Primary evidence item.</div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => { playClick(); onOpenAccusationModal(); }}
                  className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  Proceed to Accusation (MCQ)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select an evidence file to inspect findings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
