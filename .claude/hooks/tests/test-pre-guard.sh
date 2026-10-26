#!/usr/bin/env bash
# Tests for .claude/hooks/pre-guard.cs.
# Pipes real PreToolUse payloads into the hook and checks the exit code (0 = allow, 2 = block),
# the stderr prefix of blocked calls, and the log lines written to a temporary log file.
# Usage (from the repo root): bash .claude/hooks/tests/test-pre-guard.sh
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HOOK="$ROOT/.claude/hooks/pre-guard.cs"

win() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

PROJECT_WIN="$(win "$ROOT")"
DEMO_POSIX="$(dirname "$ROOT")/claude-code-workshop"
DEMO_WIN="$(win "$(dirname "$ROOT")")\\claude-code-workshop"
LOG_FILE="$(mktemp)"

export CLAUDE_PROJECT_DIR="$PROJECT_WIN"
export PRE_GUARD_LOG_FILE="$(win "$LOG_FILE")"

pass=0
fail=0
expected_blocks=0

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

# expect <want-exit> <name> <raw json payload>
expect() {
  local want="$1" name="$2" payload="$3" err rc
  err="$(printf '%s' "$payload" | dotnet run "$HOOK" 2>&1 >/dev/null)"
  rc=$?
  if [ "$want" = 2 ]; then expected_blocks=$((expected_blocks + 1)); fi
  if [ "$rc" = "$want" ] && { [ "$want" = 0 ] || [[ "$err" == "BLOCKED by pre-guard: "* ]]; }; then
    pass=$((pass + 1)); printf 'PASS  [%s] %s\n' "$rc" "$name"
  else
    fail=$((fail + 1)); printf 'FAIL  [got %s, want %s] %s\n      stderr: %s\n' "$rc" "$want" "$name" "$err"
  fi
}

# bash_cmd <want> <command> [cwd]
bash_cmd() {
  local cwd="${3:-$PROJECT_WIN}"
  expect "$1" "Bash: $2" \
    "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$(json_escape "$2")\"},\"cwd\":\"$(json_escape "$cwd")\"}"
}

# file_tool <want> <Edit|Write> <file_path>
file_tool() {
  expect "$1" "$2: $3" \
    "{\"tool_name\":\"$2\",\"tool_input\":{\"file_path\":\"$(json_escape "$3")\"},\"cwd\":\"$(json_escape "$PROJECT_WIN")\"}"
}

echo "== Bash: allowed"
bash_cmd 0 'ls -la'
bash_cmd 0 'dotnet build backend && dotnet test backend 2>&1'
bash_cmd 0 'git status && git log --oneline -3'
bash_cmd 0 'git push origin main'
bash_cmd 0 'git clean -n -fd'
bash_cmd 0 'rm -r tmp-dir'
bash_cmd 0 'rm -f one-file.txt'
bash_cmd 0 'echo "a; rm -rf b" > /dev/null'
bash_cmd 0 'sqlite3 snap.db "DELETE FROM Expenses WHERE Id = 1"'
bash_cmd 0 "grep -rn Budget \"$DEMO_POSIX/backend\""
bash_cmd 0 "cat \"$DEMO_POSIX/CLAUDE.md\" > notes-from-demo.txt"
bash_cmd 0 "cd \"$ROOT\" && npm --prefix frontend test"
bash_cmd 0 'ls -la' "$DEMO_WIN"

