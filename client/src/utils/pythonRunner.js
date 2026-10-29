// client/src/utils/pythonRunner.js
// Safe in-browser Python execution simulator & forensic validator for the 5 False Trials coding challenges

/**
 * Transpiles Python 3 code into executable JavaScript for the sandboxed runner.
 */
export function transpilePython(code) {
  // Pre-process: convert python tuples (a, b) not preceded by function calls to JS arrays [a, b]
  let preprocessed = code.replace(
    /(?<![a-zA-Z0-9_])\(\s*("[^"]*?"|\x27[^\x27]*?\x27|\d+)\s*,\s*("[^"]*?"|\x27[^\x27]*?\x27|\d+)\s*\)/g,
    "[$1, $2]"
  );

  const lines = preprocessed.split(/\r?\n/);
  const jsLines = [];
  const indentStack = [0];
  const assignedVars = new Set();
  let openBrackets = 0;

  function replaceComprehensions(str) {
    let idx = 0;
    while ((idx = str.indexOf("[", idx)) !== -1) {
      let depth = 1;
      let end = idx + 1;
      while (end < str.length && depth > 0) {
        if (str[end] === "[") depth++;
        else if (str[end] === "]") depth--;
        end++;
      }
      if (depth === 0) {
        const inner = str.slice(idx + 1, end - 1);
        const match = inner.match(/^([\s\S]+?)\s+for\s+([a-zA-Z0-9_,\s]+?)\s+in\s+([\s\S]+?)$/);
        if (match) {
          const exp = match[1].trim();
          const vars = match[2].trim();
          const rest = match[3].trim();
          const v = vars.includes(",") ? `[${vars}]` : vars;
          let iter = rest;
          let cond = null;
          const ifIdx = rest.lastIndexOf(" if ");
          if (ifIdx !== -1) {
            iter = rest.slice(0, ifIdx).trim();
            cond = rest.slice(ifIdx + 4).trim();
          }
          let replacement = "";
          if (cond) {
            replacement = `(${transformExpr(iter)}).filter((${v}) => (${transformExpr(cond)})).map((${v}) => (${transformExpr(exp)}))`;
          } else {
            replacement = `(${transformExpr(iter)}).map((${v}) => (${transformExpr(exp)}))`;
          }
          str = str.slice(0, idx) + replacement + str.slice(end);
          idx += replacement.length;
          continue;
        }
      }
      idx++;
    }
    return str;
  }

  function transformExpr(expr) {
    let res = replaceComprehensions(expr);

    // Python lambdas
    res = res.replace(/key\s*=\s*lambda\s+([a-zA-Z0-9_]+):\s*([^,)]+)/g, "((__item) => { const $1 = __item; return $2; })");
    res = res.replace(/\blambda\s+([a-zA-Z0-9_,\s]+):\s*([^,)]+)/g, "(($1) => $2)");

    // In / not in operators with support for strings (both single and double quotes), function calls, arrays, identifiers
    res = res.replace(/((?:'[^']*'|"[^"]*"|[a-zA-Z0-9_().\-\[\]])+)\s+not\s+in\s+((?:'[^']*'|"[^"]*"|\[[^\]]*\]|[a-zA-Z0-9_().\-\[\]])+)/g, "!__py_in($1, $2)");
    res = res.replace(/((?:'[^']*'|"[^"]*"|[a-zA-Z0-9_().\-\[\]])+)\s+in\s+((?:'[^']*'|"[^"]*"|\[[^\]]*\]|[a-zA-Z0-9_().\-\[\]])+)/g, "__py_in($1, $2)");

    // Boolean operators & literals
    res = res
      .replace(/\band\b/g, "&&")
      .replace(/\bor\b/g, "||")
      .replace(/\bnot\b/g, "!")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null");

    // Negative indexing: arr[-1] -> arr.at(-1)
    res = res.replace(/\[\s*-\s*(\d+)\s*\]/g, ".at(-$1)");

    return res;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      jsLines.push(trimmed.startsWith("#") ? "// " + trimmed.slice(1) : "");
      continue;
    }

    const indent = rawLine.search(/\S/);

    // Emit closing braces when dedenting
    if (openBrackets === 0) {
      while (indent < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        jsLines.push(" ".repeat(indentStack[indentStack.length - 1]) + "}");
      }
    }

    let line = trimmed;

    // Track brackets count across multi-line definitions
    for (const ch of line) {
      if (ch === "[" || ch === "{" || ch === "(") openBrackets++;
      else if (ch === "]" || ch === "}" || ch === ")") openBrackets = Math.max(0, openBrackets - 1);
    }

    // Detect LHS variable assignments to pre-declare with var
    const assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*=[^=]/);
    if (assignMatch && openBrackets === 0) {
      const vars = assignMatch[1].split(",").map(v => v.trim());
      vars.forEach(v => {
        if (!v.includes("[") && !v.includes(".")) assignedVars.add(v);
      });
    }

    // Function definition: def name(args):
    if (line.startsWith("def ")) {
      line = line.replace(/^def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):$/, "function $1($2) {");
      indentStack.push(indent + 4);
      jsLines.push(" ".repeat(indent) + line);
      continue;
    }

    // For loop: for var in iter:
    if (line.startsWith("for ")) {
      const forMatch = line.match(/^for\s+(.+?)\s+in\s+(.+?):$/);
      if (forMatch) {
        const target = forMatch[1].trim();
        const iterable = transformExpr(forMatch[2].trim());
        const loopVar = target.includes(",") ? `[${target}]` : target;
        line = `for (let ${loopVar} of (${iterable})) {`;
        indentStack.push(indent + 4);
        jsLines.push(" ".repeat(indent) + line);
        continue;
      }
    }

    // Conditionals: if, elif, else
    if (line.startsWith("if ")) {
      const cond = transformExpr(line.slice(3, -1).trim());
      line = `if (${cond}) {`;
      indentStack.push(indent + 4);
      jsLines.push(" ".repeat(indent) + line);
      continue;
    } else if (line.startsWith("elif ")) {
      const cond = transformExpr(line.slice(5, -1).trim());
      line = `else if (${cond}) {`;
      indentStack.push(indent + 4);
      jsLines.push(" ".repeat(indent) + line);
      continue;
    } else if (line === "else:") {
      line = `else {`;
      indentStack.push(indent + 4);
      jsLines.push(" ".repeat(indent) + line);
      continue;
    }

    // While loop: while cond:
    if (line.startsWith("while ")) {
      const cond = transformExpr(line.slice(6, -1).trim());
      line = `while (${cond}) {`;
      indentStack.push(indent + 4);
      jsLines.push(" ".repeat(indent) + line);
      continue;
    }

    // Pass statement
    if (line === "pass") {
      jsLines.push(" ".repeat(indent) + "/* pass */;");
      continue;
    }

    line = transformExpr(line);

    // Semicolon insertion
    const endsWithOpen = /[,\[\{\(]$/.test(line);
    const semicolon = (openBrackets > 0 || endsWithOpen || line.endsWith("{") || line.endsWith("}")) ? "" : ";";

    jsLines.push(" ".repeat(indent) + line + semicolon);
  }

  // Close remaining open indentation blocks
  while (indentStack.length > 1) {
    indentStack.pop();
    jsLines.push(" ".repeat(indentStack[indentStack.length - 1]) + "}");
  }

  const varDeclarations = assignedVars.size > 0 ? `var ${Array.from(assignedVars).join(", ")};\n` : "";
  return varDeclarations + jsLines.join("\n");
}

/**
 * Validates that the solution was achieved through the proper coding logic,
 * rather than hardcoding the expected string directly.
 */
function verifyProperForensicLogic(code, challengeId, cleanOutput) {
  const codeLines = (code || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const cleanCode = codeLines.join('\n');
  const normalized = cleanCode.toLowerCase();

  // Obvious single hardcoded print check
  if (codeLines.length === 1 && codeLines[0].startsWith('print(')) {
    return {
      valid: false,
      reason: "Bypass detected: Submissions that only print a constant answer without implementing logic are rejected."
    };
  }

  if (challengeId === 'CHAL-PY-1') {
    // Challenge 1: Find the Bypass Key
    // Must parse from header using string methods
    const usesHeader = normalized.includes('header');
    const usesStringOps = normalized.includes('split') || 
                          normalized.includes('find') || 
                          normalized.includes('index') || 
                          normalized.includes('replace') || 
                          normalized.includes('splitlines') ||
                          normalized.includes('slice') ||
                          normalized.includes('re.') ||
                          normalized.includes('[');

    if (!usesHeader || !usesStringOps) {
      return {
        valid: false,
        reason: "Bypass detected: Please extract the key dynamically from the 'header' string using string methods (.split()) instead of hardcoding."
      };
    }
  }

  if (challengeId === 'CHAL-PY-2') {
    // Challenge 2: Identify the Suspicious Login
    // Must examine login_records for status == "FAILED"
    const usesRecords = normalized.includes('login_records');
    const checksFailed = normalized.includes('failed');
    const usesIteration = normalized.includes('for ') || normalized.includes('while ') || normalized.includes('filter') || normalized.includes('[');

    if (!usesRecords || !checksFailed || !usesIteration) {
      return {
        valid: false,
        reason: "Bypass detected: Please loop through 'login_records' and check for the 'FAILED' status instead of hardcoding the username."
      };
    }
  }

  if (challengeId === 'CHAL-PY-3') {
    // Challenge 3: Find the Impostor
    // Must check membership between logged_users and authorized_users
    const usesLists = normalized.includes('logged_users') && normalized.includes('authorized_users');
    const usesMembership = normalized.includes('not in') || normalized.includes('in ') || normalized.includes('set') || normalized.includes('filter') || normalized.includes('difference');

    if (!usesLists || !usesMembership) {
      return {
        valid: false,
        reason: "Bypass detected: Please cross-reference 'logged_users' against 'authorized_users' with a membership check (e.g. 'not in') instead of hardcoding."
      };
    }
  }

  if (challengeId === 'CHAL-PY-4') {
    // Challenge 4: Crack the Access Rule
    // Must evaluate access condition dynamically (checking user and code)
    const hasDualCondition = normalized.includes('and') || normalized.includes('&&') || (normalized.includes('authorized_users') && (normalized.includes('valid_code') || normalized.includes('sec-7702')));
    const hasComparison = normalized.includes('in') || normalized.includes('==') || normalized.includes('if');

    if (normalized.includes('return "access_granted"') && !normalized.includes('if ') && !normalized.includes('else')) {
      return {
        valid: false,
        reason: "Bypass detected: 'check_access' cannot return a constant value; it must evaluate access conditions dynamically."
      };
    }

    if (!hasDualCondition || !hasComparison) {
      return {
        valid: false,
        reason: "Bypass detected: Please evaluate the access condition dynamically (checking both user authorization and code match) instead of hardcoding."
      };
    }
  }

  if (challengeId === 'CHAL-PY-5') {
    // Challenge 5: Server Access Investigation
    // Must filter auth_logs on status == 200 and select latest timestamp
    const usesLogs = normalized.includes('auth_logs');
    const checks200 = normalized.includes('200');

    if (!usesLogs || !checks200) {
      return {
        valid: false,
        reason: "Bypass detected: Please filter 'auth_logs' for status == 200 and identify the latest timestamp instead of hardcoding."
      };
    }
  }

  return { valid: true };
}

/**
 * Extracts candidate answer from output lines, supporting prefixes, labels, or exact matches.
 */
function extractCandidateAnswer(outputLines, expected, alts = []) {
  if (!outputLines || outputLines.length === 0) return '';
  const allCandidates = [expected, ...alts].filter(Boolean);

  for (let i = outputLines.length - 1; i >= 0; i--) {
    let line = (outputLines[i] || '').trim();
    if (!line) continue;

    if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith("'") && line.endsWith("'"))) {
      line = line.slice(1, -1).trim();
    }

    // Direct match
    for (const cand of allCandidates) {
      if (line.toLowerCase() === cand.toLowerCase()) {
        return cand;
      }
    }

    // Match after colon: e.g. "Key: BYPASS-ELENA-WARD-99"
    if (line.includes(':')) {
      const afterColon = line.split(':').pop().trim().replace(/^["']|["']$/g, '');
      for (const cand of allCandidates) {
        if (afterColon.toLowerCase() === cand.toLowerCase()) {
          return cand;
        }
      }
    }

    // Match word tokens in line
    const tokens = line.split(/[\s,()\[\]{}"']+/).filter(Boolean);
    for (const tok of tokens) {
      for (const cand of allCandidates) {
        if (tok.toLowerCase() === cand.toLowerCase()) {
          return cand;
        }
      }
    }
  }

  const lastLine = [...outputLines].reverse().find(l => l && l.trim().length > 0) || '';
  return lastLine.replace(/^["']|["']$/g, '').trim();
}

/**
 * Executes user Python code safely and validates the result.
 */
export function executePythonCode(code, challengeId, challengeMeta = null) {
  const outputLines = [];
  const print = (...args) => {
    outputLines.push(
      args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')
    );
  };

  const __py_in = (item, container) => {
    if (container === null || container === undefined) return false;
    if (typeof container === 'string' || Array.isArray(container)) {
      return container.includes(item);
    }
    if (container instanceof Set || container instanceof Map) {
      return container.has(item);
    }
    if (typeof container === 'object') {
      return item in container;
    }
    return false;
  };

  const len = (x) => x?.length ?? x?.size ?? 0;

  const max = (arr, keyFn) => {
    if (!arr || arr.length === 0) return null;
    const fn = typeof keyFn === 'function' ? keyFn : (x => x);
    let best = arr[0];
    let bestVal = fn(best);
    for (let i = 1; i < arr.length; i++) {
      const v = fn(arr[i]);
      if (v > bestVal) {
        best = arr[i];
        bestVal = v;
      }
    }
    return best;
  };

  const min = (arr, keyFn) => {
    if (!arr || arr.length === 0) return null;
    const fn = typeof keyFn === 'function' ? keyFn : (x => x);
    let best = arr[0];
    let bestVal = fn(best);
    for (let i = 1; i < arr.length; i++) {
      const v = fn(arr[i]);
      if (v < bestVal) {
        best = arr[i];
        bestVal = v;
      }
    }
    return best;
  };

  const reversed = (iter) => Array.isArray(iter) ? [...iter].reverse() : iter;
  const sorted = (iter, keyFn) => {
    if (!Array.isArray(iter)) return iter;
    const copy = [...iter];
    if (typeof keyFn === 'function') {
      return copy.sort((a, b) => (keyFn(a) > keyFn(b) ? 1 : keyFn(a) < keyFn(b) ? -1 : 0));
    }
    return copy.sort();
  };
  const set = (iter) => new Set(iter || []);

  // Safe prototype extensions
  if (typeof String.prototype.startswith !== 'function') {
    String.prototype.startswith = String.prototype.startsWith;
  }
  if (typeof String.prototype.endswith !== 'function') {
    String.prototype.endswith = String.prototype.endsWith;
  }
  if (typeof String.prototype.strip !== 'function') {
    String.prototype.strip = String.prototype.trim;
  }
  if (typeof String.prototype.lstrip !== 'function') {
    String.prototype.lstrip = String.prototype.trimStart;
  }
  if (typeof String.prototype.rstrip !== 'function') {
    String.prototype.rstrip = String.prototype.trimEnd;
  }
  if (typeof String.prototype.splitlines !== 'function') {
    String.prototype.splitlines = function() { return this.split(/\r?\n/); };
  }
  if (typeof String.prototype.find !== 'function') {
    String.prototype.find = String.prototype.indexOf;
  }
  if (typeof Array.prototype.append !== 'function') {
    Array.prototype.append = Array.prototype.push;
  }
  if (typeof Object.prototype.get !== 'function') {
    Object.defineProperty(Object.prototype, 'get', {
      value: function(key, defaultVal = null) {
        return this[key] !== undefined ? this[key] : defaultVal;
      },
      writable: true,
      configurable: true
    });
  }

  const defaultVars = {
    header: "Host: sec.local\r\nX-Bypass-Key: BYPASS-ELENA-WARD-99\r\nUser-Agent: Terminal/1.0",
    login_records: [
      ["mira_sen", "SUCCESS"],
      ["noah_mercer", "SUCCESS"],
      ["felix_grant", "SUCCESS"],
      ["guest_temp", "FAILED"],
      ["elena_ward", "SUCCESS"]
    ],
    authorized_users: ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"],
    logged_users: ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"],
    valid_code: "SEC-7702",
    auth_logs: [
      { timestamp: "08:12:00", user: "mira_sen", status: 200, ip: "10.0.1.12", msg: "Auth OK - Workstation B" },
      { timestamp: "08:19:30", user: "noah_mercer", status: 200, ip: "10.0.1.45", msg: "Auth OK - Server Sub-1" },
      { timestamp: "08:24:10", user: "felix_grant", status: 200, ip: "10.0.2.19", msg: "Auth OK - Security Desk" },
      { timestamp: "08:31:45", user: "elena_ward", status: 200, ip: "10.0.4.01", msg: "Auth OK - Executive Gateway" },
      { timestamp: "08:34:10", user: "felix_grant", status: 401, ip: "10.0.2.19", msg: "Auth Failed - Bad Pin" },
      { timestamp: "08:38:00", user: "mira_sen", status: 403, ip: "10.0.1.12", msg: "Access Denied - Lockdown Active" },
      { timestamp: "08:42:15", user: "noah_mercer", status: 401, ip: "10.0.1.45", msg: "Auth Failed - Session Terminated" }
    ]
  };

  const trimmed = (code || '').trim();

  // Basic check for empty or comment-only code
  const codeLines = trimmed.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (codeLines.length === 0) {
    return {
      success: false,
      isVerified: false,
      output: '> No executable code found. Write your Python solution and click Run Code.',
      result: null,
      error: 'Empty code buffer',
      feedback: 'Please write your solution in the editor before running.'
    };
  }

  try {
    const fullJs = transpilePython(code);
    const runner = new Function(
      'print', '__py_in', 'len', 'max', 'min', 'reversed', 'sorted', 'set',
      'header', 'login_records', 'authorized_users', 'logged_users', 'valid_code', 'auth_logs',
      fullJs
    );
    runner(
      print, __py_in, len, max, min, reversed, sorted, set,
      defaultVars.header, defaultVars.login_records, defaultVars.authorized_users, defaultVars.logged_users, defaultVars.valid_code, defaultVars.auth_logs
    );

    const fullStdout = outputLines.join('\n');

    // Expected answer verification
    const expected = challengeMeta?.expected || getExpectedForChallenge(challengeId);
    const alts = challengeMeta?.acceptedAlternatives || getAlternativesForChallenge(challengeId);

    // Extract the candidate answer from output (supports direct print, prefixes, labels)
    const cleanOutput = extractCandidateAnswer(outputLines, expected, alts);

    if (!cleanOutput) {
      return {
        success: true,
        isVerified: false,
        output: outputLines.length > 0 ? fullStdout : '> Process finished with exit code 0 (no output produced).\n> TIP: Use print(...) to output your answer.',
        result: '',
        error: null,
        feedback: 'Your code ran without errors, but did not print an answer. Add a print(...) statement.'
      };
    }

    const matchesExpected = cleanOutput.toLowerCase() === (expected || '').toLowerCase();
    const matchesAlternative = alts.some(alt => cleanOutput.toLowerCase() === alt.toLowerCase());

    if (!matchesExpected && !matchesAlternative) {
      return {
        success: true,
        isVerified: false,
        output: fullStdout,
        result: cleanOutput,
        error: 'Output mismatch',
        feedback: `Output "${cleanOutput}" does not match the expected forensic solution. Check your logic.`
      };
    }

    // Verify logic was done through proper way
    const properWay = verifyProperForensicLogic(code, challengeId, cleanOutput);
    if (!properWay.valid) {
      return {
        success: true,
        isVerified: false,
        output: `${fullStdout}\n\n[!] INTEGRITY WARNING: ${properWay.reason}`,
        result: cleanOutput,
        error: 'Improper solution logic',
        feedback: properWay.reason
      };
    }

    return {
      success: true,
      isVerified: true,
      output: `${fullStdout}\n\n[✔] FORENSIC MATCH VERIFIED: "${cleanOutput}"\n[✔] Status: Stage objective cleared!`,
      result: cleanOutput,
      error: null,
      feedback: `Objective cleared! Solution verified: "${cleanOutput}".`
    };

  } catch (err) {
    return {
      success: false,
      isVerified: false,
      output: `Traceback (most recent call last):\n  File "solution.py", line 1, in <module>\n${err.name}: ${err.message}`,
      result: null,
      error: err.message,
      feedback: `Execution error: ${err.message}. Please fix the syntax or logic error and run again.`
    };
  }
}

function getExpectedForChallenge(id) {
  const map = {
    'CHAL-PY-1': 'BYPASS-ELENA-WARD-99',
    'CHAL-PY-2': 'guest_temp',
    'CHAL-PY-3': 'shadow_operator',
    'CHAL-PY-4': 'ACCESS_GRANTED',
    'CHAL-PY-5': 'elena_ward'
  };
  return map[id] || '';
}

function getAlternativesForChallenge(id) {
  const map = {
    'CHAL-PY-1': ['BYPASS-ELENA-WARD', 'BYPASS-ELENA-WARD-99'],
    'CHAL-PY-2': ['guest_temp', '"guest_temp"'],
    'CHAL-PY-3': ['shadow_operator', '"shadow_operator"'],
    'CHAL-PY-4': ['ACCESS_GRANTED', '"ACCESS_GRANTED"'],
    'CHAL-PY-5': ['elena_ward', '"elena_ward"']
  };
  return map[id] || [];
}
