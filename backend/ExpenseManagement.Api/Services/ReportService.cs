using System.Globalization;
using System.Text;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Infrastructure;
using ExpenseManagement.Api.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Services;

/// <summary>A CSV download.</summary>
public sealed record CsvFile(string FileName, byte[] Content);

/// <summary>Exactly one of <see cref="Json"/> or <see cref="Csv"/> is set.</summary>
public sealed record ReportOutput(MonthlyReport? Json, CsvFile? Csv);

public sealed class ReportService : IReportService
{
    public static readonly string[] CsvHeader = new string[] { "Date", "Title", "Category", "Amount" };

    private readonly AppDbContext _db;
    private readonly TimeProvider _timeProvider;

    public ReportService(AppDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task<ServiceResult<ReportOutput>> GetMonthlyReportAsync(string? month, string? format, CancellationToken ct)
    {
        ValidationErrors errors = new ValidationErrors();
        if (!MonthKey.TryParse(month, out MonthKey monthKey))
        {
            errors.Add("month", "month is required as YYYY-MM with a year from 2000 to 2100 and a month from 01 to 12.");
        }

        string normalizedFormat = string.IsNullOrWhiteSpace(format) ? "json" : format.Trim().ToLowerInvariant();
        if (normalizedFormat != "json" && normalizedFormat != "csv")
        {
            errors.Add("format", "format must be json or csv.");
        }

        if (errors.HasErrors)
        {
            return ServiceResult<ReportOutput>.ValidationFailed(errors.ToDictionary());
        }

        DateOnly first = monthKey.FirstDay;
        DateOnly last = monthKey.LastDay;
        List<ReportExpenseRow> expenses = await _db.Expenses
            .AsNoTracking()
            .Where(expense => expense.Date >= first && expense.Date <= last)
            .OrderBy(expense => expense.Date)
            .ThenBy(expense => expense.Id)
            .Select(expense => new ReportExpenseRow(
                expense.Id,
                expense.Date,
                expense.Title,
                expense.Category != null ? expense.Category.Name : string.Empty,
                expense.Amount,
                expense.Notes))
            .ToListAsync(ct);

        if (normalizedFormat == "csv")
        {
            CsvFile file = new CsvFile($"expenses-{monthKey}.csv", BuildCsv(expenses));
            return ServiceResult<ReportOutput>.Ok(new ReportOutput(null, file));
        }

        IReadOnlyList<CategorySummaryRow> categories = await MonthSummaryLoader.LoadCategoryRowsAsync(_db, monthKey, ct);
        MonthlyReport report = new MonthlyReport(
            monthKey.ToString(),
            first,
            last,
            _timeProvider.GetUtcNow().UtcDateTime,
            expenses.Sum(expense => expense.Amount),
            expenses.Count,
            categories,
            expenses);
        return ServiceResult<ReportOutput>.Ok(new ReportOutput(report, null));
    }

    /// <summary>RFC 4180 CSV, invariant culture, ISO dates, 2-decimal amounts, UTF-8 without BOM.</summary>
    public static byte[] BuildCsv(IReadOnlyList<ReportExpenseRow> expenses)
    {
        StringBuilder csv = new StringBuilder();
        csv.Append(CsvWriter.FormatRecord(CsvHeader)).Append("\r\n");
        foreach (ReportExpenseRow expense in expenses)
        {
            string[] fields = new string[]
            {
                expense.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                expense.Title,
                expense.CategoryName,
                expense.Amount.ToString("0.00", CultureInfo.InvariantCulture),
            };
            csv.Append(CsvWriter.FormatRecord(fields)).Append("\r\n");
        }

        return new UTF8Encoding(false).GetBytes(csv.ToString());
    }
}
