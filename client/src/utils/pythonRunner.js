// client/src/utils/pythonRunner.js
// Safe in-browser Python execution simulator for the 5 False Trials coding challenges

export function executePythonCode(code, challengeId) {
  const outputLines = [];
  const log = (...args) => {
    outputLines.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  };

  try {
    const trimmed = code.trim();

    // Check challenge-specific solutions and executions
    if (challengeId === 'CHAL-PY-1') {
      // Find the Bypass Key
      const rawHeader = "Host: sec.local\r\nX-Bypass-Key: BYPASS-ELENA-WARD-99\r\nUser-Agent: Terminal/1.0";
      
      // Look for custom split / regex / print pattern in code
      if (trimmed.includes("print(")) {
        // Execute logic
        const headerMatch = rawHeader.match(/X-Bypass-Key:\s*([^\r\n]+)/i);
        const extracted = headerMatch ? headerMatch[1].trim() : 'BYPASS-ELENA-WARD-99';
        
        // If code explicitly prints a variable or extraction
        if (trimmed.includes("BYPASS-ELENA-WARD") || trimmed.includes("split") || trimmed.includes("X-Bypass-Key")) {
          log(extracted);
        } else {
          log(extracted);
        }
      } else {
        log("Code executed successfully with 0 outputs. Add a print() statement to view your result.");
      }
      return { success: true, output: outputLines.join('\n'), result: 'BYPASS-ELENA-WARD-99' };
    }

    if (challengeId === 'CHAL-PY-2') {
      // Identify the Suspicious Login
      const logins = [
        ["mira_sen", "SUCCESS"],
        ["noah_mercer", "SUCCESS"],
        ["felix_grant", "SUCCESS"],
        ["guest_temp", "FAILED"],
        ["elena_ward", "SUCCESS"]
      ];

      let found = "";
      for (const [user, status] of logins) {
        if (status === "FAILED") {
          found = user;
          break;
        }
      }

      if (trimmed.includes("print(")) {
        log(found);
      } else {
        log("Code executed. Result found: " + found + " (add print statement to display)");
      }
      return { success: true, output: outputLines.join('\n'), result: found };
    }

    if (challengeId === 'CHAL-PY-3') {
      // Find the Impostor
      const authorized = ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"];
      const logged = ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"];

      let impostor = "";
      for (const u of logged) {
        if (!authorized.includes(u)) {
          impostor = u;
          break;
        }
      }

      if (trimmed.includes("print(")) {
        log(impostor);
      } else {
        log("Code executed. Identified impostor: " + impostor);
      }
      return { success: true, output: outputLines.join('\n'), result: impostor };
    }

    if (challengeId === 'CHAL-PY-4') {
      // Crack the Access Rule
      let accessResult = "ACCESS_DENIED";
      if (
        (trimmed.includes("elena_ward") || trimmed.includes("authorized_users")) &&
        (trimmed.includes("SEC-7702") || trimmed.includes("valid_code"))
      ) {
        accessResult = "ACCESS_GRANTED";
      }

      if (trimmed.includes("print(")) {
        log(accessResult);
      } else {
        log("Executed. Access rule evaluation: " + accessResult);
      }
      return { success: true, output: outputLines.join('\n'), result: accessResult };
    }

    if (challengeId === 'CHAL-PY-5') {
      // Server Access Investigation
      const authLogs = [
        { timestamp: "08:12:00", user: "mira_sen", status: 200, ip: "10.0.1.12", msg: "Auth OK - Workstation B" },
        { timestamp: "08:19:30", user: "noah_mercer", status: 200, ip: "10.0.1.45", msg: "Auth OK - Server Sub-1" },
        { timestamp: "08:24:10", user: "felix_grant", status: 200, ip: "10.0.2.19", msg: "Auth OK - Security Desk" },
        { timestamp: "08:31:45", user: "elena_ward", status: 200, ip: "10.0.4.01", msg: "Auth OK - Executive Gateway" },
        { timestamp: "08:34:10", user: "felix_grant", status: 401, ip: "10.0.2.19", msg: "Auth Failed - Bad Pin" },
        { timestamp: "08:38:00", user: "mira_sen", status: 403, ip: "10.0.1.12", msg: "Access Denied - Lockdown Active" },
        { timestamp: "08:42:15", user: "noah_mercer", status: 401, ip: "10.0.1.45", msg: "Auth Failed - Session Terminated" }
      ];

      // Filter status 200 and find latest timestamp
      const valid = authLogs.filter(l => l.status === 200);
      valid.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const latest = valid[valid.length - 1];

      if (trimmed.includes("print(")) {
        log(latest.user);
      } else {
        log("Executed. Latest successful user identified: " + latest.user);
      }
      return { success: true, output: outputLines.join('\n'), result: latest.user };
    }

    // Default fallback
    log("Python 3.11.4 interpreter ready. Process finished with exit code 0.");
    return { success: true, output: outputLines.join('\n'), result: "" };

  } catch (err) {
    return {
      success: false,
      output: `Traceback (most recent call last):\n  File "main.py", line 1\nSyntaxError: ${err.message}`,
      result: null
    };
  }
}
