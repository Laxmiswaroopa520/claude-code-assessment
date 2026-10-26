using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Services;

public sealed class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ServiceResult<IReadOnlyList<CategoryResponse>>> ListAsync(CancellationToken ct)
    {
        // Name has NOCASE collation, so ORDER BY in SQL is case-insensitive.
        List<CategoryResponse> categories = await _db.Categories
            .AsNoTracking()
            .OrderBy(category => category.Name)
            .Select(category => new CategoryResponse(category.Id, category.Name, category.Description))
            .ToListAsync(ct);
        return ServiceResult<IReadOnlyList<CategoryResponse>>.Ok(categories);
    }

    public async Task<ServiceResult<CategoryResponse>> GetAsync(int id, CancellationToken ct)
    {
        Category? category = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, ct);
        return category is null
            ? ServiceResult<CategoryResponse>.NotFound($"Category {id} was not found.")
            : ServiceResult<CategoryResponse>.Ok(ToResponse(category));
    }

    public async Task<ServiceResult<CategoryResponse>> CreateAsync(CategoryRequest request, CancellationToken ct)
    {
        ValidationErrors errors = CategoryValidator.Validate(request);
        if (errors.HasErrors)
        {
            return ServiceResult<CategoryResponse>.ValidationFailed(errors.ToDictionary());
        }

        string name = (request.Name ?? string.Empty).Trim();
        if (await NameExistsAsync(name, null, ct))
        {
            return ServiceResult<CategoryResponse>.Conflict($"A category named '{name}' already exists.");
        }

        Category category = new Category { Name = name, Description = NormalizeDescription(request.Description) };
        _db.Categories.Add(category);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // A concurrent request created the same name between the check and the insert.
            return ServiceResult<CategoryResponse>.Conflict($"A category named '{name}' already exists.");
        }

        return ServiceResult<CategoryResponse>.Created(ToResponse(category));
    }

    public async Task<ServiceResult<CategoryResponse>> UpdateAsync(int id, CategoryRequest request, CancellationToken ct)
    {
        Category? category = await _db.Categories.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (category is null)
        {
            return ServiceResult<CategoryResponse>.NotFound($"Category {id} was not found.");
        }

        ValidationErrors errors = CategoryValidator.Validate(request);
        if (errors.HasErrors)
        {
            return ServiceResult<CategoryResponse>.ValidationFailed(errors.ToDictionary());
        }

        string name = (request.Name ?? string.Empty).Trim();
        if (await NameExistsAsync(name, id, ct))
        {
            return ServiceResult<CategoryResponse>.Conflict($"A category named '{name}' already exists.");
        }

        category.Name = name;
        category.Description = NormalizeDescription(request.Description);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return ServiceResult<CategoryResponse>.Conflict($"A category named '{name}' already exists.");
        }

        return ServiceResult<CategoryResponse>.Ok(ToResponse(category));
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken ct)
    {
        Category? category = await _db.Categories.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (category is null)
        {
            return ServiceResult<bool>.NotFound($"Category {id} was not found.");
        }

        bool hasExpenses = await _db.Expenses.AnyAsync(expense => expense.CategoryId == id, ct);
        if (hasExpenses)
        {
            return ServiceResult<bool>.Conflict($"Category '{category.Name}' has expenses and cannot be deleted.");
        }

        // BR-06: budgets go with the category. FKs are Restrict, so delete them explicitly in the same save.
        List<Budget> budgets = await _db.Budgets.Where(budget => budget.CategoryId == id).ToListAsync(ct);
        _db.Budgets.RemoveRange(budgets);
        _db.Categories.Remove(category);
        await _db.SaveChangesAsync(ct);
        return ServiceResult<bool>.NoContent();
    }

    private async Task<bool> NameExistsAsync(string name, int? excludeId, CancellationToken ct)
    {
        string lowered = name.ToLowerInvariant();
        return await _db.Categories.AnyAsync(
            category => category.Name.ToLower() == lowered && (excludeId == null || category.Id != excludeId),
            ct);
    }

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();

    private static CategoryResponse ToResponse(Category category) =>
        new CategoryResponse(category.Id, category.Name, category.Description);
}
