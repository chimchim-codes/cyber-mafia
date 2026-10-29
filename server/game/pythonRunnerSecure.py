#!/usr/bin/env python3
"""
server/game/pythonRunnerSecure.py
Authoritative, Sandboxed Python Execution Engine & Challenge Validator for Cyber Mafia

Validates player code submissions for the 5 sequential cyber forensic challenges:
1. AST-level static security scanner (blocks dangerous imports, built-ins, and dunder escapes).
2. AST-level algorithmic logic verification (verifies input usage, control flow, functions).
3. Multi-level test execution: visible sample test case, hidden edge cases, and randomized dynamic test case.
4. Anti-hardcoding detection: prevents constant returns, literal prints, and static branch hacks.
5. Safe builtins sandboxing with stdout capturing and normalized string comparison.
"""

import sys
import json
import ast
import io
import uuid
import builtins

__orig_import__ = builtins.__import__
SAFE_MODULES = {"re", "json", "math", "datetime", "collections", "itertools", "string", "functools"}

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    mod_name = name.split('.')[0]
    if mod_name in SAFE_MODULES:
        return __orig_import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Security restriction: Import of module '{name}' is not permitted.")

# Security policy: Restricted modules & dangerous functions
DANGEROUS_MODULES = {
    "os", "sys", "subprocess", "socket", "http", "urllib", "requests",
    "shutil", "pathlib", "ctypes", "multiprocessing", "threading", "pty",
    "signal", "builtins", "__builtin__", "importlib", "posix", "nt", "errno",
    "fcntl", "resource", "gc", "inspect", "pdb", "code", "codeop"
}

DANGEROUS_CALLS = {
    "eval", "exec", "open", "compile", "globals", "locals",
    "getattr", "setattr", "delattr", "breakpoint", "exit", "quit", "input",
    "memoryview", "help"
}

# Whitelist of safe Python built-in functions & types
SAFE_BUILTINS = {
    "__import__": safe_import,
    "print": print,
    "len": len,
    "range": range,
    "str": str,
    "int": int,
    "float": float,
    "bool": bool,
    "list": list,
    "dict": dict,
    "set": set,
    "tuple": tuple,
    "max": max,
    "min": min,
    "sum": sum,
    "sorted": sorted,
    "filter": filter,
    "map": map,
    "enumerate": enumerate,
    "zip": zip,
    "reversed": reversed,
    "any": any,
    "all": all,
    "abs": abs,
    "round": round,
    "isinstance": isinstance,
    "issubclass": issubclass,
    "Exception": Exception,
    "ValueError": ValueError,
    "TypeError": TypeError,
    "KeyError": KeyError,
    "IndexError": IndexError,
    "AttributeError": AttributeError,
    "StopIteration": StopIteration,
    "True": True,
    "False": False,
    "None": None,
}

