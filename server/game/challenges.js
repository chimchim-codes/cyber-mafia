// server/game/challenges.js
// Authoritative challenge generation and verification

const crypto = require('crypto');

// Generate randomized challenge for Hacker Attacks
function generateHackerChallenge(attackType, targetTeam, attackerTeam) {
  const challengeId = 'CHAL-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  switch (attackType) {
    case 'COOKIE_SHIFT': {
      const accessLevel = Math.floor(Math.random() * 8) + 2; // e.g. 3
      const rawSession = `team=${targetTeam.id};role=user;access=0;module=evidence;auth=0x${crypto.randomBytes(2).toString('hex')}`;
      const base64Session = Buffer.from(rawSession).toString('base64');
      const targetSession = rawSession.replace('access=0', `access=${accessLevel}`);
      const expectedToken = Buffer.from(targetSession).toString('base64');
      const shortSig = 'CS-' + (Math.floor(Math.random() * 90) + 10);

      return {
        id: challengeId,
        type: 'COOKIE_SHIFT',
        title: 'Cookie Shift: Session Privilege Escalation',
        description: `Target ${targetTeam.id} uses a base64-encoded cookie. Decode the current payload, elevate access level from access=0 to access=${accessLevel}, and re-encode the forged cookie string.`,
        initialData: {
          cookieKey: 'SESSION_ID',
          rawEncoded: base64Session,
          decodedSample: rawSession,
          targetParameter: `access=${accessLevel}`
        },
        expectedSolution: expectedToken,
        signature: shortSig,
        hint: `Decode Base64 string, edit access parameter to access=${accessLevel}, then re-encode to Base64.`
      };
    }

    case 'TOKEN_HUNT': {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const fullToken = `${part1}-${part2}`;
      const fakeRoutes = [
        { path: '/home', data: '200 OK - Public portal' },
        { path: '/profile', data: '200 OK - Standard profile' },
        { path: '/archive/v1', data: `403 Forbidden - Fragment 1 located: ${part1}` },
        { path: '/debug/memdump', data: `200 OK - [DEBUG_LEAK] Fragment 2: ${part2}` },
        { path: '/system/status', data: '200 OK - All systems nominal' }
      ];

      return {
        id: challengeId,
        type: 'TOKEN_HUNT',
        title: 'Token Hunt: Multi-Endpoint Secret Extraction',
        description: `Scour target ${targetTeam.id}'s simulated endpoints to extract hidden token fragments and assemble the full secret key (Format: XX-YY).`,
        initialData: {
          routes: fakeRoutes
        },
        expectedSolution: fullToken,
        signature: 'TH-' + (Math.floor(Math.random() * 90) + 10),
        hint: 'Examine /archive/v1 and /debug/memdump to find both fragments, then join with a hyphen.'
      };
    }

    case 'ROUTE_BREAK': {
      const secretKey = 'root_' + targetTeam.id.toLowerCase() + '_' + crypto.randomBytes(2).toString('hex');
      const bypassRoute = `/system/maintenance/bypass?key=${secretKey}`;
      const routeHints = [
        'Endpoint prefix: /system',
        'Directory: /maintenance',
        'Action: /bypass',
        `Query Param: key=${secretKey}`
      ];

      return {
        id: challengeId,
        type: 'ROUTE_BREAK',
        title: 'Route Break: Hidden Admin Directory Traversal',
        description: `Construct the unauthenticated diagnostic path for target ${targetTeam.id} using discovered architectural breadcrumbs.`,
        initialData: {
          hints: routeHints,
          sampleBase: '/system'
        },
        expectedSolution: bypassRoute,
        signature: 'RB-' + (Math.floor(Math.random() * 90) + 10),
        hint: `Assemble the path: /system/maintenance/bypass?key=${secretKey}`
      };
    }

    case 'PACKET_DECODE': {
      const words = ['VAULT_BREACH', 'ROOT_OVERRIDE', 'SESSION_KEY', 'INJECT_PAYLOAD', 'CIPHER_PULSE', 'CS_NODE_BYPASS'];
      const chosenWord = words[Math.floor(Math.random() * words.length)];
      const hexPayload = Buffer.from(chosenWord, 'utf-8').toString('hex').toUpperCase().match(/.{1,2}/g).join(' ');

      return {
        id: challengeId,
        type: 'PACKET_DECODE',
        title: 'Packet Decode: Raw PCAP Stream Analysis',
        description: `Intercepted raw hex buffer from target ${targetTeam.id}'s ingress gateway. Decode the hex bytes into ASCII text.`,
        initialData: {
          source: `NODE-${targetTeam.id}`,
          destination: 'CORE_GATEWAY',
          hexPayload: hexPayload
        },
        expectedSolution: chosenWord,
        signature: 'PD-' + (Math.floor(Math.random() * 90) + 10),
        hint: 'Convert each hex pair (e.g. 43 -> C, 53 -> S) to ASCII characters.'
      };
    }

    default:
      return null;
  }
}

