#:property Nullable=enable
#:property ImplicitUsings=enable

// PreToolUse guard for the AICC102 Expense Management project.
// .NET 10 file-based app (standard library only), registered in .claude/settings.json:
//   dotnet run "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-guard.cs"
//
// Contract:
//   blocked -> stderr "BLOCKED by pre-guard: <reason>", exit 2
//   allowed -> no output, exit 0
//   invalid JSON, unexpected payload shape or internal error -> fail open, exit 0
// Every decision is appended to .claude/logs/hooks.log:
//   <UTC timestamp> | pre-guard | ALLOW|BLOCK | <tool> | <reason>
// Only the reason is logged, never the full command or file content.

using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

string? projectDir = Environment.GetEnvironmentVariable("CLAUDE_PROJECT_DIR");
string toolName = "?";

try
{
    string input = Console.In.ReadToEnd();
    using JsonDocument document = JsonDocument.Parse(input);
    JsonElement root = document.RootElement;

    if (root.ValueKind != JsonValueKind.Object
        || !root.TryGetProperty("tool_name", out JsonElement toolNameElement)
        || toolNameElement.ValueKind != JsonValueKind.String
        || !root.TryGetProperty("tool_input", out JsonElement toolInput)
        || toolInput.ValueKind != JsonValueKind.Object)
    {
        HookLog.Write(projectDir, "ALLOW", toolName, "unexpected payload shape, fail open");
        return 0;
    }

    toolName = toolNameElement.GetString() ?? "?";
    string? cwd = Guard.GetString(root, "cwd");

    string? reason = toolName switch
    {
        "Bash" or "PowerShell" => Guard.CheckCommand(Guard.GetString(toolInput, "command"), cwd),
        "Edit" or "Write" => Guard.CheckFilePath(Guard.GetString(toolInput, "file_path"), projectDir, cwd),
        _ => null,
    };

    if (reason is not null)
    {
        Console.Error.WriteLine($"BLOCKED by pre-guard: {reason}");
        HookLog.Write(projectDir, "BLOCK", toolName, reason);
        return 2;
    }

    HookLog.Write(projectDir, "ALLOW", toolName, "no rule matched");
    return 0;
}
catch (JsonException)
{
    HookLog.Write(projectDir, "ALLOW", toolName, "invalid JSON, fail open");
    return 0;
}
catch (Exception exception)
{
    HookLog.Write(projectDir, "ALLOW", toolName, $"internal error ({exception.GetType().Name}), fail open");
    return 0;
}

/// <summary>A shell command segment split into words, with redirect targets kept separately.</summary>
sealed record ParsedCommand(List<string> Tokens, List<string> RedirectTargets);

static class Guard
{
    private const string DemoReason =
        "'claude-code-workshop' is a read-only demo project; writing, deleting, copying from, or running git/npm/dotnet there is not allowed.";

    private static readonly StringComparison PathComparison =
        OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

    // Matches the demo folder name but not "claude-code-workshop-assessment" (this project).
    private static readonly Regex DemoFolder = new(@"claude-code-workshop(?![\w-])", RegexOptions.IgnoreCase);
    private static readonly Regex DropTable = new(@"\bdrop\s+table\b", RegexOptions.IgnoreCase);
    private static readonly Regex DropDatabase = new(@"\bdrop\s+database\b", RegexOptions.IgnoreCase);
    private static readonly Regex DeleteFrom = new(@"\bdelete\s+from\b", RegexOptions.IgnoreCase);
    private static readonly Regex Where = new(@"\bwhere\b", RegexOptions.IgnoreCase);

    private static readonly HashSet<string> ChangeDirectoryCommands = new(StringComparer.OrdinalIgnoreCase)
    {
        "cd", "pushd", "popd", "chdir", "Set-Location", "sl", "Push-Location", "Pop-Location",
    };

