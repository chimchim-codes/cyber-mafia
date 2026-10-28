// tests/python_challenges.test.js
// Unit tests for Python challenge coding workspace, transpiler, and authoritative logic verification

const test = require('node:test');
const assert = require('node:assert/strict');

// Import challenges definition from server
const { PYTHON_CHALLENGES } = require('../server/game/challenges');

// Import runner functions (using dynamic import or transpiled runner)
test('Python Challenges: Starter Code Scaffolding (No Solution Leaks)', () => {
  assert.equal(PYTHON_CHALLENGES.length, 5);

  PYTHON_CHALLENGES.forEach((chal) => {
    // 1. Initial code must contain problem setup and # TODO comment
    assert.ok(chal.initialCode.includes('# TODO'), `Stage ${chal.stageNumber} must contain # TODO prompt`);

    // 2. Initial code must NOT contain the final print of the answer
    assert.ok(
      !chal.initialCode.includes(`print("${chal.expected}")`) &&
      !chal.initialCode.includes(`print('${chal.expected}')`),
      `Stage ${chal.stageNumber} starter code must not contain hardcoded print of solution`
    );
  });

  // Stage 1 specific checks: must not contain lines.split or pre-filled extraction
  const chal1 = PYTHON_CHALLENGES[0];
  assert.ok(!chal1.initialCode.includes('bypass_key = ""'), 'Stage 1 must not pre-define bypass_key');
  assert.ok(!chal1.initialCode.includes('print(bypass_key)'), 'Stage 1 must not pre-print bypass_key');

  // Stage 2 specific checks: must not contain pre-filled loop
  const chal2 = PYTHON_CHALLENGES[1];
  assert.ok(!chal2.initialCode.includes('suspicious_user = ""'), 'Stage 2 must not pre-define suspicious_user');
  assert.ok(!chal2.initialCode.includes('print(suspicious_user)'), 'Stage 2 must not pre-print suspicious_user');

  // Stage 3 specific checks: must not contain pre-filled loop
  const chal3 = PYTHON_CHALLENGES[2];
  assert.ok(!chal3.initialCode.includes('impostor = ""'), 'Stage 3 must not pre-define impostor');
  assert.ok(!chal3.initialCode.includes('print(impostor)'), 'Stage 3 must not pre-print impostor');

  // Stage 4 specific checks: must not have pre-filled return "ACCESS_GRANTED"
  const chal4 = PYTHON_CHALLENGES[3];
  assert.ok(!chal4.initialCode.includes('return "ACCESS_GRANTED"'), 'Stage 4 must not pre-fill ACCESS_GRANTED');
  assert.ok(chal4.initialCode.includes('pass'), 'Stage 4 should provide pass stub');

  // Stage 5 specific checks: must not have pre-filled list comprehension
  const chal5 = PYTHON_CHALLENGES[4];
  assert.ok(!chal5.initialCode.includes('successful_logins = ['), 'Stage 5 must not pre-fill successful_logins comprehension');
  assert.ok(!chal5.initialCode.includes('latest_successful = max'), 'Stage 5 must not pre-fill latest_successful calculation');
});

