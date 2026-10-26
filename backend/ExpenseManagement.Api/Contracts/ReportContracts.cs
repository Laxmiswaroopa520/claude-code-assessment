namespace ExpenseManagement.Api.Contracts;

/// <summary>JSON body of GET /api/reports/monthly?format=json (FR-15).</summary>
public sealed record MonthlyReport(
    string Month,
    DateOnly From,
    DateOnly To,
    DateTime GeneratedAt,
    decimal GrandTotal,
    int ExpenseCount,
    IReadOnlyList<CategorySummaryRow> Categories,
    IReadOnlyList<ReportExpenseRow> Expenses);

public sealed record ReportExpenseRow(int Id, DateOnly Date, string Title, string CategoryName, decimal Amount, string? Notes);
