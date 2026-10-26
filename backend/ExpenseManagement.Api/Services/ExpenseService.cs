using System.Linq.Expressions;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Services;

public sealed class ExpenseService : IExpenseService
{
    private static readonly IReadOnlyList<string> NoWarnings = Array.Empty<string>();

    private static readonly Expression<Func<Expense, ExpenseRow>> ToRow = expense => new ExpenseRow(
        expense.Id,
        expense.Title,
        expense.Amount,
        expense.Date,
        expense.CategoryId,
        expense.Category != null ? expense.Category.Name : string.Empty,
        expense.Notes,
        expense.CreatedAt);

    private readonly AppDbContext _db;
    private readonly TimeProvider _timeProvider;

    public ExpenseService(AppDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task<ServiceResult<PagedResponse<ExpenseResponse>>> ListAsync(ExpenseQuery query, CancellationToken ct)
    {
        ValidationErrors errors = ExpenseQueryValidator.Validate(query, out ExpenseQueryOptions options);
        if (errors.HasErrors)
        {
            return ServiceResult<PagedResponse<ExpenseResponse>>.ValidationFailed(errors.ToDictionary());
        }

        // Filters that SQLite can evaluate run in SQL.
        IQueryable<Expense> source = _db.Expenses.AsNoTracking();
        if (options.CategoryId is int categoryId)
        {
            source = source.Where(expense => expense.CategoryId == categoryId);
        }

        if (options.From is DateOnly from)
        {
            source = source.Where(expense => expense.Date >= from);
        }

        if (options.To is DateOnly to)
        {
            source = source.Where(expense => expense.Date <= to);
        }

        if (options.Search is string search)
        {
            string pattern = "%" + EscapeLikePattern(search) + "%";
            source = source.Where(expense =>
                EF.Functions.Like(expense.Title, pattern, "\\")
                || (expense.Notes != null && EF.Functions.Like(expense.Notes, pattern, "\\")));
        }

        List<ExpenseRow> rows = await source.Select(ToRow).ToListAsync(ct);

        // SQLite stores decimal as TEXT: amount comparisons and sorting happen in C# (see data-and-migrations rule).
        IEnumerable<ExpenseRow> filtered = rows;
        if (options.MinAmount is decimal minAmount)
        {
            filtered = filtered.Where(row => row.Amount >= minAmount);
        }

        if (options.MaxAmount is decimal maxAmount)
        {
            filtered = filtered.Where(row => row.Amount <= maxAmount);
        }

        List<ExpenseRow> sorted = Sort(filtered, options.SortBy, options.Descending).ToList();
        int totalCount = sorted.Count;
        int totalPages = (totalCount + options.PageSize - 1) / options.PageSize;
        List<ExpenseResponse> items = sorted
            .Skip((options.Page - 1) * options.PageSize)
            .Take(options.PageSize)
            .Select(row => ToResponse(row, NoWarnings))
            .ToList();

        PagedResponse<ExpenseResponse> page = new PagedResponse<ExpenseResponse>(items, options.Page, options.PageSize, totalCount, totalPages);
        return ServiceResult<PagedResponse<ExpenseResponse>>.Ok(page);
    }

    public async Task<ServiceResult<ExpenseResponse>> GetAsync(int id, CancellationToken ct)
    {
        ExpenseRow? row = await _db.Expenses.AsNoTracking().Where(expense => expense.Id == id).Select(ToRow).FirstOrDefaultAsync(ct);
        return row is null
            ? ServiceResult<ExpenseResponse>.NotFound($"Expense {id} was not found.")
            : ServiceResult<ExpenseResponse>.Ok(ToResponse(row, NoWarnings));
    }

    public async Task<ServiceResult<ExpenseResponse>> CreateAsync(ExpenseRequest request, CancellationToken ct)
    {
        ValidatedExpense validated = await ValidateAsync(request, ct);
        if (validated.Errors is not null)
        {
            return ServiceResult<ExpenseResponse>.ValidationFailed(validated.Errors);
        }

        BudgetCheck check = await CheckBudgetAsync(validated, null, ct);
        if (check.Rejection is not null)
        {
            return check.Rejection;
        }

        Expense expense = new Expense
        {
            Title = validated.Title,
            Amount = validated.Amount,
            Date = validated.Date,
            CategoryId = validated.CategoryId,
            Notes = validated.Notes,
            CreatedAt = _timeProvider.GetUtcNow().UtcDateTime,
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync(ct);

        return ServiceResult<ExpenseResponse>.Created(ToResponse(expense, validated.CategoryName, check.Warnings), check.Warnings);
    }

    public async Task<ServiceResult<ExpenseResponse>> UpdateAsync(int id, ExpenseRequest request, CancellationToken ct)
    {
        Expense? expense = await _db.Expenses.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (expense is null)
        {
            return ServiceResult<ExpenseResponse>.NotFound($"Expense {id} was not found.");
        }

        ValidatedExpense validated = await ValidateAsync(request, ct);
        if (validated.Errors is not null)
        {
            return ServiceResult<ExpenseResponse>.ValidationFailed(validated.Errors);
        }

        // BR-04: exclude this expense's current amount and check the target category and month.
        BudgetCheck check = await CheckBudgetAsync(validated, id, ct);
        if (check.Rejection is not null)
        {
            return check.Rejection;
        }

        expense.Title = validated.Title;
        expense.Amount = validated.Amount;
        expense.Date = validated.Date;
        expense.CategoryId = validated.CategoryId;
        expense.Notes = validated.Notes;
        await _db.SaveChangesAsync(ct);

        return ServiceResult<ExpenseResponse>.Ok(ToResponse(expense, validated.CategoryName, check.Warnings), check.Warnings);
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken ct)
    {
        Expense? expense = await _db.Expenses.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (expense is null)
        {
            return ServiceResult<bool>.NotFound($"Expense {id} was not found.");
        }

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync(ct);
        return ServiceResult<bool>.NoContent();
    }

    private async Task<ValidatedExpense> ValidateAsync(ExpenseRequest request, CancellationToken ct)
    {
        DateOnly today = DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);
        ValidationErrors errors = ExpenseValidator.Validate(request, today);

        string categoryName = string.Empty;
        if (request.CategoryId is int categoryId)
        {
            string? name = await _db.Categories
                .AsNoTracking()
                .Where(category => category.Id == categoryId)
                .Select(category => category.Name)
                .FirstOrDefaultAsync(ct);
            if (name is null)
            {
                errors.Add("CategoryId", $"Category {categoryId} does not exist.");
            }
            else
            {
                categoryName = name;
            }
        }

        if (errors.HasErrors)
        {
            return ValidatedExpense.Failed(errors.ToDictionary());
        }

        return new ValidatedExpense(
            null,
            (request.Title ?? string.Empty).Trim(),
            request.Amount ?? 0m,
            request.Date ?? today,
            request.CategoryId ?? 0,
            categoryName,
            string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim());
    }

    private async Task<BudgetCheck> CheckBudgetAsync(ValidatedExpense expense, int? excludeExpenseId, CancellationToken ct)
    {
        MonthKey month = MonthKey.FromDate(expense.Date);
        int categoryId = expense.CategoryId;
        int year = month.Year;
        int monthNumber = month.Month;

        Budget? budget = await _db.Budgets
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.CategoryId == categoryId && item.Year == year && item.Month == monthNumber, ct);
        if (budget is null)
        {
            return new BudgetCheck(null, NoWarnings);
        }

        decimal spentBefore = await SpendingQueries.GetSpentAsync(_db, categoryId, month, excludeExpenseId, ct);
        BudgetDecision decision = BudgetCalculator.Evaluate(
            budget.LimitAmount, budget.Enforcement, spentBefore, expense.Amount, expense.CategoryName, month);

        if (decision.Rejected)
        {
            string detail =
                $"Hard budget for '{expense.CategoryName}' in {month} would be exceeded: " +
                $"{BudgetCalculator.Format(spentBefore)} spent + {BudgetCalculator.Format(expense.Amount)} attempted > " +
                $"{BudgetCalculator.Format(budget.LimitAmount)} limit.";
            Dictionary<string, object?> extensions = new Dictionary<string, object?>
            {
                ["categoryId"] = categoryId,
                ["month"] = month.ToString(),
                ["limit"] = budget.LimitAmount,
                ["currentSpent"] = spentBefore,
                ["attemptedAmount"] = expense.Amount,
            };
            return new BudgetCheck(ServiceResult<ExpenseResponse>.BudgetRejected(detail, extensions), NoWarnings);
        }

        IReadOnlyList<string> warnings = decision.Warning is null ? NoWarnings : new string[] { decision.Warning };
        return new BudgetCheck(null, warnings);
    }

