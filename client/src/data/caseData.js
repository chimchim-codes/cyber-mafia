// client/src/data/caseData.js
// Standalone Case Data for Dr. Adrian Vale Murder Mystery

export const INITIAL_SUSPECTS = [
  { id: 'S01', name: 'Dr. Mira Sen', role: 'CIVILIAN', title: 'Senior Research Fellow', integrity: 100, score: 0 },
  { id: 'S02', name: 'Noah Mercer', role: 'CIVILIAN', title: 'Systems Architect', integrity: 100, score: 0 },
  { id: 'S03', name: 'Felix Grant', role: 'CIVILIAN', title: 'Security Lead', integrity: 100, score: 0 },
  { id: 'S04', name: 'Elena Ward', role: 'HACKER', title: 'Director of Operations (The Killer)', integrity: 100, score: 0 },
  { id: 'S05', name: 'Inspector Cross', role: 'CIVILIAN', title: 'Lead Investigator', integrity: 100, score: 0 },
  { id: 'S06', name: 'Agent Vance', role: 'CIVILIAN', title: 'Forensic Analyst', integrity: 100, score: 0 },
  { id: 'S07', name: 'Officer Blake', role: 'CIVILIAN', title: 'Field Security', integrity: 100, score: 0 },
  { id: 'S08', name: 'Sentinel Unit', role: 'CIVILIAN', title: 'Automated Defense', integrity: 100, score: 0 }
];

export const INVESTIGATION_LOCATIONS = [
  {
    id: 'LOC-MED',
    name: 'Toxicology & Medical Bay',
    room: 'Medical Wing B-03',
    clueId: 'MED-11',
    clueTitle: 'Medical report confirming poisoning',
    clueDescription: 'Toxicology confirms a lethal dose of organophosphate neurotoxin was dissolved into Dr. Adrian Vale\'s drink.',
    challenge: {
      id: 'CHAL-MED-11',
      title: 'Toxicology Spectral Analysis',
      category: 'HEX',
      difficulty: 'EASY',
      description: 'Decode the hexadecimal spectrometer buffer to confirm the lethal chemical signature.',
      prompt: 'Spectra Buffer: `50 4F 49 53 4F 4E 2D 44 52 49 4E 4B`',
      expected: 'POISON-DRINK',
      rewardScore: 100
    },
    hint: 'Convert each hex pair (e.g. 50 -> P, 4F -> O) to ASCII characters to identify the delivery method.'
  },
  {
    id: 'LOC-DATA',
    name: 'Server Core & Model Registry',
    room: 'Data Center Sub-level 1',
    clueId: 'DATA-09',
    clueTitle: 'Records of unauthorized model exports',
    clueDescription: 'Audit telemetry verifies unauthorized exfiltration of proprietary model weights to an offshore server.',
    challenge: {
      id: 'CHAL-DATA-09',
      title: 'Model Export Registry Audit',
      category: 'BASE64',
      difficulty: 'MEDIUM',
      description: 'Decode the intercepted transfer header to uncover the unauthorized model export operation.',
      prompt: 'Encoded Transfer Header: `VU5BVVRIT1JJWkVELU1PREVMLUVYUE9SVC1EQVRBLTA5`',
      expected: 'UNAUTHORIZED-MODEL-EXPORT-DATA-09',
      rewardScore: 100
    },
    hint: 'Decode the standard Base64 string to discover the unauthorized data transfer signature.'
  },
  {
    id: 'LOC-EXEC',
    name: 'Executive Office & Archives',
    room: 'Administration Suite 404',
    clueId: 'GM-20',
    clueTitle: 'Sealed correspondence connecting Elena to the export scheme and knowledge of Adrian’s audit',
    clueDescription: 'Recovered internal memos prove Elena Ward orchestrated the export scheme and knew Adrian planned an audit.',
    challenge: {
      id: 'CHAL-GM-20',
      title: 'Sealed Executive Memo Decryption',
      category: 'LOGIC',
      difficulty: 'MEDIUM',
      description: 'Solve the cipher access logic: `(A AND B) OR (NOT C AND D)` where A=1, B=1, C=1, D=0. Output 0 or 1.',
      prompt: 'Inputs: A=1, B=1, C=1, D=0. Circuit: (1 AND 1) OR (0 AND 0) = ?',
      expected: '1',
      rewardScore: 100
    },
    hint: 'Evaluate boolean logic: (1 AND 1) equals 1; anything OR 1 evaluates to 1.'
  },
  {
    id: 'LOC-LAB',
    name: "Dr. Adrian Vale's Private Lab",
    room: 'Research Lab 101 (Crime Scene)',
    clueId: 'GM-21',
    clueTitle: 'Authenticated corroborating evidence connecting Elena to the poisoning',
    clueDescription: 'Corroborating forensic evidence and keycard access confirm Elena Ward entered the lab with the poisoned beverage.',
    challenge: {
      id: 'CHAL-GM-21',
      title: 'Crime Scene Keycard Log Sequence',
      category: 'PATTERN',
      difficulty: 'MEDIUM',
      description: 'Identify the anomalous unlogged entry timestamp from the badge reader interval sequence: [08:00, 08:15, 08:30, 08:32, 08:45].',
      prompt: 'Sequence: 08:00, 08:15, 08:30, 08:32, 08:45. Which timestamp broke the regular 15-minute interval?',
      expected: '08:32',
      rewardScore: 100
    },
    hint: 'The standard terminal logs badge events every 15 minutes; find the single unscheduled entry.'
  },
  {
    id: 'LOC-SEC',
    name: 'Security Network Gateway',
    room: 'Security Operations Center',
    clueId: 'SEC-04',
    clueTitle: 'CCTV Tampering & Gateway Bypass Log',
    clueDescription: 'Security feeds between 08:25 and 08:40 were looped by an administrator overriding gateway protocols.',
    challenge: {
      id: 'CHAL-SEC-04',
      title: 'Gateway Bypass Header Extraction',
      category: 'STEGO',
      difficulty: 'HARD',
      description: 'Extract the custom header value for `X-Bypass-Key` from the tamper log packet.',
      prompt: 'Packet Header: `Host: sec.local\\nX-Bypass-Key: BYPASS-ELENA-WARD\\nStatus: 200 OK`',
      expected: 'BYPASS-ELENA-WARD',
      rewardScore: 100
    },
    hint: 'Locate the exact value assigned to the X-Bypass-Key field in the HTTP header block.'
  }
];