test('Python Runner: Authorship & Proper Way Verification', async () => {
  // Dynamically import pythonRunner from client/src/utils/pythonRunner.js
  const runner = await import('../client/src/utils/pythonRunner.js');

  // Challenge 1: Correct dynamic solution
  const c1ValidCode = `
header = "Host: sec.local\\r\\nX-Bypass-Key: BYPASS-ELENA-WARD-99\\r\\nUser-Agent: Terminal/1.0"
lines = header.split("\\r\\n")
for line in lines:
    if line.startswith("X-Bypass-Key:"):
        print(line.split(": ")[1])
`;
  const res1 = runner.executePythonCode(c1ValidCode, 'CHAL-PY-1');
  assert.equal(res1.success, true);
  assert.equal(res1.isVerified, true);
  assert.equal(res1.result, 'BYPASS-ELENA-WARD-99');

  // Challenge 1: Hardcoded cheat bypass attempt
  const c1Cheat = `print("BYPASS-ELENA-WARD-99")`;
  const res1Cheat = runner.executePythonCode(c1Cheat, 'CHAL-PY-1');
  assert.equal(res1Cheat.isVerified, false, 'Hardcoded cheat must not verify');
  assert.match(res1Cheat.feedback, /Bypass detected/i);

  // Challenge 2: Correct dynamic solution
  const c2ValidCode = `
login_records = [
    ("mira_sen", "SUCCESS"),
    ("noah_mercer", "SUCCESS"),
    ("felix_grant", "SUCCESS"),
    ("guest_temp", "FAILED"),
    ("elena_ward", "SUCCESS")
]
for user, status in login_records:
    if status == "FAILED":
        print(user)
`;
  const res2 = runner.executePythonCode(c2ValidCode, 'CHAL-PY-2');
  assert.equal(res2.success, true);
  assert.equal(res2.isVerified, true);
  assert.equal(res2.result, 'guest_temp');

  // Challenge 2: Hardcoded cheat attempt
  const c2Cheat = `print("guest_temp")`;
  const res2Cheat = runner.executePythonCode(c2Cheat, 'CHAL-PY-2');
  assert.equal(res2Cheat.isVerified, false);

  // Challenge 3: Correct dynamic solution
  const c3ValidCode = `
authorized_users = ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"]
logged_users = ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]
for user in logged_users:
    if user not in authorized_users:
        print(user)
`;
  const res3 = runner.executePythonCode(c3ValidCode, 'CHAL-PY-3');
  assert.equal(res3.success, true);
  assert.equal(res3.isVerified, true);
  assert.equal(res3.result, 'shadow_operator');

  // Challenge 4: Correct dynamic solution
  const c4ValidCode = `
def check_access(user, code):
    authorized_users = ["elena_ward", "adrian_vale"]
    valid_code = "SEC-7702"
    if user in authorized_users and code == valid_code:
        return "ACCESS_GRANTED"
    else:
        return "ACCESS_DENIED"

print(check_access("elena_ward", "SEC-7702"))
`;
  const res4 = runner.executePythonCode(c4ValidCode, 'CHAL-PY-4');
  assert.equal(res4.success, true);
  assert.equal(res4.isVerified, true);
  assert.equal(res4.result, 'ACCESS_GRANTED');

  // Challenge 5: Correct dynamic solution
  const c5ValidCode = `
auth_logs = [
    {"timestamp": "08:12:00", "user": "mira_sen", "status": 200},
    {"timestamp": "08:31:45", "user": "elena_ward", "status": 200},
    {"timestamp": "08:34:10", "user": "felix_grant", "status": 401}
]
successful = [log for log in auth_logs if log["status"] == 200]
latest = max(successful, key=lambda x: x["timestamp"])
print(latest["user"])
`;
  const res5 = runner.executePythonCode(c5ValidCode, 'CHAL-PY-5');
  assert.equal(res5.success, true);
  assert.equal(res5.isVerified, true);
  assert.equal(res5.result, 'elena_ward');

  // Error handling: Syntax error
  const syntaxErrorCode = `
for x in
    print(x)
`;
  const resSyntax = runner.executePythonCode(syntaxErrorCode, 'CHAL-PY-1');
  assert.equal(resSyntax.isVerified, false);
  assert.match(resSyntax.output, /Traceback/i);

  // Wrong output
  const wrongCode = `
header = "Host: sec.local"
print("WRONG_KEY")
`;
  const resWrong = runner.executePythonCode(wrongCode, 'CHAL-PY-1');
  assert.equal(resWrong.isVerified, false);
  assert.match(resWrong.feedback, /does not match/i);
});

// Import Authoritative Validator and Services for Comprehensive Requirement Verification
const { validatePythonChallenge } = require('../server/game/challengeValidator');
const gameActionHandler = require('../api/game-action');
const gameService = require('../server/services/gameService');
const { resetMemoryStore, getServiceClient } = require('../server/db/supabaseClient');
const { spawnSync } = require('child_process');
const fs = require('fs');

