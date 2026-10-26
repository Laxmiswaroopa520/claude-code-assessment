namespace ExpenseManagement.Api.Contracts;

/// <summary>Body of POST/PUT /api/expenses. Fields are nullable so the service can report each missing field (VR-01…VR-04).</summary>
public sealed record ExpenseRequest(string? Title, decimal? Amount, DateOnly? Date, int? CategoryId, string? Notes);

/// <summary>An expense. <see cref="Warnings"/> holds soft-budget messages and is empty when there are none.</summary>
public sealed record ExpenseResponse(
    int Id,
    string Title,
    decimal Amount,
    DateOnly Date,
    int CategoryId,
    string CategoryName,
    string? Notes,
    DateTime CreatedAt,
    IReadOnlyList<string> Warnings);

/// <summary>Query string of GET /api/expenses (FR-09). Every value is optional; defaults are applied by the service.</summary>
public sealed class ExpenseQuery
{
    public string? Q { get; set; }

    public int? CategoryId { get; set; }

    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }

    public decimal? MinAmount { get; set; }

    public decimal? MaxAmount { get; set; }

    public string? SortBy { get; set; }

    public string? SortDir { get; set; }

    public int? Page { get; set; }

    public int? PageSize { get; set; }
}

/// <summary>A page of results.</summary>
public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount, int TotalPages);
