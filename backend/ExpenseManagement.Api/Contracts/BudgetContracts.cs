using ExpenseManagement.Api.Domain;

namespace ExpenseManagement.Api.Contracts;

/// <summary>Body of POST/PUT /api/budgets (FR-10): month is "YYYY-MM", type is "Hard" or "Soft".</summary>
public sealed record BudgetRequest(int? CategoryId, string? Month, decimal? Limit, string? Type);

/// <summary>A budget with its calculated usage for its month (BR-01).</summary>
public sealed record BudgetResponse(
    int Id,
    int CategoryId,
    string CategoryName,
    string Month,
    decimal Limit,
    BudgetEnforcement Type,
    decimal Spent,
    decimal Remaining,
    decimal PercentUsed,
    BudgetStatus Status);