    // Commands treated as writing/deleting/building when they run against the demo folder.
    private static readonly HashSet<string> WriteCommands = new(StringComparer.OrdinalIgnoreCase)
    {
        "rm", "rmdir", "unlink", "mv", "cp", "touch", "mkdir", "tee", "ln", "chmod", "chown", "truncate", "dd",
        "install", "rsync", "git", "npm", "npx", "pnpm", "yarn", "dotnet",
        "del", "erase", "rd", "move", "copy", "xcopy", "robocopy", "ren",
        "Remove-Item", "Move-Item", "Copy-Item", "New-Item", "Rename-Item",
        "Set-Content", "Add-Content", "Clear-Content", "Out-File",
    };

    private static readonly HashSet<string> NullDevices = new(StringComparer.OrdinalIgnoreCase)
    {
        "/dev/null", "NUL", "$null",
    };

    public static string? GetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out JsonElement value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    public static string? CheckCommand(string? command, string? cwd)
    {
        if (string.IsNullOrWhiteSpace(command))
        {
            return null;
        }

        bool insideDemoFolder = cwd is not null && DemoFolder.IsMatch(cwd);

        foreach (List<string> pipeline in ShellSplitter.SplitPipelines(command))
        {
            bool pipelineReferencesDemo = pipeline.Any(part => DemoFolder.IsMatch(part));

            foreach (string part in pipeline)
            {
                ParsedCommand parsed = ShellSplitter.Parse(part);

                string? reason = CheckDestructive(parsed.Tokens) ?? CheckSql(part);
                if (reason is not null)
                {
                    return reason;
                }

                if (parsed.Tokens.Count > 0 && ChangeDirectoryCommands.Contains(CommandName(parsed.Tokens[0])))
                {
                    insideDemoFolder = DemoFolder.IsMatch(part);
                    continue;
                }

                bool writes = parsed.Tokens.Any(token => WriteCommands.Contains(CommandName(token)))
                    || IsSedInPlace(parsed.Tokens);
                if ((pipelineReferencesDemo || insideDemoFolder) && writes)
                {
                    return DemoReason;
                }

                foreach (string target in parsed.RedirectTargets)
                {
                    if (NullDevices.Contains(target))
                    {
                        continue;
                    }

                    bool targetInDemo = DemoFolder.IsMatch(target) || (insideDemoFolder && !Path.IsPathRooted(target));
                    if (targetInDemo)
                    {
                        return DemoReason;
                    }
                }
            }
        }

        return null;
    }

