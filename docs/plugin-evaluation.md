# Cognine Marketplace — Plugin Evaluation

Verified on 2026-10-26 by reading local configuration and the marketplace clone. Nothing was installed or removed.

## 1. Configuration found

**Project: `.claude/settings.json`** (committed with the repo)
```json
{
  "enabledPlugins": {
    "react-coding-standards-best-practices@cognine-coding-standards-best-practices": true
  }
}
```

**User: `~/.claude/settings.json`**: registers the marketplace
```json
"extraKnownMarketplaces": {
  "cognine-coding-standards-best-practices": {
    "source": { "source": "git", "url": "https://github.com/cognine/cognine-coding-standards-best-practices.git" }
  }
}
```

**Marketplace clone:** `~/.claude/plugins/marketplaces/cognine-coding-standards-best-practices`, commit `4b7f6e5`, last updated 2026-09-08.

## 2. Plugins available

### Listed in `marketplace.json` (installable)
| Plugin | Version | Stack | Relevant to this project? |
|---|---|---|---|
| `react-coding-standards-best-practices` | 1.0.3 | React | **Yes:** React + TS client (FR-19) |
| `expressjs-coding-standards-best-practices` | 1.0.0 | Express.js | No: our backend is ASP.NET Core |
| `angular-coding-standards-best-practices` | 1.0.0 | Angular | No |
| `java-springboot-coding-standards-best-practices` | 1.0.0 | Java/Spring Boot | No |
| `vuejs-coding-standards-best-practices` | 1.0.0 | Vue.js | No |
| `python-django-coding-standards-best-practices` | 1.0.0 | Django | No |
| `python-fastapi-coding-standards-best-practices` | 1.0.0 | FastAPI | No |

### Present in the repo but **not** listed in `marketplace.json` (not installable as published)
| Folder | Manifest name | Stack |
|---|---|---|
| `plugins/csharp-coding-standards` | `cognine-csharp-coding-standards` 1.0.0 | C# / .NET |
| `plugins/efcore-coding-standards` | `efcore-coding-standards` 1.0.0 | EF Core 7/8 on **SQL Server** |

**Answer on .NET / C# coverage:** no **installable** Cognine plugin covers .NET or C#. Two .NET plugins exist as source in the repo, but the marketplace catalog doesn't list them, so `/plugin install` cannot find them. Neither of them is installed.

## 3. Plugins installed

| Plugin | Scope | Project path | Version / commit |
|---|---|---|---|
| `react-coding-standards-best-practices` | **project** | `C:\Users\Laxmi Bandaru\claude-code-workshop-assessment` | 1.0.3 / `4b7f6e5` |
| `react-coding-standards-best-practices` | project | `C:\Users\Laxmi Bandaru\claude-code-workshop` (another project; not active here) | 1.0.3 |

### What the installed React plugin provides (visible in this session)

**Skills** (model-invoked; they trigger automatically when the work matches):
`react-architecture`, `react-engineering-standards`, `react-api-standards`, `react-error-handling`, `react-state-mgmt`, `react-security`, `react-performance`, `react-accessibility`, `react-dependency-governance`

**Slash commands** (on demand):
- `/react-coding-standards-best-practices:react-coding-architecture-audit-command`
- `/react-coding-standards-best-practices:react-secure-coding-practices-command`
- `/react-coding-standards-best-practices:react-coding-accessibility-audit-a11y`

**Hooks:** three `PostToolUse` validators on `Write|Edit|MultiEdit`: `react-coding-standards-validator.py`, `react-coding-quality-check-validator.py` and `react-coding-security-dependency-hook-validator.py`.

> ⚠️ **Hook runtime risk on this machine.** The hooks run `python3`. Here `python3` resolves to the Windows Store stub (`WindowsApps\python3`), which prints *"Python was not found"*. A real Python 3.12.10 is installed as `python`/`py`. Until that is resolved, the React hooks will probably fail to run, without anything blocking. The marketplace README notes the same Windows issue. This has to be resolved and verified before we record hook evidence.

## 4. Suitability

