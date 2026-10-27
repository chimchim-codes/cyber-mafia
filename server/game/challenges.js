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

const PYTHON_CHALLENGES = [
  {
    id: 'CHAL-PY-1',
    stageNumber: 1,
    title: 'Find the Bypass Key',
    concept: 'String manipulation & .split()',
    difficulty: 'LEVEL 1 // FOUNDATION',
    rewardScore: 100,
    forensicContext: 'A corrupted gateway buffer packet was recovered from the firewall ingress router. Extract the administrative bypass key from the raw HTTP header using string operations.',
    instructions: 'Use Python string methods (such as .split()) to isolate the exact value of the "X-Bypass-Key" header.',
    initialCode: `# Challenge 1: Find the Bypass Key\n# Extract the value of X-Bypass-Key from the raw HTTP header string.\n\nheader = "Host: sec.local\\r\\nX-Bypass-Key: BYPASS-ELENA-WARD-99\\r\\nUser-Agent: Terminal/1.0"\n\n# TODO: Extract and print the value of X-Bypass-Key using string manipulation (e.g. .split())\n`,
    expected: 'BYPASS-ELENA-WARD-99',
    acceptedAlternatives: ['BYPASS-ELENA-WARD', 'BYPASS-ELENA-WARD-99'],
    hint: 'Split the header on "\\r\\n" or look for the line starting with "X-Bypass-Key:". Split that line on ": " to obtain the key.',
    unlocksEvidenceBatch: 2,
    unlockSummary: 'Unlocks Batch 2: Police interview with Dr. Sen, Ingress Syslog dump, and Felix Grant\'s shift notes.'
  },
  {
    id: 'CHAL-PY-2',
    stageNumber: 2,
    title: 'Identify the Suspicious Login',
    concept: 'Lists, Loops & Conditional Statements',
    difficulty: 'LEVEL 2 // INTERMEDIATE',
    rewardScore: 100,
    forensicContext: 'Noah Mercer\'s workstation auth logs recorded several login attempts right before terminal history was wiped. Identify the username that recorded a "FAILED" login event.',
    instructions: 'Iterate over the list of login records using a for loop and if statement to find and print the username with a "FAILED" status.',
    initialCode: `# Challenge 2: Identify the Suspicious Login\n# Search through login_records to find the username with "FAILED" status.\n\nlogin_records = [\n    ("mira_sen", "SUCCESS"),\n    ("noah_mercer", "SUCCESS"),\n    ("felix_grant", "SUCCESS"),\n    ("guest_temp", "FAILED"),\n    ("elena_ward", "SUCCESS")\n]\n\n# TODO: Iterate through login_records and print the username that has a "FAILED" status\n`,
    expected: 'guest_temp',
    acceptedAlternatives: ['guest_temp', '"guest_temp"'],
    hint: 'Iterate through each tuple (user, status) in login_records. Check if status == "FAILED", then print that user.',
    unlocksEvidenceBatch: 3,
    unlockSummary: 'Unlocks Batch 3: Noah Mercer\'s deleted bash history, Noah\'s interrogation transcript, and Dr. Sen\'s patent notice.'
  },
  {
    id: 'CHAL-PY-3',
    stageNumber: 3,
    title: 'Find the Impostor',
    concept: 'Membership Checks (in / not in) & Collections',
    difficulty: 'LEVEL 3 // ADVANCED',
    rewardScore: 100,
    forensicContext: 'Core database logs show an active account that executed elevated privileges. Cross-reference the logged usernames against the authorized personnel list to identify the unlisted impostor.',
    instructions: 'Identify which username in `logged_users` does NOT appear in `authorized_users`. Print the impostor\'s username.',
    initialCode: `# Challenge 3: Find the Impostor\n# Find the username in logged_users that is absent from authorized_users.\n\nauthorized_users = ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"]\nlogged_users = ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]\n\n# TODO: Find the username in logged_users that does NOT appear in authorized_users and print it\n`,
    expected: 'shadow_operator',
    acceptedAlternatives: ['shadow_operator', '"shadow_operator"'],
    hint: 'Use `if user not in authorized_users:` inside a loop over `logged_users` to spot the unauthorized account.',
    unlocksEvidenceBatch: 4,
    unlockSummary: 'Unlocks Batch 4: Rogue user database trace, Felix Grant\'s bribe confession, and chemical quarantine verification.'
  },
  {
    id: 'CHAL-PY-4',
    stageNumber: 4,
    title: 'Crack the Access Rule',
    concept: 'Boolean Logic & Dual-Condition Rules',
    difficulty: 'LEVEL 4 // SECURE ACCESS',
    rewardScore: 100,
    forensicContext: 'Adrian\'s private research sanctum was locked by an automated dual-authentication policy. Test the rule to determine the exact return status for user "elena_ward" with access code "SEC-7702".',
    instructions: 'Evaluate the access function. Ensure it requires BOTH that the user is authorized AND the code matches the valid code, then print the result.',
    initialCode: `# Challenge 4: Crack the Access Rule\n# Grant access only when user is authorized AND code matches valid_code.\n\ndef check_access(user, code):\n    authorized_users = ["elena_ward", "adrian_vale"]\n    valid_code = "SEC-7702"\n    \n    # TODO: Verify BOTH conditions: user must be in authorized_users AND code must equal valid_code.\n    # Return "ACCESS_GRANTED" if authorized, otherwise return "ACCESS_DENIED".\n    pass\n\n# TODO: Call check_access for user "elena_ward" with code "SEC-7702" and print the returned status\n`,
    expected: 'ACCESS_GRANTED',
    acceptedAlternatives: ['ACCESS_GRANTED', '"ACCESS_GRANTED"'],
    hint: 'Check if both conditions (user in authorized_users and code == valid_code) evaluate to True. It returns "ACCESS_GRANTED".',
    unlocksEvidenceBatch: 5,
    unlockSummary: 'Unlocks Batch 5: Elena\'s deleted offshore emails, door override logs, and the lounge witness statement.'
  },
  {
    id: 'CHAL-PY-5',
    stageNumber: 5,
    title: 'Server Access Investigation',
    concept: 'Structured Telemetry Log Parsing & Filtering',
    difficulty: 'LEVEL 5 // SENIOR FORENSICS',
    rewardScore: 100,
    forensicContext: 'Below are the structured authentication logs from the central gateway on the morning of the incident. Filter through timestamps, status codes (200, 401, 403), and messages to identify who completed the LATEST SUCCESSFUL login (status 200), ignoring all later failed or denied attempts.',
    instructions: 'Filter the list for entries where `status == 200`. Find the record with the latest timestamp and print the username of that user.',
    initialCode: `# Challenge 5: Server Access Investigation\n# Analyze structured authentication telemetry.\n# Identify the username responsible for the LATEST SUCCESSFUL login (status == 200).\n# Ignore subsequent failed (401) or forbidden (403) events.\n\nauth_logs = [\n    {"timestamp": "08:12:00", "user": "mira_sen", "status": 200, "ip": "10.0.1.12", "msg": "Auth OK - Workstation B"},\n    {"timestamp": "08:19:30", "user": "noah_mercer", "status": 200, "ip": "10.0.1.45", "msg": "Auth OK - Server Sub-1"},\n    {"timestamp": "08:24:10", "user": "felix_grant", "status": 200, "ip": "10.0.2.19", "msg": "Auth OK - Security Desk"},\n    {"timestamp": "08:31:45", "user": "elena_ward", "status": 200, "ip": "10.0.4.01", "msg": "Auth OK - Executive Gateway"},\n    {"timestamp": "08:34:10", "user": "felix_grant", "status": 401, "ip": "10.0.2.19", "msg": "Auth Failed - Bad Pin"},\n    {"timestamp": "08:38:00", "user": "mira_sen", "status": 403, "ip": "10.0.1.12", "msg": "Access Denied - Lockdown Active"},\n    {"timestamp": "08:42:15", "user": "noah_mercer", "status": 401, "ip": "10.0.1.45", "msg": "Auth Failed - Session Terminated"}\n]\n\n# TODO: Filter auth_logs for status == 200, identify the record with the latest timestamp, and print the username\n`,
    expected: 'elena_ward',
    acceptedAlternatives: ['elena_ward', '"elena_ward"'],
    hint: 'Filter for entries where status == 200. The timestamps are 08:12:00, 08:19:30, 08:24:10, and 08:31:45. 08:31:45 is the latest, belonging to elena_ward.',
    unlocksEvidenceBatch: 6,
    unlockSummary: 'Unlocks Final Batch 6: Master auth telemetry ledger, biometric fingerprint match report, and High Tribunal dossier!'
  }
];

// Generate Civilian CTF Lab Challenges from Locations & Python Stages
function generateCivilianLabChallenges() {
  return PYTHON_CHALLENGES;
}

module.exports = {
  INVESTIGATION_LOCATIONS,
  PYTHON_CHALLENGES,
  generateHackerChallenge,
  generateCivilianLabChallenges
};