    public static string? CheckFilePath(string? filePath, string? projectDir, string? cwd)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return null;
        }

        string basePath = Path.GetFullPath(ToNativePath(cwd ?? projectDir ?? Directory.GetCurrentDirectory()));
        string fullPath = Path.GetFullPath(ToNativePath(filePath), basePath);

        if (!string.IsNullOrWhiteSpace(projectDir))
        {
            string projectRoot = Path.TrimEndingDirectorySeparator(Path.GetFullPath(ToNativePath(projectDir)));
            bool insideProject = fullPath.Equals(projectRoot, PathComparison)
                || fullPath.StartsWith(projectRoot + Path.DirectorySeparatorChar, PathComparison);
            if (!insideProject)
            {
                return $"'{fullPath}' is outside the project directory; only files inside this repository may be edited.";
            }
        }

        string fileName = Path.GetFileName(fullPath);
        if (IsEnvFile(fileName))
        {
            return $"'{fileName}' may contain secrets; edit .env files manually (.env.example is allowed).";
        }

        if (fileName.EndsWith(".db", PathComparison)
            || fileName.EndsWith(".db-shm", PathComparison)
            || fileName.EndsWith(".db-wal", PathComparison))
        {
            return $"'{fileName}' is a SQLite database file; change data through the API or migrations, not by editing the file.";
        }

        char[] separators = new char[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar };
        string[] segments = fullPath.Split(separators, StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < segments.Length - 1; i++)
        {
            if (segments[i].Equals("Migrations", PathComparison))
            {
                return "files under Migrations/ are generated by 'dotnet ef migrations add' and must not be edited by hand.";
            }
        }

        return null;
    }

    private static string? CheckDestructive(List<string> tokens)
    {
        List<string> names = tokens.Select(CommandName).ToList();

        int rmIndex = names.FindIndex(name => name.Equals("rm", StringComparison.OrdinalIgnoreCase));
        if (rmIndex >= 0 && IsRecursiveForce(tokens.Skip(rmIndex + 1)))
        {
            return "rm with recursive + force flags (rm -rf and variants) is not allowed.";
        }

        int removeItemIndex = names.FindIndex(name => name.Equals("Remove-Item", StringComparison.OrdinalIgnoreCase));
        if (removeItemIndex >= 0)
        {
            List<string> removeArgs = tokens.Skip(removeItemIndex + 1).ToList();
            bool recurse = removeArgs.Any(arg => arg.StartsWith("-rec", StringComparison.OrdinalIgnoreCase));
            bool force = removeArgs.Any(arg => arg.StartsWith("-fo", StringComparison.OrdinalIgnoreCase));
            if (recurse && force)
            {
                return "Remove-Item -Recurse -Force is not allowed.";
            }
        }

        int gitIndex = names.FindIndex(name => name.Equals("git", StringComparison.OrdinalIgnoreCase));
        if (gitIndex >= 0)
        {
            string? gitReason = CheckGit(tokens.Skip(gitIndex + 1).ToList());
            if (gitReason is not null)
            {
                return gitReason;
            }
        }

        int efIndex = names.FindIndex(name =>
            name.Equals("ef", StringComparison.OrdinalIgnoreCase) || name.Equals("dotnet-ef", StringComparison.OrdinalIgnoreCase));
        if (efIndex >= 0)
        {
            List<string> efWords = tokens.Skip(efIndex + 1)
                .Where(arg => !arg.StartsWith('-'))
                .Select(arg => arg.ToLowerInvariant())
                .ToList();
            for (int i = 0; i < efWords.Count - 1; i++)
            {
                if (efWords[i] == "database" && efWords[i + 1] == "drop")
                {
                    return "dotnet ef database drop is not allowed; ask before deleting the database.";
                }
            }
        }

        return null;
    }

    private static string? CheckGit(List<string> args)
    {
        int subcommandIndex = -1;
        for (int i = 0; i < args.Count; i++)
        {
            string arg = args[i];
            if (arg is "-C" or "-c" or "--git-dir" or "--work-tree")
            {
                i++;
                continue;
            }

            if (!arg.StartsWith('-'))
            {
                subcommandIndex = i;
                break;
            }
        }

        if (subcommandIndex < 0)
        {
            return null;
        }

        string subcommand = args[subcommandIndex].ToLowerInvariant();
        List<string> options = args.Skip(subcommandIndex + 1).ToList();

        switch (subcommand)
        {
            case "reset" when options.Contains("--hard"):
                return "git reset --hard is not allowed; it discards uncommitted changes.";
            case "push" when options.Any(option => option == "--force"
                || option.StartsWith("--force-with-lease", StringComparison.Ordinal)
                || IsShortFlagCluster(option, 'f')):
                return "git push --force / -f is not allowed; it can overwrite remote history.";
            case "push" when options.Contains("--no-verify"):
                return "git push --no-verify is not allowed; push hooks must run.";
            case "commit" when options.Contains("--no-verify") || options.Contains("-n"):
                return "git commit --no-verify is not allowed; commit hooks must run.";
            case "clean":
                bool force = options.Contains("--force") || options.Any(option => IsShortFlagCluster(option, 'f'));
                bool dryRun = options.Contains("--dry-run") || options.Any(option => IsShortFlagCluster(option, 'n'));
                return force && !dryRun ? "git clean -f/-fd is not allowed; it deletes untracked files." : null;
            default:
                return null;
        }
    }

    private static string? CheckSql(string part)
    {
        // SQL statements may be separated by ';' inside a quoted argument, so check each one.
        foreach (string statement in part.Split(';'))
        {
            if (DropTable.IsMatch(statement))
            {
                return "DROP TABLE is not allowed; ask before destroying data.";
            }

            if (DropDatabase.IsMatch(statement))
            {
                return "DROP DATABASE is not allowed; ask before destroying data.";
            }

            if (DeleteFrom.IsMatch(statement) && !Where.IsMatch(statement))
            {
                return "DELETE FROM without a WHERE clause is not allowed.";
            }
        }

        return null;
    }

    private static bool IsRecursiveForce(IEnumerable<string> args)
    {
        bool recursive = false;
        bool force = false;
        foreach (string arg in args)
        {
            if (arg == "--")
            {
                break;
            }

            if (arg.Equals("--recursive", StringComparison.OrdinalIgnoreCase))
            {
                recursive = true;
            }
            else if (arg.Equals("--force", StringComparison.OrdinalIgnoreCase))
            {
                force = true;
            }
            else if (arg.Length > 1 && arg[0] == '-' && arg[1] != '-')
            {
                recursive |= arg.Contains('r') || arg.Contains('R');
                force |= arg.Contains('f');
            }
        }

        return recursive && force;
    }

    private static bool IsSedInPlace(List<string> tokens) =>
        tokens.Any(token => CommandName(token).Equals("sed", StringComparison.OrdinalIgnoreCase))
        && tokens.Any(token => token.StartsWith("-i", StringComparison.Ordinal) || token.StartsWith("--in-place", StringComparison.Ordinal));

    private static bool IsShortFlagCluster(string option, char flag) =>
        option.Length > 1 && option[0] == '-' && option[1] != '-' && option.Contains(flag);

    private static bool IsEnvFile(string fileName) =>
        fileName.Equals(".env", StringComparison.OrdinalIgnoreCase)
        || (fileName.StartsWith(".env.", StringComparison.OrdinalIgnoreCase)
            && !fileName.Equals(".env.example", StringComparison.OrdinalIgnoreCase));

    // "/usr/bin/rm" -> "rm", "git.exe" -> "git", "$(rm" -> "rm".
    private static string CommandName(string token)
    {
        string name = token.Trim('$', '(', ')', '`', '{', '}');
        int lastSeparator = Math.Max(name.LastIndexOf('/'), name.LastIndexOf('\\'));
        if (lastSeparator >= 0)
        {
            name = name[(lastSeparator + 1)..];
        }

        return name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? name[..^4] : name;
    }

    // Git Bash style "/c/Users/..." -> "C:\Users\..." on Windows.
    private static string ToNativePath(string path)
    {
        if (OperatingSystem.IsWindows())
        {
            Match match = Regex.Match(path, @"^/([a-zA-Z])(/|$)");
            if (match.Success)
            {
                return $"{match.Groups[1].Value.ToUpperInvariant()}:\\{path[match.Length..]}";
            }
        }

        return path;
    }
}