| Plugin | Verdict | Reason |
|---|---|---|
| **React coding standards** | ✅ **Use** | It directly covers the client: architecture, naming and folder layout, a centralized API layer, error handling (which fits mapping RFC 7807 ProblemDetails to UI messages), accessibility for forms and tables, and security (no secrets in the bundle). **Watch-outs:** `react-api-standards` and `react-state-mgmt` steer toward RTK Query, TanStack Query or Redux. Our client is "lean", so we'll use only what the dependency-governance skill approves and avoid adding a global store. The a11y and architecture audits are produced as markdown reports we can keep as evidence. |
| **C# coding standards** (unlisted) | ❌ Not installable; partial fit | It can't be installed from the catalog. Its content conflicts with our design in places: it mandates a 4-project Clean Architecture / vertical-slice solution (Domain/Application/Infrastructure/API), while our design is a single API project with Controllers → Services → Data (NFR-03). Its `PreToolUse` hooks enforce GitFlow branch names and commit-message formats on every Bash call. It also uses `var` in its examples, which conflicts with our explicit-types rule (NFR-04). Useful only as **reference reading**. |
| **EF Core coding standards** (unlisted) | ❌ **Incompatible** | It targets EF Core 7/8 on **SQL Server only**. Its `check_approved_libraries.py` hook **blocks (exit 2)** adding `Microsoft.EntityFrameworkCore.Sqlite` and redirects to SqlServer, which conflicts with the mandated SQLite stack (FR-17). Do not install it. |
| Express, Angular, Spring Boot, Vue, Django, FastAPI | ❌ Not applicable | They cover stacks we don't use. |

## 5. How and when we will use each

| Phase | Plugin feature | Exact usage | Evidence (`docs/evidence/`) |
|---|---|---|---|
| **0. Setup** | (environment) | Make `python3` resolve to the real Python so the hooks run. Do this as a user-level environment step; no plugin files are edited. Then confirm a hook fires on a dummy `.tsx` edit. | `plugin-installed.png` (`/plugin` list), `react-hook-fired.png` |
| **1. Client scaffold** (FR-19) | Skills `react-architecture`, `react-engineering-standards`, `react-dependency-governance` | Applied while scaffolding the Vite + React + TS app to decide the folder layout, file naming and which npm packages are approved. | Transcript excerpt showing the skill being invoked |
| **2. API layer** (FR-19 AC1, AC3) | Skills `react-api-standards`, `react-error-handling` | One typed `api/` module that wraps `fetch` and uses `VITE_API_URL`. It turns ProblemDetails (400/404/409/422) into typed errors and adds an Error Boundary. | Transcript and code reference |
| **3. Screens and forms** | Skills `react-state-mgmt`, `react-accessibility`, `react-performance` | Use local and server state only, with no global store. Forms get labels, error text and keyboard support. The expense table is paged on the server. | — |
| **Continuous** (every `.ts`/`.tsx` edit) | `PostToolUse` hooks (3) | Run automatically after Claude writes or edits client files. Claude fixes the issues they report. | `react-hook-output.png` |
| **4. Client review gate** (before the client is done) | `/…:react-coding-architecture-audit-command`, `/…:react-secure-coding-practices-command`, `/…:react-coding-accessibility-audit-a11y` | Run all three on `client/src`. Fix every *mandatory* finding and re-run until clean. | `react-architecture-audit.md`, `react-security-audit.md`, `react-a11y-audit.md` (before and after) |
| **Backend (all phases)** | *No Cognine plugin* | C# and EF Core standards are enforced by our own `CLAUDE.md`, `.claude/rules/csharp.md` and `api.md`, plus the `code-reviewer` subagent. The unlisted C# plugin's skills may be read as reference only. | Noted in README |

## 6. Open items

1. Fix the `python3` resolution and verify the React hooks run (Phase 0).
2. Optionally run `/plugin marketplace update cognine-coding-standards-best-practices` to check whether a newer catalog lists the C# plugin. Even if it does, review its GitFlow hooks and Clean Architecture requirement before installing. Do not install the EF Core plugin; it blocks SQLite.