    private static IEnumerable<ExpenseRow> Sort(IEnumerable<ExpenseRow> rows, ExpenseSortField sortBy, bool descending)
    {
        IOrderedEnumerable<ExpenseRow> ordered = (sortBy, descending) switch
        {
            (ExpenseSortField.Amount, false) => rows.OrderBy(row => row.Amount),
            (ExpenseSortField.Amount, true) => rows.OrderByDescending(row => row.Amount),
            (ExpenseSortField.Title, false) => rows.OrderBy(row => row.Title, StringComparer.OrdinalIgnoreCase),
            (ExpenseSortField.Title, true) => rows.OrderByDescending(row => row.Title, StringComparer.OrdinalIgnoreCase),
            (_, false) => rows.OrderBy(row => row.Date),
            (_, true) => rows.OrderByDescending(row => row.Date),
        };

        // Stable, deterministic order for equal keys.
        return descending ? ordered.ThenByDescending(row => row.Id) : ordered.ThenBy(row => row.Id);
    }

    private static string EscapeLikePattern(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    private static ExpenseResponse ToResponse(ExpenseRow row, IReadOnlyList<string> warnings) =>
        new ExpenseResponse(row.Id, row.Title, row.Amount, row.Date, row.CategoryId, row.CategoryName, row.Notes, row.CreatedAt, warnings);

    private static ExpenseResponse ToResponse(Expense expense, string categoryName, IReadOnlyList<string> warnings) =>
        new ExpenseResponse(
            expense.Id, expense.Title, expense.Amount, expense.Date, expense.CategoryId, categoryName, expense.Notes, expense.CreatedAt, warnings);

    private sealed record ExpenseRow(
        int Id, string Title, decimal Amount, DateOnly Date, int CategoryId, string CategoryName, string? Notes, DateTime CreatedAt);

    private sealed record BudgetCheck(ServiceResult<ExpenseResponse>? Rejection, IReadOnlyList<string> Warnings);

    private sealed record ValidatedExpense(
        IReadOnlyDictionary<string, string[]>? Errors,
        string Title,
        decimal Amount,
        DateOnly Date,
        int CategoryId,
        string CategoryName,
        string? Notes)
    {
        public static ValidatedExpense Failed(IReadOnlyDictionary<string, string[]> errors) =>
            new ValidatedExpense(errors, string.Empty, 0m, default, 0, string.Empty, null);
    }
}