static class ShellSplitter
{
    // A backslash only escapes these characters; elsewhere it is literal (Windows paths).
    private const string EscapableCharacters = "\"' ;&|<>\n";

    /// <summary>
    /// Splits a command line into pipelines (separated by ; &amp;&amp; || &amp; and newlines);
    /// each pipeline is a list of parts separated by a single |. Quoted text is never split.
    /// </summary>
    public static List<List<string>> SplitPipelines(string command)
    {
        List<List<string>> pipelines = new List<List<string>>();
        List<string> currentPipeline = new List<string>();
        StringBuilder part = new StringBuilder();
        char? quote = null;

        for (int i = 0; i < command.Length; i++)
        {
            char c = command[i];
            char next = i + 1 < command.Length ? command[i + 1] : '\0';
            char previous = i > 0 ? command[i - 1] : '\0';

            if (quote is not null)
            {
                part.Append(c);
                if (c == '\\' && quote == '"' && (next == '"' || next == '\\'))
                {
                    part.Append(next);
                    i++;
                }
                else if (c == quote)
                {
                    quote = null;
                }

                continue;
            }

            if (c == '\\' && EscapableCharacters.Contains(next))
            {
                part.Append(c).Append(next);
                i++;
                continue;
            }

            if (c is '\'' or '"')
            {
                quote = c;
                part.Append(c);
            }
            else if (c == '|' && next == '|')
            {
                EndPart();
                EndPipeline();
                i++;
            }
            else if (c == '|')
            {
                EndPart();
            }
            else if (c == '&' && next == '&')
            {
                EndPart();
                EndPipeline();
                i++;
            }
            else if (c == '&' && previous != '>' && next != '>')
            {
                EndPart();
                EndPipeline();
            }
            else if (c is ';' or '\n' or '\r')
            {
                EndPart();
                EndPipeline();
            }
            else
            {
                part.Append(c);
            }
        }

        EndPart();
        EndPipeline();
        return pipelines;

        void EndPart()
        {
            string text = part.ToString().Trim();
            if (text.Length > 0)
            {
                currentPipeline.Add(text);
            }

            part.Clear();
        }

        void EndPipeline()
        {
            if (currentPipeline.Count > 0)
            {
                pipelines.Add(currentPipeline);
            }

            currentPipeline = new List<string>();
        }
    }