export const INITIAL_EVIDENCE = [
  {
    id: 'MED-11',
    title: 'Medical Report: Toxicology Screen',
    timestamp: '09:15:00',
    targetTeamId: 'Dr. Adrian Vale',
    targetTeamName: 'Victim Dossier',
    originNodeHint: 'Medical Wing B-03',
    attackType: 'POISONING',
    attackSignature: 'TOX-CYANIDE',
    route: '/lab/spec/med-11',
    moduleAffected: 'Toxicology',
    packetSignature: '0x99A1',
    confidence: 96,
    cluesFound: [
      'MED-11 — Medical report confirming poisoning.',
      'Fatal concentration of poison administered through a drink in Adrian\'s office.'
    ]
  },
  {
    id: 'DATA-09',
    title: 'Network Audit: Model Weight Exfiltration',
    timestamp: '02:14:33',
    targetTeamId: 'Neural Core',
    targetTeamName: 'Model Registry',
    originNodeHint: 'Data Center Sub-1',
    attackType: 'DATA_EXFIL',
    attackSignature: 'EXP-MODEL-09',
    route: '/export/weights/v4',
    moduleAffected: 'Model Vault',
    packetSignature: '0x44B2',
    confidence: 94,
    cluesFound: [
      'DATA-09 — Records of unauthorized model exports.',
      '42.8 GB exfiltrated off-shore; Dr. Adrian Vale scheduled an emergency audit.'
    ]
  },
  {
    id: 'GM-20',
    title: 'Internal Memo: Sealed Correspondence',
    timestamp: '08:05:12',
    targetTeamId: 'Executive Terminal',
    targetTeamName: 'Administration',
    originNodeHint: 'Admin Suite 404',
    attackType: 'MOTIVE_EVIDENCE',
    attackSignature: 'CONFIDENTIAL-MEMO',
    route: '/mail/drafts/archive',
    moduleAffected: 'Governance',
    packetSignature: '0x77F0',
    confidence: 95,
    cluesFound: [
      'GM-20 — Sealed correspondence connecting Elena to the export scheme and knowledge of Adrian’s audit.',
      'Proves motive: silencing Adrian to prevent public exposure of unauthorized exports.'
    ]
  },
  {
    id: 'GM-21',
    title: 'Corroborating Forensics: Physical Access',
    timestamp: '08:32:00',
    targetTeamId: 'Research Lab 101',
    targetTeamName: 'Crime Scene',
    originNodeHint: 'Lab Badge Reader',
    attackType: 'FORENSIC_MATCH',
    attackSignature: 'KEYCARD-OVERRIDE',
    route: '/access/door/lab101',
    moduleAffected: 'Access Control',
    packetSignature: '0x12E8',
    confidence: 99,
    cluesFound: [
      'GM-21 — Authenticated corroborating evidence connecting Elena to the poisoning.',
      'Corroborates Elena Ward was present with Adrian\'s drink right before time of death.'
    ]
  }
];

