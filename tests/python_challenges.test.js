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