test('1. A hardcoded print(expected_answer) submission is rejected', () => {
  const cheat1 = 'print("BYPASS-ELENA-WARD-99")';
  const r1 = validatePythonChallenge(cheat1, 'CHAL-PY-1');
  assert.equal(r1.isVerified, false);
  assert.match(r1.feedback || r1.error, /Bypass detected|Algorithmic requirement/i);

  const cheat2 = 'print("guest_temp")';
  const r2 = validatePythonChallenge(cheat2, 'CHAL-PY-2');
  assert.equal(r2.isVerified, false);

  const cheat3 = 'print("shadow_operator")';
  const r3 = validatePythonChallenge(cheat3, 'CHAL-PY-3');
  assert.equal(r3.isVerified, false);

  const cheat5 = 'print("elena_ward")';
  const r5 = validatePythonChallenge(cheat5, 'CHAL-PY-5');
  assert.equal(r5.isVerified, false);
});

test('2. A constant return value fails when different inputs require different outputs', () => {
  const constantReturn = `
def check_access(user, code):
    return "ACCESS_GRANTED"
`;
  const res = validatePythonChallenge(constantReturn, 'CHAL-PY-4');
  assert.equal(res.isVerified, false);
  assert.match(res.feedback || res.error, /constant value|Algorithmic requirement/i);
});

test('3. A solution that hardcodes visible test cases fails hidden tests', () => {
  // Hardcodes check only for visible elena_ward/SEC-7702, ignoring other authorized users
  const visibleHardcode = `
def check_access(user, code):
    if user == "elena_ward" and code == "SEC-7702":
        return "ACCESS_GRANTED"
    return "ACCESS_DENIED"
`;
  const res = validatePythonChallenge(visibleHardcode, 'CHAL-PY-4');
  assert.equal(res.isVerified, false);
  assert.match(res.feedback || res.error, /hidden test/i);
});

test('4. A correct algorithm using valid input passes', () => {
  const c1Valid = `
header = "Host: sec.local\\r\\nX-Bypass-Key: BYPASS-ELENA-WARD-99\\r\\nUser-Agent: Terminal/1.0"
lines = header.split("\\r\\n")
for line in lines:
    if line.startswith("X-Bypass-Key:"):
        print(line.split(": ")[1])
`;
  const r1 = validatePythonChallenge(c1Valid, 'CHAL-PY-1');
  assert.equal(r1.isVerified, true);
  assert.equal(r1.cleanOutput, 'BYPASS-ELENA-WARD-99');

  const c2Valid = `
login_records = [
    ("mira_sen", "SUCCESS"),
    ("noah_mercer", "SUCCESS"),
    ("felix_grant", "SUCCESS"),
    ("guest_temp", "FAILED"),
    ("elena_ward", "SUCCESS")
]
for user, status in login_records:
    if status == "FAILED":
        print(user)
`;
  const r2 = validatePythonChallenge(c2Valid, 'CHAL-PY-2');
  assert.equal(r2.isVerified, true);
  assert.equal(r2.cleanOutput, 'guest_temp');

  const c3Valid = `
authorized_users = ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"]
logged_users = ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]
for user in logged_users:
    if user not in authorized_users:
        print(user)
`;
  const r3 = validatePythonChallenge(c3Valid, 'CHAL-PY-3');
  assert.equal(r3.isVerified, true);
  assert.equal(r3.cleanOutput, 'shadow_operator');

  const c4Valid = `
def check_access(user, code):
    authorized_users = ["elena_ward", "adrian_vale"]
    valid_code = "SEC-7702"
    if user in authorized_users and code == valid_code:
        return "ACCESS_GRANTED"
    return "ACCESS_DENIED"

print(check_access("elena_ward", "SEC-7702"))
`;
  const r4 = validatePythonChallenge(c4Valid, 'CHAL-PY-4');
  assert.equal(r4.isVerified, true);
  assert.equal(r4.cleanOutput, 'ACCESS_GRANTED');

  const c5Valid = `
auth_logs = [
    {"timestamp": "08:12:00", "user": "mira_sen", "status": 200, "ip": "10.0.1.12"},
    {"timestamp": "08:31:45", "user": "elena_ward", "status": 200, "ip": "10.0.4.01"},
    {"timestamp": "08:34:10", "user": "felix_grant", "status": 401, "ip": "10.0.2.19"}
]
ok_logs = [log for log in auth_logs if log["status"] == 200]
latest = max(ok_logs, key=lambda x: x["timestamp"])
print(latest["user"])
`;
  const r5 = validatePythonChallenge(c5Valid, 'CHAL-PY-5');
  assert.equal(r5.isVerified, true);
  assert.equal(r5.cleanOutput, 'elena_ward');
});

