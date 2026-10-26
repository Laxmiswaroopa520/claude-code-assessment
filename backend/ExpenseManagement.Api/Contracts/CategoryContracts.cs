namespace ExpenseManagement.Api.Contracts;

/// <summary>Body of POST/PUT /api/categories.</summary>
public sealed record CategoryRequest(string? Name, string? Description);

public sealed record CategoryResponse(int Id, string Name, string? Description);