    /// <summary>Splits one command into words (quotes removed) and collects output-redirect targets.</summary>
    public static ParsedCommand Parse(string part)
    {
        List<string> tokens = new List<string>();
        List<string> redirectTargets = new List<string>();
        StringBuilder token = new StringBuilder();
        char? quote = null;
        bool readingRedirectTarget = false;

        for (int i = 0; i < part.Length; i++)
        {
            char c = part[i];
            char next = i + 1 < part.Length ? part[i + 1] : '\0';

            if (quote is not null)
            {
                if (c == '\\' && quote == '"' && (next == '"' || next == '\\'))
                {
                    token.Append(next);
                    i++;
                }
                else if (c == quote)
                {
                    quote = null;
                }
                else
                {
                    token.Append(c);
                }

                continue;
            }

            if (c == '\\' && EscapableCharacters.Contains(next))
            {
                token.Append(next);
                i++;
            }
            else if (c is '\'' or '"')
            {
                quote = c;
            }
            else if (char.IsWhiteSpace(c) || c == '<')
            {
                Flush();
            }
            else if (c == '>')
            {
                // Drop a pending file-descriptor prefix such as "2" in 2> or "&" in &>.
                if (token.Length > 0 && token.ToString().All(ch => char.IsDigit(ch) || ch == '&'))
                {
                    token.Clear();
                }
                else
                {
                    Flush();
                }

                if (next is '>' or '|')
                {
                    i++;
                }

                if (i + 1 < part.Length && part[i + 1] == '&')
                {
                    // Descriptor duplication (2>&1, >&2) has no file target.
                    i++;
                    while (i + 1 < part.Length && (char.IsDigit(part[i + 1]) || part[i + 1] == '-'))
                    {
                        i++;
                    }

                    continue;
                }

                readingRedirectTarget = true;
            }
            else
            {
                token.Append(c);
            }
        }

        Flush();
        return new ParsedCommand(tokens, redirectTargets);

        void Flush()
        {
            if (token.Length == 0)
            {
                return;
            }

            if (readingRedirectTarget)
            {
                redirectTargets.Add(token.ToString());
                readingRedirectTarget = false;
            }
            else
            {
                tokens.Add(token.ToString());
            }

            token.Clear();
        }
    }
}

static class HookLog
{
    public static void Write(string? projectDir, string decision, string tool, string reason)
    {
        // PRE_GUARD_LOG_FILE lets the hook tests log to a temp file instead of the real hooks.log.
        string? logFile = Environment.GetEnvironmentVariable("PRE_GUARD_LOG_FILE");
        if (string.IsNullOrWhiteSpace(logFile))
        {
            if (string.IsNullOrWhiteSpace(projectDir))
            {
                return;
            }

            logFile = Path.Combine(projectDir, ".claude", "logs", "hooks.log");
        }

        try
        {
            string? logDirectory = Path.GetDirectoryName(logFile);
            if (!string.IsNullOrEmpty(logDirectory))
            {
                Directory.CreateDirectory(logDirectory);
            }

            string safeReason = reason.Replace('\r', ' ').Replace('\n', ' ').Replace('|', '/');
            string line = $"{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss.fffZ} | pre-guard | {decision} | {tool} | {safeReason}{Environment.NewLine}";
            File.AppendAllText(logFile, line, new UTF8Encoding(false));
        }
        catch (IOException)
        {
            // Logging must never change the hook's decision.
        }
        catch (UnauthorizedAccessException)
        {
        }
    }
}
