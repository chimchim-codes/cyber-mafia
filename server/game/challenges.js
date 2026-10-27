// server/game/challenges.js
// Crime scene locations, forensic challenges, evidence items, and hints for Dr. Adrian Vale case

const crypto = require('crypto');

// Investigation Locations for Dr. Adrian Vale murder case
const INVESTIGATION_LOCATIONS = [
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

// Generate randomized challenge for Hacker Attacks (if used)
function generateHackerChallenge(attackType, targetTeam, attackerTeam) {
  const challengeId = 'CHAL-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  switch (attackType) {
    case 'COOKIE_SHIFT': {
      const accessLevel = Math.floor(Math.random() * 8) + 2;
      const rawSession = `team=${targetTeam.id};role=user;access=0;module=evidence;auth=0x${crypto.randomBytes(2).toString('hex')}`;
      const base64Session = Buffer.from(rawSession).toString('base64');
      const targetSession = rawSession.replace('access=0', `access=${accessLevel}`);
      const expectedToken = Buffer.from(targetSession).toString('base64');
      const shortSig = 'CS-' + (Math.floor(Math.random() * 90) + 10);

      return {
        id: challengeId,
        type: 'COOKIE_SHIFT',
        title: 'Cookie Shift: Privilege Escalation',
        description: `Elevate access level from access=0 to access=${accessLevel} and encode to Base64.`,
        initialData: {
          cookieKey: 'SESSION_ID',
          rawEncoded: base64Session,
          decodedSample: rawSession,
          targetParameter: `access=${accessLevel}`
        },
        expectedSolution: expectedToken,
        signature: shortSig,
        hint: `Decode Base64, replace access=0 with access=${accessLevel}, and re-encode.`
      };
    }

    case 'TOKEN_HUNT': {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const fullToken = `${part1}-${part2}`;
      const fakeRoutes = [
        { path: '/archive/v1', data: `Fragment 1: ${part1}` },
        { path: '/debug/memdump', data: `Fragment 2: ${part2}` }
      ];

      return {
        id: challengeId,
        type: 'TOKEN_HUNT',
        title: 'Token Hunt: Secret Key Assembly',
        description: `Combine token fragments into format XX-YY.`,
        initialData: { routes: fakeRoutes },
        expectedSolution: fullToken,
        signature: 'TH-' + (Math.floor(Math.random() * 90) + 10),
        hint: 'Join Fragment 1 and Fragment 2 with a hyphen.'
      };
    }

    case 'ROUTE_BREAK': {
      const secretKey = 'root_' + targetTeam.id.toLowerCase() + '_' + crypto.randomBytes(2).toString('hex');
      const bypassRoute = `/system/maintenance/bypass?key=${secretKey}`;

      return {
        id: challengeId,
        type: 'ROUTE_BREAK',
        title: 'Route Break: Admin Traversal',
        description: `Assemble bypass path with discovered key.`,
        initialData: { key: secretKey },
        expectedSolution: bypassRoute,
        signature: 'RB-' + (Math.floor(Math.random() * 90) + 10),
        hint: `Path: /system/maintenance/bypass?key=${secretKey}`
      };
    }

    case 'PACKET_DECODE': {
      const words = ['VAULT_BREACH', 'ROOT_OVERRIDE', 'SESSION_KEY', 'CIPHER_PULSE'];
      const chosenWord = words[Math.floor(Math.random() * words.length)];
      const hexPayload = Buffer.from(chosenWord, 'utf-8').toString('hex').toUpperCase().match(/.{1,2}/g).join(' ');

      return {
        id: challengeId,
        type: 'PACKET_DECODE',
        title: 'Packet Decode: Hex PCAP Analysis',
        description: `Decode hex bytes into ASCII text.`,
        initialData: { hexPayload },
        expectedSolution: chosenWord,
        signature: 'PD-' + (Math.floor(Math.random() * 90) + 10),
        hint: 'Convert each hex byte into ASCII.'
      };
    }

    default:
      return null;
  }
}

// Generate Civilian CTF Lab Challenges from Locations
function generateCivilianLabChallenges() {
  return INVESTIGATION_LOCATIONS.map(loc => ({
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
    evidenceClue: `${loc.clueId} — ${loc.clueTitle}: ${loc.clueDescription}`
  }));
}

module.exports = {
  INVESTIGATION_LOCATIONS,
  generateHackerChallenge,
  generateCivilianLabChallenges
};