test('5. Alternative correct implementations pass', () => {
  // C1 alternative: splitlines()
  const c1Alt = `
header = "Host: sec.local\\r\\nX-Bypass-Key: BYPASS-ELENA-WARD-99\\r\\nUser-Agent: Terminal/1.0"
for line in header.splitlines():
    if "X-Bypass-Key:" in line:
        print(line.split(":")[1].strip())
`;
  const r1 = validatePythonChallenge(c1Alt, 'CHAL-PY-1');
  assert.equal(r1.isVerified, true);

  // C2 alternative: list comprehension
  const c2Alt = `
login_records = [("mira_sen", "SUCCESS"), ("guest_temp", "FAILED")]
failed = [u for u, s in login_records if s == "FAILED"]
print(failed[0])
`;
  const r2 = validatePythonChallenge(c2Alt, 'CHAL-PY-2');
  assert.equal(r2.isVerified, true);

  // C3 alternative: set difference
  const c3Alt = `
authorized_users = ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"]
logged_users = ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]
diff = set(logged_users) - set(authorized_users)
for u in logged_users:
    if u in diff:
        print(u)
        break
`;
  const r3 = validatePythonChallenge(c3Alt, 'CHAL-PY-3');
  assert.equal(r3.isVerified, true);
});

test('6. Incorrect output fails', () => {
  const c1Wrong = `
header = "Host: sec.local\\r\\nX-Bypass-Key: KEY-99"
lines = header.split()
print("COMPLETELY_WRONG_OUTPUT")
`;
  const res = validatePythonChallenge(c1Wrong, 'CHAL-PY-1');
  assert.equal(res.isVerified, false);
});

test('7. Syntax errors and runtime errors fail safely', () => {
  // Syntax error
  const syntaxErr = `
for x in
    print(x)
`;
  const rSyn = validatePythonChallenge(syntaxErr, 'CHAL-PY-1');
  assert.equal(rSyn.isVerified, false);
  assert.match(rSyn.error, /SyntaxError/i);

  // Runtime error (division by zero)
  const runtimeErr = `
header = "Host: sec.local\\r\\nX-Bypass-Key: 123"
lines = header.split()
x = 1 / 0
print(x)
`;
  const rRun = validatePythonChallenge(runtimeErr, 'CHAL-PY-1');
  assert.equal(rRun.isVerified, false);
  assert.match(rRun.error || rRun.feedback, /ZeroDivisionError/i);
});

test('8. Infinite loops time out without affecting the rest of the application', () => {
  const infiniteLoop = `
header = "Host: sec.local\\r\\nX-Bypass-Key: 123"
lines = header.split()
while True:
    pass
`;
  const start = Date.now();
  const res = validatePythonChallenge(infiniteLoop, 'CHAL-PY-1');
  const elapsed = Date.now() - start;

  assert.equal(res.isVerified, false);
  assert.equal(res.error, 'Execution timed out');
  assert.ok(elapsed >= 2000 && elapsed <= 5000, `Execution should time out around 2.5s, took ${elapsed}ms`);
});

test('9. A player cannot unlock the next level by modifying frontend state or directly calling an endpoint', async () => {
  resetMemoryStore();
  const sessionId = 'test-security-session';
  await gameService.getOrCreateSession(sessionId);
  await gameService.joinTeam(sessionId, 'Test Squad', 'C01');

  const invokeAction = async (payload) => {
    let status = null;
    let body = null;
    const req = {
      method: 'POST',
      headers: {},
      body: { action: 'SOLVE_CIVILIAN_CHALLENGE', sessionId, teamId: 'C01', payload }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        status = code;
        return {
          json: (data) => { body = data; return res; },
          end: () => res
        };
      }
    };
    await gameActionHandler(req, res);
    return { status, body };
  };

  // Attempt 1: Calling endpoint with only answer and no code
  const r1 = await invokeAction({ challengeId: 'CHAL-PY-1', answer: 'BYPASS-ELENA-WARD-99', stageNumber: 1 });
  assert.equal(r1.status, 400);
  assert.equal(r1.body.success, false);
  assert.match(r1.body.message, /Valid Python solution code is required/i);

  // Attempt 2: Calling endpoint with hardcoded cheat code
  const r2 = await invokeAction({
    challengeId: 'CHAL-PY-1',
    code: 'print("BYPASS-ELENA-WARD-99")',
    stageNumber: 1
  });
  assert.equal(r2.body.success, false);
  assert.equal(r2.body.isVerified, false);

  // Verify Stage 1 is still NOT completed in database
  const supabase = getServiceClient();
  const { data: teamBefore } = await supabase.from('teams').select('completed_stages').eq('session_id', sessionId).eq('id', 'C01').single();
  assert.equal(teamBefore.completed_stages || 0, 0);

  // Attempt 3: Calling endpoint to skip directly to Stage 3 without completing Stage 1
  const r3 = await invokeAction({
    challengeId: 'CHAL-PY-3',
    code: 'authorized_users = []; logged_users = []\nprint("shadow_operator")',
    stageNumber: 3
  });
  assert.equal(r3.status, 400);
  assert.match(r3.body.message, /Stage 3 is locked/i);
});

