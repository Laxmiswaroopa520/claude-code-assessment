using ExpenseManagement.Api.Domain;

namespace ExpenseManagement.Api.Contracts;

/// <summary>One month in GET /api/summaries/monthly (FR-13).</summary>
public sealed record MonthlyTotalResponse(string Month, decimal Total, int Count);

/// <summary>One category in GET /api/summaries/categories (FR-14) and in the monthly report.</summary>
public sealed record CategorySummaryRow(
    int CategoryId,
    string CategoryName,
    decimal Total,
    int Count,
    decimal PercentOfTotal,
    decimal? BudgetLimit,
    decimal? PercentUsed,
    BudgetStatus? Status);
