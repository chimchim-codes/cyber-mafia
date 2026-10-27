// client/src/components/EvidenceBoard.jsx
import React, { useState } from 'react';
import { 
  Pin, FileText, Lock, Eye, AlertTriangle, 
  Send, CheckCircle2, ShieldAlert, X, Filter 
} from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function EvidenceBoard({
  allEvidence = [],
  unlockedBatches = [1],
  currentStage = 1,
  onOpenAccusation
}) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  // Filter evidence based on unlocked batches
  const unlockedEvidence = allEvidence.filter(e => unlockedBatches.includes(e.batch));
  const lockedEvidence = allEvidence.filter(e => !unlockedBatches.includes(e.batch));

  const filteredUnlocked = unlockedEvidence.filter(e => {
    if (selectedFilter === 'ALL') return true;
    return e.suspectLinked?.toLowerCase().includes(selectedFilter.toLowerCase()) || 
           e.type?.toLowerCase().includes(selectedFilter.toLowerCase());
  });

  const getDocTypeBadge = (type) => {
    switch (type) {
      case 'POLICE_REPORT':
      case 'POLICE_TRANSCRIPT':
      case 'WITNESS_STATEMENT':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'TOXICOLOGY_REPORT':
      case 'FORENSIC_ANALYSIS':
      case 'CRIMELAB_DNA':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'SERVER_LOG':
      case 'SYSTEM_AUDIT':
      case 'BADGE_TELEMETRY':
      case 'AUTH_TELEMETRY':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      case 'LEGAL_NOTICE':
      case 'CONFIDENTIAL_MEMO':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      default:
        return 'bg-slate-950 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px] uppercase tracking-wider mb-1">
            <Pin className="w-3 h-3 text-rose-400" />
            Case Dossier // Forensic Evidence Vault
          </div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Multi-Suspect Incident Evidence Records
          </h3>
          <p className="text-[11px] text-slate-400">
            Official police transcripts, toxicology results, server logs, and memos across all suspects.
          </p>
        </div>

        {/* Evidence Status & Accusation CTA */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Records Unlocked: </span>
            <span className="text-emerald-400 font-bold">{unlockedEvidence.length} / {allEvidence.length}</span>
            <span className="text-slate-500 text-[10px] ml-1.5">(Batch {unlockedBatches.length}/6)</span>
          </div>

          <button
            onClick={() => {
              playClick();
              onOpenAccusation();
            }}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-rose-950 flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            High Tribunal Accusation
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 text-[11px] flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter by:
        </span>
        {['ALL', 'Dr. Mira Sen', 'Noah Mercer', 'Felix Grant', 'Elena Ward', 'POLICE', 'SERVER_LOG'].map((f) => (
          <button
            key={f}
            onClick={() => {
              playClick();
              setSelectedFilter(f);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
              selectedFilter === f
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Unlocked Evidence Grid */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Active Unlocked Evidence Files ({filteredUnlocked.length})</span>
          <span className="text-[10px] text-cyan-400">Click any card to read full document</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredUnlocked.map((ev) => (
            <div
              key={ev.id}
              onClick={() => {
                playClick();
                setSelectedDoc(ev);
              }}
              className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-cyan-500/80 rounded-xl p-3.5 space-y-2.5 cursor-pointer transition-all shadow-md hover:shadow-cyan-950/40 relative group"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between text-[10px]">
                <span className={`px-1.5 py-0.5 rounded border uppercase font-bold ${getDocTypeBadge(ev.type)}`}>
                  {ev.refCode}
                </span>
                <span className="text-slate-500">{ev.timestamp}</span>
              </div>

              {/* Title & Classification */}
              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {ev.title}
                </h4>
                <div className="text-[9px] text-amber-500/90 tracking-widest uppercase mt-0.5 font-mono">
                  {ev.classification}
                </div>
              </div>

              {/* Summary */}
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {ev.shortSummary}
              </p>

              {/* Footer info */}
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 truncate max-w-[170px]">
                  Ref: <span className="text-slate-300 font-semibold">{ev.suspectLinked}</span>
                </span>
                <span className="text-cyan-400 group-hover:underline flex items-center gap-1 font-semibold">
                  <Eye className="w-3 h-3" /> Inspect
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked Batches Section */}
      {lockedEvidence.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Classified Evidence Batches Remaining ({lockedEvidence.length} Files Locked)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[2, 3, 4, 5, 6].map((bNum) => {
              const batchFiles = allEvidence.filter(e => e.batch === bNum);
              if (batchFiles.length === 0 || unlockedBatches.includes(bNum)) return null;

              return (
                <div
                  key={bNum}
                  className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1 text-slate-600"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold">EVIDENCE BATCH {bNum}</span>
                    <Lock className="w-3 h-3" />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {batchFiles.length} Restricted Case Records
                  </div>
                  <div className="text-[10px] text-cyan-600">
                    Complete Python Stage {bNum - 1} to decrypt
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-cyan-500/80 rounded-2xl p-6 shadow-2xl space-y-4 font-mono relative max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Document Header */}
            <div className="border-b border-slate-800 pb-3 pr-8 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${getDocTypeBadge(selectedDoc.type)}`}>
                  {selectedDoc.refCode}
                </span>
                <span className="text-[10px] bg-red-950/60 border border-red-800 text-red-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                  {selectedDoc.classification}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{selectedDoc.title}</h3>
              <div className="text-xs text-slate-400 flex flex-wrap gap-4 pt-1">
                <span>Timestamp: <strong className="text-slate-200">{selectedDoc.timestamp}</strong></span>
                <span>Sign-off: <strong className="text-slate-200">{selectedDoc.signoff}</strong></span>
                <span>Subject: <strong className="text-cyan-400">{selectedDoc.suspectLinked}</strong></span>
              </div>
            </div>

            {/* Document Content Viewport */}
            <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-3 shadow-inner">
              <pre className="text-slate-200 font-mono whitespace-pre-wrap leading-relaxed text-[11px]">
                {selectedDoc.documentBody}
              </pre>
            </div>

            {/* Document Tags & Action */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {selectedDoc.tags?.map((tag) => (
                  <span key={tag} className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
