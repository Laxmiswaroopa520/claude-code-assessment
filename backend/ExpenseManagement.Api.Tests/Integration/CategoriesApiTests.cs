using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Tests.TestSupport;

namespace ExpenseManagement.Api.Tests.Integration;

public sealed class CategoriesApiTests : ApiTestBase
{
    [Fact]
    [Trait("Requirement", "FR-01 AC1")]
    public async Task CreateCategory_ValidName_Returns201WithLocation()
    {
        // Arrange
        CategoryRequest request = new CategoryRequest("  Food  ", "Groceries");

        // Act
        HttpResponseMessage response = await Client.PostAsJsonAsync("/api/categories", request, Json);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        CategoryResponse created = await ReadAsync<CategoryResponse>(response);
        Assert.True(created.Id > 0);
        Assert.Equal("Food", created.Name);
        Assert.NotNull(response.Headers.Location);
        Assert.EndsWith($"/api/categories/{created.Id}", response.Headers.Location.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [Trait("Requirement", "FR-01 AC2")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")]
    public async Task CreateCategory_InvalidName_Returns400WithNameError(string name)
    {
        // Arrange
        CategoryRequest request = new CategoryRequest(name, null);

        // Act
        HttpResponseMessage response = await Client.PostAsJsonAsync("/api/categories", request, Json);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await ReadProblemAsync(response);
        AssertHasError(problem, "Name");
    }

    [Fact]
    [Trait("Requirement", "FR-01 AC3")]
    public async Task CreateCategory_DuplicateNameDifferentCase_Returns409()
    {
        // Arrange
        await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await Client.PostAsJsonAsync("/api/categories", new CategoryRequest("food", null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await ReadProblemAsync(response);
    }

    [Fact]
    [Trait("Requirement", "FR-02 AC1")]
    public async Task ListCategories_ReturnsAllSortedByName()
    {
        // Arrange
        await CreateCategoryAsync("Travel");
        await CreateCategoryAsync("food");
        await CreateCategoryAsync("Health");

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/categories");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<CategoryResponse> categories = await ReadAsync<List<CategoryResponse>>(response);
        Assert.Equal(new[] { "food", "Health", "Travel" }, categories.Select(category => category.Name));
    }

    [Fact]
    [Trait("Requirement", "FR-02 AC2")]
    public async Task GetCategory_UnknownId_Returns404Problem()
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/categories/9999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        JsonElement problem = await ReadProblemAsync(response);
        Assert.Equal("Not Found", problem.GetProperty("title").GetString());
    }

    [Fact]
    [Trait("Requirement", "FR-03 AC1")]
    public async Task UpdateCategory_ValidName_Returns200WithUpdatedRecord()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync($"/api/categories/{category.Id}", new CategoryRequest("Groceries", "Weekly shop"), Json);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        CategoryResponse updated = await ReadAsync<CategoryResponse>(response);
        Assert.Equal("Groceries", updated.Name);
        Assert.Equal("Weekly shop", updated.Description);
    }

    [Fact]
    [Trait("Requirement", "FR-03 AC1")]
    public async Task UpdateCategory_SameNameDifferentCase_Returns200()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("food");

        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync($"/api/categories/{category.Id}", new CategoryRequest("Food", null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-03 AC2")]
    public async Task UpdateCategory_DuplicateName_Returns409()
    {
        // Arrange
        await CreateCategoryAsync("Food");
        CategoryResponse travel = await CreateCategoryAsync("Travel");

        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync($"/api/categories/{travel.Id}", new CategoryRequest("FOOD", null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-03 AC2")]
    public async Task UpdateCategory_UnknownId_Returns404()
    {
        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync("/api/categories/9999", new CategoryRequest("Food", null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-04 AC1")]
    public async Task DeleteCategory_NoExpenses_Returns204ThenGetReturns404()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await Client.DeleteAsync($"/api/categories/{category.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        HttpResponseMessage get = await Client.GetAsync($"/api/categories/{category.Id}");
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-04 AC2")]
    public async Task DeleteCategory_WithExpenses_Returns409AndCategoryStillExists()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateExpenseAsync(category.Id, 10m);

        // Act
        HttpResponseMessage response = await Client.DeleteAsync($"/api/categories/{category.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await ReadProblemAsync(response);
        HttpResponseMessage get = await Client.GetAsync($"/api/categories/{category.Id}");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "BR-06")]
    public async Task DeleteCategory_WithBudgetsOnly_DeletesCategoryAndBudgets()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        BudgetResponse budget = await CreateBudgetAsync(category.Id, CurrentMonth, 100m, "Hard");

        // Act
        HttpResponseMessage response = await Client.DeleteAsync($"/api/categories/{category.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        HttpResponseMessage getBudget = await Client.GetAsync($"/api/budgets/{budget.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getBudget.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-04 AC1")]
    public async Task DeleteCategory_UnknownId_Returns404()
    {
        // Act
        HttpResponseMessage response = await Client.DeleteAsync("/api/categories/9999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