test('10. Hidden test cases and expected answers are not exposed to the client', () => {
  const caseDataContent = fs.readFileSync(require.resolve('../client/src/data/caseData.js'), 'utf8');

  // Verify expected answers are not defined in client caseData PYTHON_CHALLENGES
  assert.ok(!caseDataContent.includes("expected: 'BYPASS-ELENA-WARD-99'"));
  assert.ok(!caseDataContent.includes("expected: 'guest_temp'"));
  assert.ok(!caseDataContent.includes("expected: 'shadow_operator'"));
  assert.ok(!caseDataContent.includes("expected: 'ACCESS_GRANTED'"));
  assert.ok(!caseDataContent.includes("expected: 'elena_ward'"));

  // Verify hidden test inputs are not present in client caseData
  assert.ok(!caseDataContent.includes('SIGMA-DELTA-8812'));
  assert.ok(!caseDataContent.includes('rogue_infiltrator'));
  assert.ok(!caseDataContent.includes('ghost_protocol'));
  assert.ok(!caseDataContent.includes('target_winner'));
});

test('11. The Python coding system continues to work after player-management and leaderboard integration', async () => {
  resetMemoryStore();
  const sessionId = 'test-integration-session';
  await gameService.getOrCreateSession(sessionId);
  const team = await gameService.joinTeam(sessionId, 'Investigator', 'S01', 'client-1', {
    teamName: 'Elite Security Squad',
    systemNo: 'SYS-10'
  });
  assert.equal(team.name, 'Elite Security Squad');

  let status = null;
  let body = null;
  const req = {
    method: 'POST',
    headers: {},
    body: {
      action: 'SOLVE_CIVILIAN_CHALLENGE',
      sessionId,
      teamId: 'S01',
      payload: {
        challengeId: 'CHAL-PY-1',
        code: `
header = "Host: sec.local\\r\\nX-Bypass-Key: BYPASS-ELENA-WARD-99\\r\\nUser-Agent: Terminal/1.0"
lines = header.split("\\r\\n")
for line in lines:
    if line.startswith("X-Bypass-Key:"):
        print(line.split(": ")[1])
`,
        stageNumber: 1
      }
    }
  };
  const res = {
    setHeader: () => {},
    status: (code) => {
      status = code;
      return {
        json: (data) => { body = data; return res; },
        end: () => res
      };
    }
  };

  await gameActionHandler(req, res);
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.isVerified, true);
  assert.equal(body.nextStage, 2);

  // Verify score and leaderboard reflected the solve
  const leaderboard = await gameService.getLeaderboard(sessionId);
  const myLeaderboardEntry = leaderboard.find(e => (e.teamId === 'S01' || e.id === 'S01'));
  assert.ok(myLeaderboardEntry, 'Leaderboard entry for S01 should exist');
  assert.ok(myLeaderboardEntry.score >= 100, 'Score should be at least 100');
  assert.equal(myLeaderboardEntry.completedLevels ?? myLeaderboardEntry.completedStages, 1);
});

test('12. The production build succeeds', () => {
  const result = spawnSync('npm', ['run', 'build'], {
    encoding: 'utf8',
    timeout: 60000
  });
  assert.equal(result.status, 0, `Build failed:\n${result.stdout}\n${result.stderr}`);
});
