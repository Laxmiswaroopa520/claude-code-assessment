using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Services;

public sealed class BudgetService : IBudgetService
{
    private readonly AppDbContext _db;

    public BudgetService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ServiceResult<IReadOnlyList<BudgetResponse>>> ListAsync(string? month, CancellationToken ct)
    {
        IQueryable<Budget> query = _db.Budgets.AsNoTracking().Include(budget => budget.Category);
        if (month is not null)
        {
            if (!MonthKey.TryParse(month, out MonthKey filter))
            {
                return ServiceResult<IReadOnlyList<BudgetResponse>>.ValidationFailed(
                    "month", "month must be YYYY-MM with a year from 2000 to 2100 and a month from 01 to 12.");
            }

            int year = filter.Year;
            int monthNumber = filter.Month;
            query = query.Where(budget => budget.Year == year && budget.Month == monthNumber);
        }

        List<Budget> budgets = await query.ToListAsync(ct);
        List<BudgetResponse> responses = new List<BudgetResponse>();
        foreach (Budget budget in budgets
            .OrderBy(item => item.Year)
            .ThenBy(item => item.Month)
            .ThenBy(item => item.Category?.Name ?? string.Empty, StringComparer.OrdinalIgnoreCase))
        {
            responses.Add(await ToResponseAsync(budget, budget.Category?.Name ?? string.Empty, ct));
        }

        return ServiceResult<IReadOnlyList<BudgetResponse>>.Ok(responses);
    }

    public async Task<ServiceResult<BudgetResponse>> GetAsync(int id, CancellationToken ct)
    {
        Budget? budget = await _db.Budgets.AsNoTracking().Include(item => item.Category).FirstOrDefaultAsync(item => item.Id == id, ct);
        if (budget is null)
        {
            return ServiceResult<BudgetResponse>.NotFound($"Budget {id} was not found.");
        }

        return ServiceResult<BudgetResponse>.Ok(await ToResponseAsync(budget, budget.Category?.Name ?? string.Empty, ct));
    }

    public async Task<ServiceResult<BudgetResponse>> CreateAsync(BudgetRequest request, CancellationToken ct)
    {
        ValidatedBudget validated = await ValidateAsync(request, null, ct);
        if (validated.Errors is not null)
        {
            return ServiceResult<BudgetResponse>.ValidationFailed(validated.Errors);
        }

        if (validated.Conflict is not null)
        {
            return ServiceResult<BudgetResponse>.Conflict(validated.Conflict);
        }

        Budget budget = new Budget
        {
            CategoryId = validated.CategoryId,
            Year = validated.Month.Year,
            Month = validated.Month.Month,
            LimitAmount = validated.Limit,
            Enforcement = validated.Enforcement,
        };
        _db.Budgets.Add(budget);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return ServiceResult<BudgetResponse>.Conflict(DuplicateMessage(validated.CategoryName, validated.Month));
        }

        return ServiceResult<BudgetResponse>.Created(await ToResponseAsync(budget, validated.CategoryName, ct));
    }

    public async Task<ServiceResult<BudgetResponse>> UpdateAsync(int id, BudgetRequest request, CancellationToken ct)
    {
        Budget? budget = await _db.Budgets.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (budget is null)
        {
            return ServiceResult<BudgetResponse>.NotFound($"Budget {id} was not found.");
        }

        ValidatedBudget validated = await ValidateAsync(request, id, ct);
        if (validated.Errors is not null)
        {
            return ServiceResult<BudgetResponse>.ValidationFailed(validated.Errors);
        }

        if (validated.Conflict is not null)
        {
            return ServiceResult<BudgetResponse>.Conflict(validated.Conflict);
        }

        budget.CategoryId = validated.CategoryId;
        budget.Year = validated.Month.Year;
        budget.Month = validated.Month.Month;
        budget.LimitAmount = validated.Limit;
        budget.Enforcement = validated.Enforcement;
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return ServiceResult<BudgetResponse>.Conflict(DuplicateMessage(validated.CategoryName, validated.Month));
        }

        return ServiceResult<BudgetResponse>.Ok(await ToResponseAsync(budget, validated.CategoryName, ct));
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken ct)
    {
        Budget? budget = await _db.Budgets.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (budget is null)
        {
            return ServiceResult<bool>.NotFound($"Budget {id} was not found.");
        }

        _db.Budgets.Remove(budget);
        await _db.SaveChangesAsync(ct);
        return ServiceResult<bool>.NoContent();
    }

    private async Task<ValidatedBudget> ValidateAsync(BudgetRequest request, int? excludeBudgetId, CancellationToken ct)
    {
        ValidationErrors errors = BudgetValidator.Validate(request, out MonthKey month, out BudgetEnforcement enforcement);

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
            return new ValidatedBudget(errors.ToDictionary(), null, 0, string.Empty, default, 0m, default);
        }

        int validCategoryId = request.CategoryId ?? 0;
        int year = month.Year;
        int monthNumber = month.Month;
        bool duplicate = await _db.Budgets.AnyAsync(
            budget => budget.CategoryId == validCategoryId
                && budget.Year == year
                && budget.Month == monthNumber
                && (excludeBudgetId == null || budget.Id != excludeBudgetId),
            ct);
        string? conflict = duplicate ? DuplicateMessage(categoryName, month) : null;

        return new ValidatedBudget(null, conflict, validCategoryId, categoryName, month, request.Limit ?? 0m, enforcement);
    }

    private async Task<BudgetResponse> ToResponseAsync(Budget budget, string categoryName, CancellationToken ct)
    {
        MonthKey month = new MonthKey(budget.Year, budget.Month);
        decimal spent = await SpendingQueries.GetSpentAsync(_db, budget.CategoryId, month, null, ct);
        decimal percentUsed = MoneyRules.RoundForOutput(BudgetCalculator.PercentUsed(spent, budget.LimitAmount));
        BudgetStatus status = BudgetCalculator.GetStatus(spent, budget.LimitAmount);
        return new BudgetResponse(
            budget.Id,
            budget.CategoryId,
            categoryName,
            month.ToString(),
            budget.LimitAmount,
            budget.Enforcement,
            spent,
            budget.LimitAmount - spent,
            percentUsed,
            status);
    }

    private static string DuplicateMessage(string categoryName, MonthKey month) =>
        $"A budget for '{categoryName}' in {month} already exists.";

    private sealed record ValidatedBudget(
        IReadOnlyDictionary<string, string[]>? Errors,
        string? Conflict,
        int CategoryId,
        string CategoryName,
        MonthKey Month,
        decimal Limit,
        BudgetEnforcement Enforcement);
}
