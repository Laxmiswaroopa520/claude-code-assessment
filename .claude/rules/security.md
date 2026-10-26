# Security (applies everywhere)

## Secrets
- Never put secrets, tokens or credentials in code, config, docs or commit messages. The SQLite connection string is a
  local file path only.
- Never commit `*.db`, `.env*` or `.claude/settings.local.json`. They're git-ignored; don't force-add them.

## Input
- The server validates every input (body, route and query). Client-side validation is only a convenience and is never trusted.
- Never build SQL, file paths or shell commands from user input. CSV output escapes values (RFC 4180) and neutralises
  leading `=`, `+`, `-` and `@` so a spreadsheet can't run them as formulas.

## Errors and logging
- Never return stack traces, exception messages, SQL or file paths to clients. A 500 is generic ProblemDetails with a `traceId`.
- Log the exception server-side. Don't log request bodies wholesale.

## Destructive operations (ask me first)
- Database: deleting or resetting `expense-management.db`, `DROP`, unscoped `DELETE`/`UPDATE`, `dotnet ef database drop`, and removing a migration.
- Git: `push --force`, `reset --hard`, `clean -fd`, `--no-verify`, rewriting history, deleting branches.
- File system: recursive deletes (`rm -rf`) and bulk deletes using wildcards.

## Tools and scope
- Database access through MCP (`expense-db`) is **read-only**: only `SELECT` and schema inspection, never writes.
- Never read, write or run commands in files outside this repository. In particular, never touch the read-only demo project
  `C:\Users\Laxmi Bandaru\claude-code-workshop`. The session scratchpad is the only exception, and only for temporary files.