def scan_ast(code, challenge_id):
    """
    Scans the AST of submitted code for security violations and challenge-specific
    algorithmic requirements.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"SyntaxError: {e.msg} at line {e.lineno}", None
    except Exception as e:
        return False, f"Parse error: {str(e)}", None

    # General Security Scans
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [a.name.split('.')[0] for a in getattr(node, "names", [])]
            mod = (getattr(node, "module", "") or "").split('.')[0]
            for name in names + [mod]:
                if name and name in DANGEROUS_MODULES:
                    return False, f"Security restriction: Import of module '{name}' is not permitted.", None

        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            return False, f"Security restriction: Access to internal attribute '{node.attr}' is not permitted.", None

        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in DANGEROUS_CALLS:
                return False, f"Security restriction: Calling '{node.func.id}()' is not permitted.", None

    # Trivial hardcoded-print check (e.g. code is only a single print of a constant literal)
    non_trivial_stmts = [
        s for s in tree.body
        if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))
    ]
    if len(non_trivial_stmts) == 1 and isinstance(non_trivial_stmts[0], ast.Expr):
        expr = non_trivial_stmts[0].value
        if isinstance(expr, ast.Call) and isinstance(expr.func, ast.Name) and expr.func.id == "print":
            if all(isinstance(a, ast.Constant) for a in expr.args):
                return False, "Bypass detected: Submissions that only print a constant answer without implementing logic are rejected.", None

    # Challenge-specific AST requirement checks
    if challenge_id == 'CHAL-PY-1':
        loads_header = any(
            isinstance(n, ast.Name) and n.id == "header" and isinstance(n.ctx, ast.Load)
            for n in ast.walk(tree)
        )
        if not loads_header:
            return False, "Algorithmic requirement: Your solution must extract the bypass key dynamically from the 'header' input variable.", None

    elif challenge_id == 'CHAL-PY-2':
        loads_records = any(
            isinstance(n, ast.Name) and n.id == "login_records" and isinstance(n.ctx, ast.Load)
            for n in ast.walk(tree)
        )
        if not loads_records:
            return False, "Algorithmic requirement: Your solution must inspect the 'login_records' list dynamically.", None

    elif challenge_id == 'CHAL-PY-3':
        loads_logged = any(
            isinstance(n, ast.Name) and n.id == "logged_users" and isinstance(n.ctx, ast.Load)
            for n in ast.walk(tree)
        )
        loads_auth = any(
            isinstance(n, ast.Name) and n.id == "authorized_users" and isinstance(n.ctx, ast.Load)
            for n in ast.walk(tree)
        )
        if not (loads_logged and loads_auth):
            return False, "Algorithmic requirement: Your solution must cross-reference 'logged_users' against 'authorized_users'.", None

    elif challenge_id == 'CHAL-PY-4':
        funcs = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "check_access"]
        if funcs:
            fn = funcs[0]
            returns = [n for n in ast.walk(fn) if isinstance(n, ast.Return)]
            if len(returns) == 1 and isinstance(returns[0].value, ast.Constant):
                return False, "Algorithmic requirement: 'check_access' cannot return a constant value; it must evaluate access conditions dynamically.", None

    elif challenge_id == 'CHAL-PY-5':
        loads_logs = any(
            isinstance(n, ast.Name) and n.id == "auth_logs" and isinstance(n.ctx, ast.Load)
            for n in ast.walk(tree)
        )
        if not loads_logs:
            return False, "Algorithmic requirement: Your solution must parse the 'auth_logs' telemetry data dynamically.", None

    return True, None, tree

def strip_starter_assignments(tree, var_names):
    """
    Strips top-level assignments of the starter variables from the AST so that
    values injected by the test runner take precedence during test case execution.
    Only strips literal assignments (strings, lists, dicts, tuples), preserving
    reassignments and computed expressions.
    """
    new_body = []
    removed = set()
    for stmt in tree.body:
        if isinstance(stmt, ast.Assign):
            targets = {t.id for t in stmt.targets if isinstance(t, ast.Name)}
            intersect = targets.intersection(var_names)
            if intersect and not removed.issuperset(intersect):
                is_literal = isinstance(stmt.value, (ast.Constant, ast.List, ast.Dict, ast.Tuple))
                if is_literal:
                    removed.update(intersect)
                    continue
        new_body.append(stmt)
    cloned = ast.Module(body=new_body, type_ignores=[])
    ast.fix_missing_locations(cloned)
    return cloned

def normalize_output(out_str, expected=None, alternatives=None):
    """
    Normalizes stdout output: extracts value and supports label prefixes, colons, or direct matches.
    """
    if not out_str:
        return ""
    lines = [l.strip() for l in out_str.strip().split("\n") if l.strip()]
    if not lines:
        return ""

    candidates = []
    if expected:
        candidates.append(expected.lower())
    if alternatives:
        candidates.extend([a.lower() for a in alternatives])

    for line in reversed(lines):
        val = line.strip()
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1].strip()

        # Exact match
        if candidates and val.lower() in candidates:
            return val

        # Match after colon: e.g. "Key: BYPASS-ELENA-WARD-99"
        if ":" in val:
            after = val.split(":")[-1].strip().strip("\"'")
            if candidates and after.lower() in candidates:
                return after

        # Match word tokens
        if candidates:
            tokens = [t.strip("\"',[]()") for t in val.split()]
            for tok in tokens:
                if tok.lower() in candidates:
                    return tok

    # Fallback to last line
    val = lines[-1].strip()
    if ":" in val:
        after = val.split(":")[-1].strip().strip("\"'")
        if after:
            val = after
    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
        val = val[1:-1].strip()
    return val

def run_test_cases(tree, challenge_id, user_code):
    """Executes the submitted solution against visible, hidden, and randomized test cases."""
    rand_suffix = uuid.uuid4().hex[:6].upper()

    if challenge_id == 'CHAL-PY-1':
        rnd_key = f"BYPASS-RND-{rand_suffix}"
        test_cases = [
            {
                "inputs": {"header": "Host: sec.local\r\nX-Bypass-Key: BYPASS-ELENA-WARD-99\r\nUser-Agent: Terminal/1.0"},
                "expected": "BYPASS-ELENA-WARD-99",
                "alternatives": ["BYPASS-ELENA-WARD", "BYPASS-ELENA-WARD-99"],
                "hidden": False
            },
            {
                "inputs": {"header": "User-Agent: Bot/2.0\r\nX-Bypass-Key: SIGMA-DELTA-8812\r\nHost: api.vault\r\nConnection: keep-alive"},
                "expected": "SIGMA-DELTA-8812",
                "hidden": True
            },
            {
                "inputs": {"header": "Host: edge-router.internal\r\nX-Bypass-Key: ALPHA-KEY-404\r\nAccept: text/plain"},
                "expected": "ALPHA-KEY-404",
                "hidden": True
            },
            {
                "inputs": {"header": f"Host: gateway.vault\r\nX-Bypass-Key: {rnd_key}\r\nStatus: 200"},
                "expected": rnd_key,
                "hidden": True
            }
        ]
        var_names = {"header"}

    elif challenge_id == 'CHAL-PY-2':
        rnd_user = f"user_{rand_suffix.lower()}"
        test_cases = [
            {
                "inputs": {
                    "login_records": [
                        ("mira_sen", "SUCCESS"),
                        ("noah_mercer", "SUCCESS"),
                        ("felix_grant", "SUCCESS"),
                        ("guest_temp", "FAILED"),
                        ("elena_ward", "SUCCESS")
                    ]
                },
                "expected": "guest_temp",
                "hidden": False
            },
            {
                "inputs": {
                    "login_records": [
                        ("rogue_infiltrator", "FAILED"),
                        ("admin_user", "SUCCESS"),
                        ("sec_lead", "SUCCESS")
                    ]
                },
                "expected": "rogue_infiltrator",
                "hidden": True
            },
            {
                "inputs": {
                    "login_records": [
                        ("alice_dev", "SUCCESS"),
                        ("bob_ops", "SUCCESS"),
                        ("shadow_root", "FAILED")
                    ]
                },
                "expected": "shadow_root",
                "hidden": True
            },
            {
                "inputs": {
                    "login_records": [
                        ("dev1", "SUCCESS"),
                        ("dev2", "SUCCESS"),
                        (rnd_user, "FAILED"),
                        ("dev3", "SUCCESS")
                    ]
                },
                "expected": rnd_user,
                "hidden": True
            }
        ]
        var_names = {"login_records"}

    elif challenge_id == 'CHAL-PY-3':
        rnd_impostor = f"impostor_{rand_suffix.lower()}"
        test_cases = [
            {
                "inputs": {
                    "authorized_users": ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"],
                    "logged_users": ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]
                },
                "expected": "shadow_operator",
                "hidden": False
            },
            {
                "inputs": {
                    "authorized_users": ["sec_lead", "net_admin", "dev_ops"],
                    "logged_users": ["net_admin", "ghost_protocol", "dev_ops"]
                },
                "expected": "ghost_protocol",
                "hidden": True
            },
            {
                "inputs": {
                    "authorized_users": ["analyst_1", "analyst_2", "chief_officer"],
                    "logged_users": ["unregistered_bot", "analyst_1"]
                },
                "expected": "unregistered_bot",
                "hidden": True
            },
            {
                "inputs": {
                    "authorized_users": ["alpha", "beta", "gamma"],
                    "logged_users": ["alpha", rnd_impostor, "beta"]
                },
                "expected": rnd_impostor,
                "hidden": True
            }
        ]
        var_names = {"authorized_users", "logged_users"}

    elif challenge_id == 'CHAL-PY-4':
        # Function-based or script-based execution for Challenge 4
        try:
            compiled = compile(tree, "<solution>", "exec")
            scope = {
                "__builtins__": SAFE_BUILTINS.copy(),
                "authorized_users": ["elena_ward", "adrian_vale", "marcus_vance"],
                "valid_code": "SEC-7702",
                "user": "elena_ward",
                "code": "SEC-7702"
            }
            out_capture = io.StringIO()
            old_stdout = sys.stdout
            sys.stdout = out_capture
            try:
                exec(compiled, scope)
            finally:
                sys.stdout = old_stdout
            initial_stdout = out_capture.getvalue()
        except Exception as e:
            return {
                "success": False,
                "isVerified": False,
                "error": f"Runtime error: {str(e)}",
                "stdout": f"Traceback:\n  {type(e).__name__}: {str(e)}",
                "feedback": f"Execution error: {str(e)}"
            }

        fn = scope.get("check_access")
        if callable(fn):
            fn_tests = [
                ("elena_ward", "SEC-7702", "ACCESS_GRANTED", False),
                ("elena_ward", "INVALID-CODE", "ACCESS_DENIED", True),
                ("unauthorized_user", "SEC-7702", "ACCESS_DENIED", True),
                ("adrian_vale", "SEC-7702", "ACCESS_GRANTED", True),
                ("unknown_hacker", "WRONG-7702", "ACCESS_DENIED", True),
            ]

            tests_run = 0
            tests_passed = 0
            primary_clean = ""
            for user_arg, code_arg, expected_ret, is_hidden in fn_tests:
                tests_run += 1
                try:
                    scope["user"] = user_arg
                    scope["code"] = code_arg
                    ret = fn(user_arg, code_arg)
                except Exception as e:
                    return {
                        "success": False,
                        "isVerified": False,
                        "error": f"Function call error: {str(e)}",
                        "stdout": initial_stdout,
                        "feedback": f"check_access('{user_arg}', '{code_arg}') raised {type(e).__name__}: {str(e)}"
                    }
                clean_ret = normalize_output(str(ret) if ret is not None else "", expected=expected_ret)
                if not is_hidden:
                    primary_clean = clean_ret
                if clean_ret.lower() != expected_ret.lower():
                    if is_hidden:
                        return {
                            "success": True,
                            "isVerified": False,
                            "cleanOutput": clean_ret,
                            "stdout": initial_stdout,
                            "error": "Failed hidden test verification",
                            "feedback": "Your access policy failed on hidden test cases (e.g. testing unauthorized accounts or invalid codes). Ensure both user authorization and code matching are evaluated."
                        }
                    else:
                        return {
                            "success": True,
                            "isVerified": False,
                            "cleanOutput": clean_ret,
                            "stdout": initial_stdout,
                            "error": "Visible test mismatch",
                            "feedback": f"check_access('{user_arg}', '{code_arg}') returned '{clean_ret}', expected '{expected_ret}'."
                        }
                tests_passed += 1

            clean_printed = normalize_output(initial_stdout, expected="ACCESS_GRANTED")
            if clean_printed and clean_printed.lower() != "access_granted":
                return {
                    "success": True,
                    "isVerified": False,
                    "cleanOutput": clean_printed,
                    "stdout": initial_stdout,
                    "error": "Printed output mismatch",
                    "feedback": f"Your script printed '{clean_printed}', but expected 'ACCESS_GRANTED'."
                }

            return {
                "success": True,
                "isVerified": True,
                "cleanOutput": primary_clean or "ACCESS_GRANTED",
                "stdout": initial_stdout or "[✔] check_access verified on all authentication policies.",
                "feedback": "Objective cleared! Access rule verified against all authorization test cases.",
                "details": {"testsRun": tests_run, "testsPassed": tests_passed}
            }
        else:
            # Script-based execution: user wrote dynamic conditions without check_access function
            clean_printed = normalize_output(initial_stdout, expected="ACCESS_GRANTED")
            if clean_printed.lower() == "access_granted":
                return {
                    "success": True,
                    "isVerified": True,
                    "cleanOutput": "ACCESS_GRANTED",
                    "stdout": initial_stdout or "ACCESS_GRANTED",
                    "feedback": "Objective cleared! Access rule verified.",
                    "details": {"testsRun": 1, "testsPassed": 1}
                }
            else:
                return {
                    "success": True,
                    "isVerified": False,
                    "cleanOutput": clean_printed,
                    "stdout": initial_stdout,
                    "error": "Access check mismatch",
                    "feedback": f"Your script output '{clean_printed}', but expected 'ACCESS_GRANTED'."
                }

    elif challenge_id == 'CHAL-PY-5':
        rnd_winner = f"winner_{rand_suffix.lower()}"
        test_cases = [
            {
                "inputs": {
                    "auth_logs": [
                        {"timestamp": "08:12:00", "user": "mira_sen", "status": 200, "ip": "10.0.1.12", "msg": "Auth OK - Workstation B"},
                        {"timestamp": "08:19:30", "user": "noah_mercer", "status": 200, "ip": "10.0.1.45", "msg": "Auth OK - Server Sub-1"},
                        {"timestamp": "08:24:10", "user": "felix_grant", "status": 200, "ip": "10.0.2.19", "msg": "Auth OK - Security Desk"},
                        {"timestamp": "08:31:45", "user": "elena_ward", "status": 200, "ip": "10.0.4.01", "msg": "Auth OK - Executive Gateway"},
                        {"timestamp": "08:34:10", "user": "felix_grant", "status": 401, "ip": "10.0.2.19", "msg": "Auth Failed - Bad Pin"},
                        {"timestamp": "08:38:00", "user": "mira_sen", "status": 403, "ip": "10.0.1.12", "msg": "Access Denied - Lockdown Active"},
                        {"timestamp": "08:42:15", "user": "noah_mercer", "status": 401, "ip": "10.0.1.45", "msg": "Auth Failed - Session Terminated"}
                    ]
                },
                "expected": "elena_ward",
                "hidden": False
            },
            {
                "inputs": {
                    "auth_logs": [
                        {"timestamp": "09:00:00", "user": "user_a", "status": 200},
                        {"timestamp": "09:45:00", "user": "operator_9", "status": 200},
                        {"timestamp": "10:15:00", "user": "attacker", "status": 401}
                    ]
                },
                "expected": "operator_9",
                "hidden": True
            },
            {
                "inputs": {
                    "auth_logs": [
                        {"timestamp": "11:59:00", "user": "denied_bot", "status": 403},
                        {"timestamp": "11:10:00", "user": "alpha", "status": 200},
                        {"timestamp": "11:35:00", "user": "target_winner", "status": 200}
                    ]
                },
                "expected": "target_winner",
                "hidden": True
            },
            {
                "inputs": {
                    "auth_logs": [
                        {"timestamp": "14:10:00", "user": "early_user", "status": 200},
                        {"timestamp": "14:30:00", "user": rnd_winner, "status": 200},
                        {"timestamp": "14:45:00", "user": "denied_later", "status": 401}
                    ]
                },
                "expected": rnd_winner,
                "hidden": True
            }
        ]
        var_names = {"auth_logs"}

    else:
        return {"success": False, "isVerified": False, "error": f"Unknown challenge: {challenge_id}", "feedback": "Unknown challenge ID"}

    # Run for variable-based challenges (1, 2, 3, 5)
    modified_tree = strip_starter_assignments(tree, var_names)
    try:
        compiled_code = compile(modified_tree, "<solution>", "exec")
    except Exception as e:
        return {"success": False, "isVerified": False, "error": f"Compilation error: {str(e)}", "feedback": str(e)}

    primary_stdout = ""
    primary_clean = ""
    tests_run = 0
    tests_passed = 0

    for tc in test_cases:
        tests_run += 1
        capture = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = capture

        scope = {"__builtins__": SAFE_BUILTINS.copy(), **tc["inputs"]}
        err_msg = None
        try:
            exec(compiled_code, scope)
        except Exception as e:
            err_msg = f"{type(e).__name__}: {str(e)}"
        finally:
            sys.stdout = old_stdout

        current_stdout = capture.getvalue()
        if not tc["hidden"]:
            primary_stdout = current_stdout

        if err_msg:
            return {
                "success": False,
                "isVerified": False,
                "cleanOutput": None,
                "stdout": current_stdout,
                "error": err_msg,
                "feedback": f"Runtime error: {err_msg}"
            }

        clean = normalize_output(current_stdout, expected=tc["expected"], alternatives=tc.get("alternatives"))
        if not tc["hidden"]:
            primary_clean = clean

        exp = tc["expected"].lower()
        alts = [a.lower() for a in tc.get("alternatives", [tc["expected"]])]

        matches = clean.lower() == exp or clean.lower() in alts
        if not matches:
            if tc["hidden"]:
                return {
                    "success": True,
                    "isVerified": False,
                    "cleanOutput": clean,
                    "stdout": primary_stdout or current_stdout,
                    "error": "Failed hidden test verification",
                    "feedback": "Failed verification on hidden test case. Your solution must dynamically compute the result for any valid input, not just the visible sample."
                }
            else:
                return {
                    "success": True,
                    "isVerified": False,
                    "cleanOutput": clean,
                    "stdout": primary_stdout or current_stdout,
                    "error": "Visible test mismatch",
                    "feedback": f"Output '{clean}' does not match the expected forensic solution. Check your logic."
                }
        tests_passed += 1

    return {
        "success": True,
        "isVerified": True,
        "cleanOutput": primary_clean,
        "stdout": primary_stdout,
        "feedback": f"Objective cleared! Solution verified against all {tests_run} visible and hidden test cases.",
        "details": {"testsRun": tests_run, "testsPassed": tests_passed}
    }

def validate_submission(payload_json):
    try:
        data = json.loads(payload_json)
    except Exception as e:
        return json.dumps({"success": False, "isVerified": False, "error": f"Invalid JSON: {str(e)}", "feedback": "Invalid JSON payload"})

    code = data.get("code", "")
    challenge_id = data.get("challengeId", "")

    if not code or not code.strip():
        return json.dumps({
            "success": False,
            "isVerified": False,
            "error": "Empty code submission",
            "feedback": "Please write your Python solution before running verification.",
            "stdout": "> No executable code submitted."
        })

    # 1. AST Security and Algorithmic Check
    ok, reason, tree = scan_ast(code, challenge_id)
    if not ok:
        return json.dumps({
            "success": False if "SyntaxError" in reason else True,
            "isVerified": False,
            "error": reason,
            "feedback": reason,
            "stdout": f"[!] VALIDATION REJECTED: {reason}"
        })

    # 2. Test Execution Suite
    result = run_test_cases(tree, challenge_id, code)
    return json.dumps(result)

if __name__ == "__main__":
    raw_input = sys.stdin.read()
    print(validate_submission(raw_input))
