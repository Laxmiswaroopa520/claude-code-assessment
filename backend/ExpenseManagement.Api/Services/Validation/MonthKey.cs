using System.Globalization;
using System.Text.RegularExpressions;

namespace ExpenseManagement.Api.Services.Validation;

/// <summary>A calendar month (year 2000–2100, month 1–12) written as "YYYY-MM".</summary>
public readonly record struct MonthKey(int Year, int Month)
{
    public const int MinYear = 2000;
    public const int MaxYear = 2100;

    private static readonly Regex Pattern = new Regex(@"^(\d{4})-(\d{2})$", RegexOptions.CultureInvariant);

    public DateOnly FirstDay => new DateOnly(Year, Month, 1);

    public DateOnly LastDay => FirstDay.AddMonths(1).AddDays(-1);

    public static MonthKey FromDate(DateOnly date) => new MonthKey(date.Year, date.Month);

    public static bool IsValidYear(int year) => year >= MinYear && year <= MaxYear;

    public static bool TryParse(string? value, out MonthKey monthKey)
    {
        monthKey = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        Match match = Pattern.Match(value.Trim());
        if (!match.Success)
        {
            return false;
        }

        int year = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        int month = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        if (!IsValidYear(year) || month < 1 || month > 12)
        {
            return false;
        }

        monthKey = new MonthKey(year, month);
        return true;
    }

    public override string ToString() =>
        string.Create(CultureInfo.InvariantCulture, $"{Year:D4}-{Month:D2}");
}
