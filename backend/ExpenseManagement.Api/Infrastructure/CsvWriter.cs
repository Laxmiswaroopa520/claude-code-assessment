namespace ExpenseManagement.Api.Infrastructure;

/// <summary>RFC 4180 field escaping, plus spreadsheet formula neutralisation (security rule).</summary>
public static class CsvWriter
{
    private static readonly char[] FormulaPrefixes = new char[] { '=', '+', '-', '@', '\t', '\r' };
    private static readonly char[] CharactersNeedingQuotes = new char[] { ',', '"', '\r', '\n' };

    /// <summary>Joins already-formatted fields into one CSV record (no line ending).</summary>
    public static string FormatRecord(IEnumerable<string?> fields) => string.Join(",", fields.Select(EscapeField));

    /// <summary>
    /// Prefixes text that starts with = + - @ (or tab/CR) with an apostrophe so spreadsheets don't run it as a formula,
    /// then quotes the field if it contains a comma, quote or line break, doubling inner quotes.
    /// </summary>
    public static string EscapeField(string? value)
    {
        string text = value ?? string.Empty;
        if (text.Length > 0 && Array.IndexOf(FormulaPrefixes, text[0]) >= 0)
        {
            text = "'" + text;
        }

        if (text.IndexOfAny(CharactersNeedingQuotes) < 0)
        {
            return text;
        }

        return "\"" + text.Replace("\"", "\"\"") + "\"";
    }
}
