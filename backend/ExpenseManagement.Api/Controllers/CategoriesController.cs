using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Infrastructure;
using ExpenseManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseManagement.Api.Controllers;

[ApiController]
[Route("api/categories")]
public sealed class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CategoryResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        ServiceResult<IReadOnlyList<CategoryResponse>> result = await _categoryService.ListAsync(ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        ServiceResult<CategoryResponse> result = await _categoryService.GetAsync(id, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpPost]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> Create(CategoryRequest request, CancellationToken ct)
    {
        ServiceResult<CategoryResponse> result = await _categoryService.CreateAsync(request, ct);
        return ServiceResultMapper.ToActionResult(this, result, nameof(GetById), category => new { id = category.Id });
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> Update(int id, CategoryRequest request, CancellationToken ct)
    {
        ServiceResult<CategoryResponse> result = await _categoryService.UpdateAsync(id, request, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        ServiceResult<bool> result = await _categoryService.DeleteAsync(id, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }
}