// Generate Civilian CTF Lab Challenges
function generateCivilianLabChallenges() {
  return [
    {
      id: 'LAB-B64-01',
      category: 'BASE64',
      title: 'Decoded Intercept Alpha',
      difficulty: 'EASY',
      rewardScore: 75,
      description: 'An intercepted stealth probe transmitted an obfuscated string. Decode it to reveal the ingress signature.',
      prompt: 'Intercepted payload: `Q1lCRVItTUFGSUEtTk9ERS0wNA==`',
      expected: 'CYBER-MAFIA-NODE-04',
      unlockedEvidenceType: 'NODE_AFFINITY',
      evidenceClue: 'Attacker node likely maps to a machine with Node ID ending in 04.'
    },
    {
      id: 'LAB-HEX-02',
      category: 'HEX',
      title: 'Memory Buffer Hex Dump',
      difficulty: 'EASY',
      rewardScore: 75,
      description: 'Convert this 8-byte hexadecimal trace found in the kernel ring buffer into plaintext.',
      prompt: 'Hex Stream: `43 53 2D 30 34 2D 56 41`',
      expected: 'CS-04-VA',
      unlockedEvidenceType: 'ATTACK_SIGNATURE',
      evidenceClue: 'Confirms Attack Signature CS-04 was executed via Vault API.'
    },
    {
      id: 'LAB-HASH-03',
      category: 'HASH_ID',
      title: 'Cryptographic Hash Identifier',
      difficulty: 'MEDIUM',
      rewardScore: 75,
      description: 'Identify the algorithm used for this 32-character hexadecimal digest: `5d41402abc4b2a76b9719d911017c592` (Options: MD5, SHA1, SHA256, BCRYPT).',
      prompt: 'Digest: `5d41402abc4b2a76b9719d911017c592`',
      expected: 'MD5',
      unlockedEvidenceType: 'ALGORITHM_PROFILE',
      evidenceClue: 'Attacker exploits weak MD5 legacy session hashes.'
    },
    {
      id: 'LAB-LOGIC-04',
      category: 'LOGIC',
      title: 'Logic Gate Relay Bypass',
      difficulty: 'MEDIUM',
      rewardScore: 75,
      description: 'Evaluate the output of the circuit: `(A AND NOT B) OR (C XOR D)` where A=1, B=0, C=1, D=1. Enter output 0 or 1.',
      prompt: 'Inputs: A=1, B=0, C=1, D=1. Circuit: (1 AND 1) OR (1 XOR 1) = 1 OR 0.',
      expected: '1',
      unlockedEvidenceType: 'CIRCUIT_REPAIR',
      evidenceClue: 'Repairs internal firewall filters, revealing precise timestamp stamps in logs.'
    },
    {
      id: 'LAB-PATTERN-05',
      category: 'PATTERN',
      title: 'Packet Interval Anomaly',
      difficulty: 'MEDIUM',
      rewardScore: 75,
      description: 'Detect the rogue heartbeat interval (in ms) from the sequence: [1000, 1000, 1000, 350, 1000, 1000]. What is the outlier number?',
      prompt: 'Heartbeat sequence: 1000, 1000, 1000, 350, 1000, 1000',
      expected: '350',
      unlockedEvidenceType: 'BEACON_FREQUENCY',
      evidenceClue: 'Identified malicious C2 beacon frequency of 350ms.'
    },
    {
      id: 'LAB-STEGO-06',
      category: 'STEGO',
      title: 'Hidden Header Extraction',
      difficulty: 'HARD',
      rewardScore: 100,
      description: 'Look at this raw HTTP header block and find the custom secret header value for `X-Infiltrate-ID`:\n`Host: c07.sec.lan\\nUser-Agent: Mozilla/5.0\\nX-Infiltrate-ID: PHANTOM-99\\nAccept: */*`',
      prompt: 'Extract the value of X-Infiltrate-ID',
      expected: 'PHANTOM-99',
      unlockedEvidenceType: 'ACTOR_TAG',
      evidenceClue: 'The attacker tagged their packet with handle PHANTOM-99.'
    }
  ];
}

module.exports = {
  generateHackerChallenge,
  generateCivilianLabChallenges
};