echo "== Bash: destructive commands"
bash_cmd 2 'rm -rf build'
bash_cmd 2 'rm -fr build'
bash_cmd 2 'rm -r -f build'
bash_cmd 2 'rm --recursive --force build'
bash_cmd 2 'ls && rm -Rf "dir with spaces"'
bash_cmd 2 'echo "quoted; part" ; /usr/bin/rm -rf x'
bash_cmd 2 'git reset --hard HEAD~1'
bash_cmd 2 'git push --force'
bash_cmd 2 'git push -f origin main'
bash_cmd 2 'git push --force-with-lease origin main'
bash_cmd 2 'git clean -fd'
bash_cmd 2 'git clean -f'
bash_cmd 2 'git commit --no-verify -m "skip hooks"'
bash_cmd 2 'git push --no-verify origin main'
bash_cmd 2 'sqlite3 snap.db "DROP TABLE Expenses"'
bash_cmd 2 'sqlite3 snap.db "drop database x"'
bash_cmd 2 'sqlite3 snap.db "DELETE FROM Expenses"'
bash_cmd 2 'sqlite3 snap.db "DELETE FROM A WHERE Id = 1; DELETE FROM B"'
bash_cmd 2 'dotnet ef database drop --project backend/ExpenseManagement.Api'
bash_cmd 2 'dotnet ef --project backend/ExpenseManagement.Api database drop -f'
expect 2 'Bash: newline-separated rm -rf' \
  "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\\nrm -rf build\"}}"

echo "== Bash: read-only demo folder"
bash_cmd 2 "rm \"$DEMO_POSIX/CLAUDE.md\""
bash_cmd 2 "echo x > \"$DEMO_POSIX/new.txt\""
bash_cmd 2 "cp \"$DEMO_POSIX/CLAUDE.md\" ."
bash_cmd 2 "cd \"$DEMO_POSIX\" && npm install"
bash_cmd 2 "git -C \"$DEMO_POSIX\" status"
bash_cmd 2 'touch a.txt' "$DEMO_WIN"
bash_cmd 2 'echo x > relative.txt' "$DEMO_WIN"

echo "== Edit/Write: allowed"
file_tool 0 Edit "$PROJECT_WIN\\backend\\ExpenseManagement.Api\\Program.cs"
file_tool 0 Write "$PROJECT_WIN\\.env.example"
file_tool 0 Write 'docs/notes.md'
file_tool 0 Write "$ROOT/frontend/src/App.tsx"

echo "== Edit/Write: blocked"
file_tool 2 Edit "$DEMO_WIN\\CLAUDE.md"
file_tool 2 Write "$DEMO_POSIX/CLAUDE.md"
file_tool 2 Write 'C:\Windows\Temp\outside.txt'
file_tool 2 Write '../outside.txt'
file_tool 2 Write "$PROJECT_WIN\\.env"
file_tool 2 Write "$PROJECT_WIN\\frontend\\.env.local"
file_tool 2 Write "$PROJECT_WIN\\backend\\ExpenseManagement.Api\\expenses.db"
file_tool 2 Write "$PROJECT_WIN\\backend\\ExpenseManagement.Api\\expenses.db-wal"
file_tool 2 Edit "$PROJECT_WIN\\backend\\ExpenseManagement.Api\\Migrations\\20261026_Initial.cs"
file_tool 2 Edit "$PROJECT_WIN\\backend\\ExpenseManagement.Api\\migrations\\AppDbContextModelSnapshot.cs"

echo "== Fail-open and other tools"
expect 0 'invalid JSON' 'this is not json'
expect 0 'missing tool_input' '{"tool_name":"Bash"}'
expect 0 'unrelated tool (Read)' '{"tool_name":"Read","tool_input":{"file_path":"C:\\Windows\\win.ini"}}'

echo "== Log file"
block_lines="$(grep -c ' | pre-guard | BLOCK | ' "$LOG_FILE")"
allow_lines="$(grep -c ' | pre-guard | ALLOW | ' "$LOG_FILE")"
if [ "$block_lines" = "$expected_blocks" ]; then
  pass=$((pass + 1)); echo "PASS  log has $block_lines BLOCK lines (expected $expected_blocks), $allow_lines ALLOW lines"
else
  fail=$((fail + 1)); echo "FAIL  log has $block_lines BLOCK lines, expected $expected_blocks"
fi
echo "-- sample log lines:"
grep ' | BLOCK | ' "$LOG_FILE" | head -3
rm -f "$LOG_FILE"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
