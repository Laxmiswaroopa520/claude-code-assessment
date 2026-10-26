namespace ExpenseManagement.Api.Services;

/// <summary>Outcome of a service call. Controllers map it to HTTP through ServiceResultMapper.</summary>
public enum ServiceStatus
{
    Ok,
    Created,
    NoContent,
    ValidationFailed,
    NotFound,
    Conflict,
    BudgetRejected,
}

/// <summary>HTTP-agnostic result of a service operation.</summary>
public sealed record ServiceResult<T>(
    ServiceStatus Status,
    T? Value,
    IReadOnlyList<string> Warnings,
    IReadOnlyDictionary<string, string[]>? Errors,
    string? Detail,
    IReadOnlyDictionary<string, object?>? Extensions)
{
    private static readonly IReadOnlyList<string> NoWarnings = Array.Empty<string>();

    public static ServiceResult<T> Ok(T value) =>
        new ServiceResult<T>(ServiceStatus.Ok, value, NoWarnings, null, null, null);

    public static ServiceResult<T> Ok(T value, IReadOnlyList<string> warnings) =>
        new ServiceResult<T>(ServiceStatus.Ok, value, warnings, null, null, null);

    public static ServiceResult<T> Created(T value) =>
        new ServiceResult<T>(ServiceStatus.Created, value, NoWarnings, null, null, null);

    public static ServiceResult<T> Created(T value, IReadOnlyList<string> warnings) =>
        new ServiceResult<T>(ServiceStatus.Created, value, warnings, null, null, null);

    public static ServiceResult<T> NoContent() =>
        new ServiceResult<T>(ServiceStatus.NoContent, default, NoWarnings, null, null, null);

    public static ServiceResult<T> ValidationFailed(IReadOnlyDictionary<string, string[]> errors) =>
        new ServiceResult<T>(ServiceStatus.ValidationFailed, default, NoWarnings, errors, null, null);

    public static ServiceResult<T> ValidationFailed(string field, string message) =>
        ValidationFailed(new Dictionary<string, string[]> { [field] = new string[] { message } });

    public static ServiceResult<T> NotFound(string detail) =>
        new ServiceResult<T>(ServiceStatus.NotFound, default, NoWarnings, null, detail, null);

    public static ServiceResult<T> Conflict(string detail) =>
        new ServiceResult<T>(ServiceStatus.Conflict, default, NoWarnings, null, detail, null);

    public static ServiceResult<T> BudgetRejected(string detail, IReadOnlyDictionary<string, object?> extensions) =>
        new ServiceResult<T>(ServiceStatus.BudgetRejected, default, NoWarnings, null, detail, extensions);
}
