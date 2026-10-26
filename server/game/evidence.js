// server/game/evidence.js
// Authoritative evidence generation, clue correlation, and redaction

const crypto = require('crypto');

class EvidenceManager {
  constructor() {
    this.evidenceList = [];
  }

  // Create an evidence object after an attack
  createAttackEvidence({
    attackerTeam,
    targetTeam,
    attackType,
    signature,
    route,
    moduleAffected,
    spoofedNode = null,
    spoofedSig = null
  }) {
    const evId = 'EV-' + (Math.floor(Math.random() * 900) + 100);
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // If hacker used SPOOF deception ability
    const actualNode = `NODE-${attackerTeam.id}`;
    const effectiveNode = spoofedNode || actualNode;
    const effectiveSig = spoofedSig || signature;

    const evidence = {
      id: evId,
      timestamp: timeString,
      epoch: Date.now(),
      targetTeamId: targetTeam.id,
      targetTeamName: targetTeam.name,
      attackerTeamId: attackerTeam.id, // secret on server
      realOriginNode: actualNode,
      reportedOriginNode: effectiveNode,
      attackType,
      attackSignature: effectiveSig,
      route: route || `/api/v1/${moduleAffected.toLowerCase()}`,
      moduleAffected,
      packetSignature: '0x' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      baseConfidence: spoofedNode ? 55 : 82,
      isSpoofed: !!spoofedNode,
      unlockedBy: [targetTeam.id], // target team initially gets raw incident
      cluesFound: []
    };

    this.evidenceList.push(evidence);
    return evidence;
  }

  // Erase evidence (hacker deception ability)
  eraseEvidence(evidenceId, teamId) {
    const idx = this.evidenceList.findIndex(e => e.id === evidenceId);
    if (idx !== -1) {
      const removed = this.evidenceList.splice(idx, 1)[0];
      return removed;
    }
    return null;
  }

  // Get evidence visible for a specific civilian team
  getVisibleEvidenceForTeam(teamId, isAdmin = false) {
    if (isAdmin) {
      return this.evidenceList;
    }

    return this.evidenceList
      .filter(ev => ev.unlockedBy.includes(teamId) || ev.targetTeamId === teamId)
      .map(ev => {
        // Redact true attacker team ID for civilians
        const confidence = ev.baseConfidence + (ev.cluesFound.length * 5);
        return {
          id: ev.id,
          timestamp: ev.timestamp,
          targetTeamId: ev.targetTeamId,
          targetTeamName: ev.targetTeamName,
          originNodeHint: ev.reportedOriginNode,
          attackType: ev.attackType,
          attackSignature: ev.attackSignature,
          route: ev.route,
          moduleAffected: ev.moduleAffected,
          packetSignature: ev.packetSignature,
          confidence: Math.min(confidence, 99),
          cluesFound: ev.cluesFound,
          isSpoofed: false // Never reveal spoofed status to civilians
        };
      });
  }

  // Get evidence for hacker team (they see their own footprints)
  getEvidenceForHacker(teamId) {
    return this.evidenceList
      .filter(ev => ev.attackerTeamId === teamId)
      .map(ev => ({
        id: ev.id,
        timestamp: ev.timestamp,
        targetTeamId: ev.targetTeamId,
        attackSignature: ev.attackSignature,
        reportedOriginNode: ev.reportedOriginNode,
        isSpoofed: ev.isSpoofed,
        unlockedCount: ev.unlockedBy.length
      }));
  }

  // Enhance evidence when civilian solves CTF or traces
  enhanceEvidence(evidenceId, teamId, clueString) {
    const ev = this.evidenceList.find(e => e.id === evidenceId);
    if (ev) {
      if (!ev.unlockedBy.includes(teamId)) {
        ev.unlockedBy.push(teamId);
      }
      if (clueString && !ev.cluesFound.includes(clueString)) {
        ev.cluesFound.push(clueString);
      }
      return ev;
    }
    return null;
  }
}

module.exports = EvidenceManager;
