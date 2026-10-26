namespace ExpenseManagement.Api.Domain;

/// <summary>A spending limit for one category in one calendar month. Unique per (CategoryId, Year, Month).</summary>
public sealed class Budget
{
    public int Id { get; set; }

    public int CategoryId { get; set; }

    public Category? Category { get; set; }

    public int Year { get; set; }

    public int Month { get; set; }

    public decimal LimitAmount { get; set; }

    public BudgetEnforcement Enforcement { get; set; }
}
