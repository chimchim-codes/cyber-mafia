// server/game/evidence.js
// Authoritative evidence generation, clue correlation, and redaction for Dr. Adrian Vale murder case

const crypto = require('crypto');

class EvidenceManager {
  constructor() {
    this.evidenceList = [];
    this.initCaseEvidence();
  }

  // Initialize official evidence for Dr. Adrian Vale murder case
  initCaseEvidence() {
    this.evidenceList = [
      {
        id: 'MED-11',
        title: 'Medical Report: Toxicology Screen',
        timestamp: '09:15:00',
        epoch: Date.now(),
        targetTeamId: 'Dr. Adrian Vale',
        targetTeamName: 'Victim Dossier',
        originNodeHint: 'Medical Wing B-03',
        attackType: 'POISONING',
        attackSignature: 'TOX-CYANIDE',
        route: '/lab/spec/med-11',
        moduleAffected: 'Toxicology',
        packetSignature: '0x99A1',
        baseConfidence: 96,
        unlockedBy: ['ALL'],
        cluesFound: [
          'MED-11 — Medical report confirming poisoning.',
          'Fatal concentration of poison administered through a drink in Adrian\'s office.'
        ]
      },
      {
        id: 'DATA-09',
        title: 'Network Audit: Model Weight Exfiltration',
        timestamp: '02:14:33',
        epoch: Date.now(),
        targetTeamId: 'Neural Core',
        targetTeamName: 'Model Registry',
        originNodeHint: 'Data Center Sub-1',
        attackType: 'DATA_EXFIL',
        attackSignature: 'EXP-MODEL-09',
        route: '/export/weights/v4',
        moduleAffected: 'Model Vault',
        packetSignature: '0x44B2',
        baseConfidence: 94,
        unlockedBy: ['ALL'],
        cluesFound: [
          'DATA-09 — Records of unauthorized model exports.',
          '42.8 GB exfiltrated off-shore; Dr. Adrian Vale scheduled an emergency audit.'
        ]
      },
      {
        id: 'GM-20',
        title: 'Internal Memo: Sealed Correspondence',
        timestamp: '08:05:12',
        epoch: Date.now(),
        targetTeamId: 'Executive Terminal',
        targetTeamName: 'Administration',
        originNodeHint: 'Admin Suite 404',
        attackType: 'MOTIVE_EVIDENCE',
        attackSignature: 'CONFIDENTIAL-MEMO',
        route: '/mail/drafts/archive',
        moduleAffected: 'Governance',
        packetSignature: '0x77F0',
        baseConfidence: 95,
        unlockedBy: ['ALL'],
        cluesFound: [
          'GM-20 — Sealed correspondence connecting Elena to the export scheme and knowledge of Adrian’s audit.',
          'Proves motive: silencing Adrian to prevent public exposure of unauthorized exports.'
        ]
      },
      {
        id: 'GM-21',
        title: 'Corroborating Forensics: Physical Access',
        timestamp: '08:32:00',
        epoch: Date.now(),
        targetTeamId: 'Research Lab 101',
        targetTeamName: 'Crime Scene',
        originNodeHint: 'Lab Badge Reader',
        attackType: 'FORENSIC_MATCH',
        attackSignature: 'KEYCARD-OVERRIDE',
        route: '/access/door/lab101',
        moduleAffected: 'Access Control',
        packetSignature: '0x12E8',
        baseConfidence: 99,
        unlockedBy: ['ALL'],
        cluesFound: [
          'GM-21 — Authenticated corroborating evidence connecting Elena to the poisoning.',
          'Corroborates Elena Ward was present with Adrian\'s drink right before time of death.'
        ]
      }
    ];
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
    const timeString = now.toTimeString().split(' ')[0];

    const actualNode = `NODE-${attackerTeam.id}`;
    const effectiveNode = spoofedNode || actualNode;
    const effectiveSig = spoofedSig || signature;

    const evidence = {
      id: evId,
      timestamp: timeString,
      epoch: Date.now(),
      targetTeamId: targetTeam.id,
      targetTeamName: targetTeam.name,
      attackerTeamId: attackerTeam.id,
      realOriginNode: actualNode,
      reportedOriginNode: effectiveNode,
      attackType,
      attackSignature: effectiveSig,
      route: route || `/api/v1/${moduleAffected.toLowerCase()}`,
      moduleAffected,
      packetSignature: '0x' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      baseConfidence: spoofedNode ? 55 : 85,
      isSpoofed: !!spoofedNode,
      unlockedBy: ['ALL', targetTeam.id],
      cluesFound: []
    };

    this.evidenceList.push(evidence);
    return evidence;
  }

  // Erase evidence (hacker deception ability)
  eraseEvidence(evidenceId, teamId) {
    const idx = this.evidenceList.findIndex(e => e.id === evidenceId);
    if (idx !== -1) {
      return this.evidenceList.splice(idx, 1)[0];
    }
    return null;
  }

  // Get evidence visible for team
  getVisibleEvidenceForTeam(teamId, isAdmin = false) {
    if (isAdmin) {
      return this.evidenceList;
    }

    return this.evidenceList
      .filter(ev => ev.unlockedBy.includes('ALL') || ev.unlockedBy.includes(teamId) || ev.targetTeamId === teamId)
      .map(ev => ({
        id: ev.id,
        title: ev.title || `Incident ${ev.id}`,
        timestamp: ev.timestamp,
        targetTeamId: ev.targetTeamId,
        targetTeamName: ev.targetTeamName,
        originNodeHint: ev.reportedOriginNode || ev.originNodeHint,
        attackType: ev.attackType,
        attackSignature: ev.attackSignature,
        route: ev.route,
        moduleAffected: ev.moduleAffected,
        packetSignature: ev.packetSignature,
        confidence: Math.min(ev.baseConfidence + (ev.cluesFound.length * 3), 99),
        cluesFound: ev.cluesFound,
        isSpoofed: false
      }));
  }

  // Get evidence for hacker team
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

  // Enhance evidence when solved
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
