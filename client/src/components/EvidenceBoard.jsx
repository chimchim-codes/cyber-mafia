// client/src/components/EvidenceBoard.jsx
import React, { useState } from 'react';
import { Network, Pin, Link as LinkIcon, CheckSquare, Square, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function EvidenceBoard({ visibleEvidence, allTeams, myTeam, onPrepareAccusation }) {
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState([]);
  const [selectedSuspectId, setSelectedSuspectId] = useState(
    allTeams && allTeams.length > 1 ? allTeams.find(t => t.id !== myTeam?.id)?.id : 'C02'
  );

  const toggleEvidence = (id) => {
    playClick();
    setSelectedEvidenceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Calculate composite case confidence
  const selectedEvidenceCards = (visibleEvidence || []).filter(e => selectedEvidenceIds.includes(e.id));
  const baseScore = selectedEvidenceCards.reduce((acc, curr) => acc + (curr.confidence || 60), 0);
  const compositeConfidence = selectedEvidenceCards.length > 0 
    ? Math.min(Math.round(baseScore / selectedEvidenceCards.length) + (selectedEvidenceCards.length * 8), 98) 
    : 0;

  const handleExportToIndictment = () => {
    playClick();
    if (!selectedSuspectId) {
      alert('Please select a suspect squad to indict.');
      return;
    }
    if (selectedEvidenceIds.length === 0) {
      alert('Please attach at least 1 evidence file to build the case.');
      return;
    }
    onPrepareAccusation({
      suspectTeamId: selectedSuspectId,
      evidenceIds: selectedEvidenceIds,
      confidence: compositeConfidence
    });
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Pin className="w-4 h-4 text-rose-400" />
            Interactive Forensic Evidence Board
          </h3>
          <p className="text-[11px] text-slate-400">
            Connect attack signatures, timestamps, route telemetry, and suspected nodes to construct an indictment.
          </p>
        </div>

        {/* Confidence Meter Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase">Indictment Confidence:</span>
          <span className={`text-xs font-bold font-mono ${
            compositeConfidence > 75 ? 'text-emerald-400' : compositeConfidence > 40 ? 'text-amber-400' : 'text-slate-500'
          }`}>
            {compositeConfidence}%
          </span>
        </div>
      </div>

      {/* Main Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Col: Evidence Pin Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>UNLOCKED FORENSIC FILES ({visibleEvidence?.length || 0})</span>
            <span className="text-[10px] text-cyan-400">Click card to pin into case</span>
          </div>

          {visibleEvidence?.length === 0 ? (
            <div className="p-8 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No evidence collected yet. Solve CTF Labs or trace incidents in the Log Analyzer to capture intelligence.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {visibleEvidence?.map(ev => {
                const isPinned = selectedEvidenceIds.includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    onClick={() => toggleEvidence(ev.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isPinned
                        ? 'bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-rose-400 fill-rose-400' : 'text-slate-500'}`} />
                        <span className="font-bold text-xs text-slate-200">{ev.id}</span>
                      </div>
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
                        {ev.attackSignature}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div>Target: <span className="text-white font-semibold">{ev.targetTeamId}</span></div>
                      <div>Timestamp: <span className="text-amber-400 font-mono">{ev.timestamp}</span></div>
                      <div>Origin Clue: <span className="text-rose-300 font-mono">{ev.originNodeHint || 'NODE-??'}</span></div>
                      <div>Endpoint: <span className="text-slate-300">{ev.route}</span></div>
                    </div>

                    {ev.cluesFound?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-900 text-[10px] text-emerald-400">
                        {ev.cluesFound[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Case Indictment Builder (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h4 className="text-xs font-bold uppercase text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Indictment Dossier
            </h4>
            <span className="text-[10px] text-slate-500">{selectedEvidenceIds.length} Files Attached</span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Select Suspect Squad:</label>
            <select
              value={selectedSuspectId}
              onChange={(e) => { playClick(); setSelectedSuspectId(e.target.value); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-rose-300 font-mono font-bold focus:outline-none"
            >
              {allTeams?.filter(t => t.id !== myTeam?.id && !t.isEliminated).map(t => (
                <option key={t.id} value={t.id}>
                  {t.id} - {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Attached Clues Summary */}
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1.5 text-xs">
            <div className="text-[10px] text-slate-500 uppercase">Attached Correlations:</div>
            {selectedEvidenceCards.length === 0 ? (
              <div className="text-slate-500 text-[11px] italic">No evidence pins attached yet.</div>
            ) : (
              selectedEvidenceCards.map(c => (
                <div key={c.id} className="flex justify-between text-[11px]">
                  <span className="text-cyan-400">{c.id} ({c.attackSignature})</span>
                  <span className="text-slate-400">{c.originNodeHint}</span>
                </div>
              ))
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleExportToIndictment}
            disabled={selectedEvidenceCards.length === 0}
            className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
            Proceed to Formal Accusation
          </button>
        </div>
      </div>
    </div>
  );
}