export const INITIAL_LOGS = [
  { id: 'LOG-1', timestamp: '08:35:10', type: 'BREACH', source: 'CRIME_SCENE', message: 'CRITICAL: Dr. Adrian Vale found unresponsive in Private Lab 101. Perimeter locked down.' },
  { id: 'LOG-2', timestamp: '08:36:04', type: 'ANOMALY', source: 'TOXICOLOGY', message: 'Toxicology sensor flagged organophosphate neurotoxin traces in coffee vessel.' },
  { id: 'LOG-3', timestamp: '08:38:22', type: 'BREACH', source: 'ACCESS_GW', message: 'Security gateway bypass detected between 08:25 and 08:40. Camera loop engaged.' },
  { id: 'LOG-4', timestamp: '08:40:01', type: 'FORENSIC_SOLVE', source: 'TERMINAL', message: 'Forensic Investigation Terminal initialized. Lead investigator granted tribunal subpoena authority.' }
];

export function createInitialGameState() {
  const challenges = INVESTIGATION_LOCATIONS.map(loc => ({
    id: loc.challenge.id,
    locationId: loc.id,
    locationName: loc.name,
    room: loc.room,
    category: loc.challenge.category,
    title: `${loc.name} // ${loc.challenge.title}`,
    difficulty: loc.challenge.difficulty,
    rewardScore: loc.challenge.rewardScore,
    description: loc.challenge.description,
    prompt: loc.challenge.prompt,
    expected: loc.challenge.expected,
    hint: loc.hint,
    unlockedEvidenceType: loc.clueId,
    clueId: loc.clueId,
    evidenceClue: `${loc.clueId} — ${loc.clueTitle}: ${loc.clueDescription}`,
    isSolved: false
  }));

  return {
    phase: 'LOBBY',
    round: 1,
    maxRounds: 5,
    timer: 180,
    hintsRemaining: 3,
    hintsUsedPerLocation: {},
    teams: INITIAL_SUSPECTS,
    locations: INVESTIGATION_LOCATIONS,
    civilianLabChallenges: challenges,
    systemLogs: INITIAL_LOGS,
    chatMessages: [
      {
        id: 'MSG-INIT',
        timestamp: '08:36',
        senderTeamId: 'DISPATCH',
        senderTeamName: 'Incident Command',
        channel: 'PUBLIC',
        text: 'All units: Dr. Adrian Vale has been found murdered. Begin crime scene inspection immediately.'
      }
    ],
    scoringRules: {
      COMPROMISE_SUCCESS: 100,
      SOLVE_INVESTIGATION_CTF: 100,
      CORRECT_HACKER_ACCUSATION: 500,
      SURVIVE_ROUND: 50,
      FALSE_ACCUSATION_PENALTY: -50
    }
  };
}
