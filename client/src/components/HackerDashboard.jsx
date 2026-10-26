// client/src/components/HackerDashboard.jsx
import React, { useState } from 'react';
import { 
  Skull, Target, Zap, ShieldAlert, Terminal, Lock, CheckCircle2, 
  AlertOctagon, EyeOff, Trash2, Shuffle, Radio, Compass, Play, RefreshCw
} from 'lucide-react';
import { playClick, playSuccess, playError, playHackGlitch } from '../utils/soundEffects';

export default function HackerDashboard({
  gameState,
  myTeam,
  onRequestChallenge,
  onSubmitAttack,
  onUseDeception,
  activeAttackChallenge,
  onCancelChallenge
}) {
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [selectedAttackType, setSelectedAttackType] = useState('COOKIE_SHIFT');
  const [attackSolutionInput, setAttackSolutionInput] = useState('');
  const [attackResultFeedback, setAttackResultFeedback] = useState(null);

  // Deception state
  const [selectedDeception, setSelectedDeception] = useState('SPOOF');
  const [deceptionTargetTeam, setDeceptionTargetTeam] = useState('C02');
  const [deceptionEvidenceId, setDeceptionEvidenceId] = useState('');
  const [deceptionCustomText, setDeceptionCustomText] = useState('');
  const [deceptionStatus, setDeceptionStatus] = useState(null);

  // Candidate targets (Civilians or other non-eliminated teams)
  const targets = gameState?.teams?.filter(t => t.id !== myTeam?.id && !t.isEliminated) || [];

  const handleLaunchAttack = (type) => {
    if (!selectedTargetId) {
      alert('Please select a target squad from the matrix first.');
      return;
    }
    playClick();
    setSelectedAttackType(type);
    setAttackResultFeedback(null);
    setAttackSolutionInput('');
    onRequestChallenge(selectedTargetId, type);
  };

  const handleExecutePayload = (e) => {
    e.preventDefault();
    if (!activeAttackChallenge) return;
    playClick();
    onSubmitAttack(activeAttackChallenge.id, attackSolutionInput);
  };

  const handleTriggerDeception = (type) => {
    playClick();
    playHackGlitch();
    onUseDeception(type, {
      fakeSuspectTeamId: deceptionTargetTeam,
      fakeTeamId: deceptionTargetTeam,
      targetCivilianId: deceptionTargetTeam,
      evidenceId: deceptionEvidenceId,
      fakeLogText: deceptionCustomText
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-900/60 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-600 flex items-center justify-center text-rose-400 shadow-md shadow-rose-950">
            <Skull className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-rose-400">Dark Net Infiltration Terminal</span>
              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono">
                STEALTH MODE ACTIVE
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100">
              CELL COMMAND // {myTeam?.name} ({myTeam?.id})
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg">
            <span className="text-slate-500 block text-[10px]">CURRENT SCORE</span>
            <span className="text-emerald-400 font-bold text-sm">+{myTeam?.score || 0} PTS</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg">
            <span className="text-slate-500 block text-[10px]">INTEGRITY</span>
            <span className="text-cyan-400 font-bold text-sm">{myTeam?.integrity || 100}%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Targets on Left, Attack & Deception on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Target Selection Matrix (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-400" />
              Target Infiltration Matrix
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">{targets.length} Nodes Online</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {targets.map(target => {
              const isSelected = selectedTargetId === target.id;
              const isCompromised = target.integrity < 60;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    playClick();
                    setSelectedTargetId(target.id);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-rose-400">{target.id}</span>
                      <span className="text-xs font-semibold text-slate-200">{target.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      target.integrity > 70
                        ? 'text-emerald-400 border-emerald-900/60 bg-emerald-950/20'
                        : target.integrity > 30
                        ? 'text-amber-400 border-amber-900/60 bg-amber-950/20'
                        : 'text-rose-400 border-rose-900/60 bg-rose-950/20'
                    }`}>
                      {target.integrity}% INT
                    </span>
                  </div>

                  {/* Modules status badges */}
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${target.modules?.evidenceVault === 'ACTIVE' ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-400 border border-rose-900'}`}>
                      Vault: {target.modules?.evidenceVault === 'ACTIVE' ? 'OK' : 'LOCKED'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${target.modules?.networkMonitor === 'ACTIVE' ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-400 border border-rose-900'}`}>
                      Net: {target.modules?.networkMonitor === 'ACTIVE' ? 'OK' : 'DOWN'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Col: Attack Terminal & Deception (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Attack Abilities Arsenal */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Tactical Exploit Arsenal
                </h3>
                <p className="text-[11px] text-slate-400">
                  Target: <span className="text-rose-400 font-mono font-bold">{selectedTargetId || 'NO TARGET SELECTED'}</span>
                </p>
              </div>
            </div>

            {/* Exploit Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Cookie Shift */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-rose-300 font-mono">COOKIE SHIFT</span>
                    <span className="text-[10px] text-slate-500 font-mono">Vault Exploit</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Forge base64 session tokens to elevate privileges and lock target Evidence Vault.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchAttack('COOKIE_SHIFT')}
                  disabled={!selectedTargetId}
                  className="w-full py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> Arm Cookie Shift
                </button>
              </div>

              {/* 2. Token Hunt */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-amber-300 font-mono">TOKEN HUNT</span>
                    <span className="text-[10px] text-slate-500 font-mono">Net Monitor</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Scrape endpoints for cryptographic key fragments to blind target network sensors.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchAttack('TOKEN_HUNT')}
                  disabled={!selectedTargetId}
                  className="w-full py-2 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 text-amber-300 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> Arm Token Hunt
                </button>
              </div>

              {/* 3. Route Break */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-cyan-300 font-mono">ROUTE BREAK</span>
                    <span className="text-[10px] text-slate-500 font-mono">Investigation</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Traverse hidden administrative directories to sever target forensic investigation terminal.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchAttack('ROUTE_BREAK')}
                  disabled={!selectedTargetId}
                  className="w-full py-2 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800 text-cyan-300 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> Arm Route Break
                </button>
              </div>

              {/* 4. Packet Decode */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-purple-300 font-mono">PACKET DECODE</span>
                    <span className="text-[10px] text-slate-500 font-mono">Stealth Buffer</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Convert raw hex payload buffers into ASCII overrides for direct stealth compromise.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchAttack('PACKET_DECODE')}
                  disabled={!selectedTargetId}
                  className="w-full py-2 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-300 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> Arm Packet Decode
                </button>
              </div>
            </div>

            {/* Interactive Attack Workspace Terminal (Appears when challenge is ready) */}
            {activeAttackChallenge && (
              <div className="mt-4 p-4 bg-slate-950 border-2 border-rose-500/80 rounded-xl space-y-3 font-mono shadow-2xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Terminal className="w-4 h-4 animate-pulse" />
                    LIVE EXPLOIT WORKSPACE // {activeAttackChallenge.title}
                  </div>
                  <button
                    onClick={onCancelChallenge}
                    className="text-[10px] text-slate-500 hover:text-rose-400 underline cursor-pointer"
                  >
                    Abort Payload
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  {activeAttackChallenge.description}
                </p>

                {/* Challenge specific interactive inspectors */}
                {activeAttackChallenge.type === 'COOKIE_SHIFT' && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                    <div className="text-slate-400">Captured Base64 Session:</div>
                    <div className="p-2 bg-black text-rose-400 rounded text-[11px] break-all border border-slate-800 font-mono">
                      {activeAttackChallenge.initialData?.rawEncoded}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Decoded Layout: <code className="text-cyan-300">{activeAttackChallenge.initialData?.decodedSample}</code>
                    </div>
                  </div>
                )}

                {activeAttackChallenge.type === 'TOKEN_HUNT' && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                    <div className="text-slate-400">Target Endpoints & Scraped Data:</div>
                    <div className="space-y-1 text-[11px]">
                      {activeAttackChallenge.initialData?.routes?.map((r, i) => (
                        <div key={i} className="flex justify-between bg-black/60 p-1.5 rounded border border-slate-800">
                          <span className="text-cyan-400">{r.path}</span>
                          <span className="text-slate-300">{r.data}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeAttackChallenge.type === 'ROUTE_BREAK' && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                    <div className="text-slate-400">Discovered Route Breadcrumbs:</div>
                    <ul className="list-disc list-inside text-[11px] text-cyan-300 space-y-0.5">
                      {activeAttackChallenge.initialData?.hints?.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeAttackChallenge.type === 'PACKET_DECODE' && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                    <div className="text-slate-400">Raw PCAP Hex Bytes:</div>
                    <div className="p-2 bg-black text-purple-400 rounded text-xs tracking-wider border border-slate-800 font-mono">
                      {activeAttackChallenge.initialData?.hexPayload}
                    </div>
                  </div>
                )}

                {/* Submission Form */}
                <form onSubmit={handleExecutePayload} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Enter Crafted Exploit Payload / Solution:</label>
                    <input
                      type="text"
                      value={attackSolutionInput}
                      onChange={(e) => setAttackSolutionInput(e.target.value)}
                      placeholder="e.g. Forged base64 string, Full Token XX-YY, or decoded text..."
                      className="w-full bg-slate-900 border border-rose-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Hint: {activeAttackChallenge.hint}</span>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-rose-950 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" /> Transmit Infiltration Payload
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Deception & Counter-Measures Suite */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-purple-400" />
                  Deception & Counter-Forensics Suite
                </h3>
                <p className="text-[11px] text-slate-400">
                  Manipulate logs, scrub forensic traces, and misdirect civilian investigations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setSelectedDeception('SPOOF')}
                className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedDeception === 'SPOOF' ? 'bg-purple-950/60 border-purple-500 text-purple-300' : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                1. SPOOF
              </button>
              <button
                onClick={() => setSelectedDeception('ERASE')}
                className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedDeception === 'ERASE' ? 'bg-purple-950/60 border-purple-500 text-purple-300' : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                2. ERASE
              </button>
              <button
                onClick={() => setSelectedDeception('MISDIRECT')}
                className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedDeception === 'MISDIRECT' ? 'bg-purple-950/60 border-purple-500 text-purple-300' : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                3. MISDIRECT
              </button>
              <button
                onClick={() => setSelectedDeception('COUNTERATTACK')}
                className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedDeception === 'COUNTERATTACK' ? 'bg-purple-950/60 border-purple-500 text-purple-300' : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                4. COUNTER
              </button>
            </div>

            {/* Active Deception Form */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
              {selectedDeception === 'SPOOF' && (
                <div className="space-y-2">
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                    Spoof Attack Signature & Node
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Your next compromise will masquerade as originating from the selected civilian team.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={deceptionTargetTeam}
                      onChange={(e) => setDeceptionTargetTeam(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                    >
                      {targets.map(t => (
                        <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleTriggerDeception('SPOOF')}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xs cursor-pointer font-mono"
                    >
                      Arm Masquerade
                    </button>
                  </div>
                </div>
              )}

              {selectedDeception === 'ERASE' && (
                <div className="space-y-2">
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    Erase Forensic Evidence File
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Permanently scrub an evidence index (e.g. EV-104) from the central game vault.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={deceptionEvidenceId}
                      onChange={(e) => setDeceptionEvidenceId(e.target.value)}
                      placeholder="e.g. EV-102"
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono w-40"
                    />
                    <button
                      onClick={() => handleTriggerDeception('ERASE')}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs cursor-pointer font-mono"
                    >
                      Scrub Evidence
                    </button>
                  </div>
                </div>
              )}

              {selectedDeception === 'MISDIRECT' && (
                <div className="space-y-2">
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    Misdirect Audit Telemetry
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Inject a fake suspicious event into the public log attributing malicious activity to another team.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={deceptionTargetTeam}
                      onChange={(e) => setDeceptionTargetTeam(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                    >
                      {targets.map(t => (
                        <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleTriggerDeception('MISDIRECT')}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs cursor-pointer font-mono"
                    >
                      Inject Fake Anomaly
                    </button>
                  </div>
                </div>
              )}

              {selectedDeception === 'COUNTERATTACK' && (
                <div className="space-y-2">
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-cyan-400" />
                    Jam Civilian Investigation Tool
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Temporarily disrupt and disable a civilian squad's investigation terminal.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={deceptionTargetTeam}
                      onChange={(e) => setDeceptionTargetTeam(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                    >
                      {targets.map(t => (
                        <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleTriggerDeception('COUNTERATTACK')}
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs cursor-pointer font-mono"
                    >
                      Jam Terminal (45s)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
