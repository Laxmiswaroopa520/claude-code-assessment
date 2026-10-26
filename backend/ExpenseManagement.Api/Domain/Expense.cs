namespace ExpenseManagement.Api.Domain;

/// <summary>A single expense. <see cref="Amount"/> is money (decimal(18,2)); <see cref="Date"/> is a calendar date.</summary>
public sealed class Expense
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public DateOnly Date { get; set; }

    public int CategoryId { get; set; }

    public Category? Category { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
}
