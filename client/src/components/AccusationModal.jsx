// client/src/components/AccusationModal.jsx
import React, { useState } from 'react';
import { ShieldAlert, X, Pin, Send, AlertTriangle } from 'lucide-react';
import { playClick, playAlarm } from '../utils/soundEffects';

export default function AccusationModal({
  isOpen,
  onClose,
  allTeams,
  myTeam,
  visibleEvidence,
  prefilledSuspectId,
  prefilledEvidenceIds,
  onSubmitAccusation
}) {
  const [suspectTeamId, setSuspectTeamId] = useState(prefilledSuspectId || 'C02');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState(prefilledEvidenceIds || []);
  const [indictmentNotes, setIndictmentNotes] = useState('');

  if (!isOpen) return null;

  const toggleEvidence = (id) => {
    playClick();
    setSelectedEvidenceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const calculateConfidence = () => {
    let score = 50 + (selectedEvidenceIds.length * 15);
    return Math.min(score, 98);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    playAlarm();
    onSubmitAccusation(suspectTeamId, selectedEvidenceIds, indictmentNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 shadow-2xl space-y-5 font-mono relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-600 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">
              Tribunal Indictment Form
            </span>
            <h3 className="text-lg font-black text-white">FILE FORMAL HACKER ACCUSATION</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Select Suspect */}
          <div>
            <label className="text-slate-400 block mb-1">Target Squad Under Indictment:</label>
            <select
              value={suspectTeamId}
              onChange={(e) => setSuspectTeamId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-rose-400 font-bold focus:outline-none"
            >
              {allTeams?.filter(t => t.id !== myTeam?.id && !t.isEliminated).map(t => (
                <option key={t.id} value={t.id}>
                  {t.id} - {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Evidence Pins */}
          <div>
            <label className="text-slate-400 block mb-1">Attach Unlocked Forensic Evidence Files:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {visibleEvidence?.map(ev => {
                const isSelected = selectedEvidenceIds.includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    onClick={() => toggleEvidence(ev.id)}
                    className={`p-2.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 text-white font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{ev.id} [{ev.attackSignature}]</span>
                      <span>{ev.timestamp}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Origin: {ev.originNodeHint || 'NODE-??'}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statement */}
          <div>
            <label className="text-slate-400 block mb-1">Indictment Rationale & Forensic Justification:</label>
            <textarea
              rows={3}
              value={indictmentNotes}
              onChange={(e) => setIndictmentNotes(e.target.value)}
              placeholder="e.g. Timestamp correlation matches unauthorized session tamper on sector C07. Ingress signature coincides with node telemetry."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Calculated Confidence */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Estimated Case Confidence:</span>
            <span className="text-emerald-400 font-bold font-mono">{calculateConfidence()}%</span>
          </div>

          <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-lg text-[11px] text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold">CAUTION:</span> False accusations carry a severe <span className="text-rose-400 font-bold">-100 PTS</span> penalty.
              The accused will receive 45 seconds to submit their defense to the tribunal.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg uppercase tracking-wider shadow-lg shadow-rose-950 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Accusation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
