using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Services.Validation;

public enum ExpenseSortField
{
    Date,
    Amount,
    Title,
}

/// <summary>A validated GET /api/expenses query with defaults applied.</summary>
public sealed record ExpenseQueryOptions(
    string? Search,
    int? CategoryId,
    DateOnly? From,
    DateOnly? To,
    decimal? MinAmount,
    decimal? MaxAmount,
    ExpenseSortField SortBy,
    bool Descending,
    int Page,
    int PageSize);

/// <summary>VR-10…VR-12 for the expense list query.</summary>
public static class ExpenseQueryValidator
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public static ValidationErrors Validate(ExpenseQuery query, out ExpenseQueryOptions options)
    {
        ValidationErrors errors = new ValidationErrors();

        int page = query.Page ?? 1;
        if (page < 1)
        {
            errors.Add("page", "page must be 1 or greater.");
        }

        int pageSize = query.PageSize ?? DefaultPageSize;
        if (pageSize < 1 || pageSize > MaxPageSize)
        {
            errors.Add("pageSize", $"pageSize must be between 1 and {MaxPageSize}.");
        }

        if (query.From is DateOnly from && query.To is DateOnly to && from > to)
        {
            errors.Add("from", "from must be on or before to.");
        }

        if (query.MinAmount is decimal min && query.MaxAmount is decimal max && min > max)
        {
            errors.Add("minAmount", "minAmount must be less than or equal to maxAmount.");
        }

        ExpenseSortField sortBy = ExpenseSortField.Date;
        string sortByText = query.SortBy?.Trim() ?? string.Empty;
        if (sortByText.Length > 0 && !TryParseSortField(sortByText, out sortBy))
        {
            errors.Add("sortBy", "sortBy must be date, amount or title.");
        }

        bool descending = true;
        string sortDirText = query.SortDir?.Trim() ?? string.Empty;
        if (sortDirText.Equals("asc", StringComparison.OrdinalIgnoreCase))
        {
            descending = false;
        }
        else if (sortDirText.Length > 0 && !sortDirText.Equals("desc", StringComparison.OrdinalIgnoreCase))
        {
            errors.Add("sortDir", "sortDir must be asc or desc.");
        }

        string? search = string.IsNullOrWhiteSpace(query.Q) ? null : query.Q.Trim();
        options = new ExpenseQueryOptions(
            search, query.CategoryId, query.From, query.To, query.MinAmount, query.MaxAmount, sortBy, descending, page, pageSize);
        return errors;
    }

    private static bool TryParseSortField(string text, out ExpenseSortField field)
    {
        switch (text.ToLowerInvariant())
        {
            case "date":
                field = ExpenseSortField.Date;
                return true;
            case "amount":
                field = ExpenseSortField.Amount;
                return true;
            case "title":
                field = ExpenseSortField.Title;
                return true;
            default:
                field = ExpenseSortField.Date;
                return false;
        }
    }
}
