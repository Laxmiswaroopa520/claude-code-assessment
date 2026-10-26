namespace ExpenseManagement.Api.Domain;

/// <summary>A spending category such as Food or Travel. Names are unique, case-insensitively.</summary>
public sealed class Category
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public List<Expense> Expenses { get; set; } = new List<Expense>();

    public List<Budget> Budgets { get; set; } = new List<Budget>();
}
