using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Tests.TestSupport;

namespace ExpenseManagement.Api.Tests.Integration;

public sealed class BudgetsApiTests : ApiTestBase
{
    [Fact]
    [Trait("Requirement", "FR-10 AC1")]
    public async Task CreateBudget_ValidBody_Returns201WithLocation()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await Client.PostAsJsonAsync(
            "/api/budgets", new BudgetRequest(category.Id, "2026-10", 500m, "Hard"), Json);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        BudgetResponse budget = await ReadAsync<BudgetResponse>(response);
        Assert.Equal("2026-10", budget.Month);
        Assert.Equal(500m, budget.Limit);
        Assert.Equal(BudgetEnforcement.Hard, budget.Type);
        Assert.Equal(BudgetStatus.OnTrack, budget.Status);
    }

    [Fact]
    [Trait("Requirement", "FR-10 AC2")]
    public async Task CreateBudget_SameCategoryAndMonth_Returns409()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateBudgetAsync(category.Id, "2026-10", 500m, "Hard");

        // Act
        HttpResponseMessage response = await Client.PostAsJsonAsync(
            "/api/budgets", new BudgetRequest(category.Id, "2026-10", 300m, "Soft"), Json);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await ReadProblemAsync(response);
    }

    [Theory]
    [Trait("Requirement", "FR-10 AC3")]
    [InlineData("0", "2026-10", "Hard", "Limit")]
    [InlineData("100", "2026-13", "Hard", "Month")]
    [InlineData("100", "2026-10", "Weekly", "Type")]
    public async Task CreateBudget_InvalidBody_Returns400(string limit, string month, string type, string field)
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await Client.PostAsJsonAsync(
            "/api/budgets", new BudgetRequest(category.Id, month, Money(limit), type), Json);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), field);
    }

    [Fact]
    [Trait("Requirement", "FR-10 AC3")]
    public async Task CreateBudget_UnknownCategory_Returns400()
    {
        // Act
        HttpResponseMessage response = await Client.PostAsJsonAsync(
            "/api/budgets", new BudgetRequest(9999, "2026-10", 100m, "Hard"), Json);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "CategoryId");
    }

    [Fact]
    [Trait("Requirement", "FR-10 AC4")]
    public async Task GetBudget_IncludesSpentRemainingPercentAndStatus()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        BudgetResponse budget = await CreateBudgetAsync(category.Id, CurrentMonth, 200m, "Soft");
        await CreateExpenseAsync(category.Id, 100m);
        await CreateExpenseAsync(category.Id, 70m);
        await CreateExpenseAsync(category.Id, 500m, new DateOnly(2026, 9, 30));

        // Act
        HttpResponseMessage response = await Client.GetAsync($"/api/budgets/{budget.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        BudgetResponse loaded = await ReadAsync<BudgetResponse>(response);
        Assert.Equal(170m, loaded.Spent);
        Assert.Equal(30m, loaded.Remaining);
        Assert.Equal(85.00m, loaded.PercentUsed);
        Assert.Equal(BudgetStatus.Warning, loaded.Status);
    }

    [Fact]
    [Trait("Requirement", "FR-10 AC4")]
    public async Task ListBudgets_MonthFilter_ReturnsOnlyThatMonth()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateBudgetAsync(category.Id, "2026-09", 100m, "Hard");
        await CreateBudgetAsync(category.Id, "2026-10", 200m, "Soft");

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/budgets?month=2026-10");

        // Assert
        List<BudgetResponse> budgets = await ReadAsync<List<BudgetResponse>>(response);
        BudgetResponse only = Assert.Single(budgets);
        Assert.Equal("2026-10", only.Month);
    }

    [Fact]
    [Trait("Requirement", "VR-07")]
    public async Task ListBudgets_InvalidMonth_Returns400()
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/budgets?month=2026-13");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "month");
    }

    [Fact]
    [Trait("Requirement", "FR-10 AC1")]
    public async Task UpdateBudget_ValidBody_Returns200AndDuplicateReturns409()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        BudgetResponse september = await CreateBudgetAsync(category.Id, "2026-09", 100m, "Hard");
        await CreateBudgetAsync(category.Id, "2026-10", 200m, "Hard");

        // Act
        HttpResponseMessage updated = await Client.PutAsJsonAsync(
            $"/api/budgets/{september.Id}", new BudgetRequest(category.Id, "2026-09", 150m, "Soft"), Json);
        HttpResponseMessage duplicate = await Client.PutAsJsonAsync(
            $"/api/budgets/{september.Id}", new BudgetRequest(category.Id, "2026-10", 150m, "Soft"), Json);

        // Assert
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        BudgetResponse body = await ReadAsync<BudgetResponse>(updated);
        Assert.Equal(150m, body.Limit);
        Assert.Equal(BudgetEnforcement.Soft, body.Type);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-10 AC1")]
    public async Task DeleteBudget_ExistingThenRepeated_Returns204Then404()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        BudgetResponse budget = await CreateBudgetAsync(category.Id, CurrentMonth, 100m, "Hard");

        // Act
        HttpResponseMessage first = await Client.DeleteAsync($"/api/budgets/{budget.Id}");
        HttpResponseMessage second = await Client.DeleteAsync($"/api/budgets/{budget.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, second.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-11 AC1")]
    public async Task CreateExpense_HardBudgetExactlyAtLimit_Returns201AndStatusWarning()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        BudgetResponse budget = await CreateBudgetAsync(category.Id, CurrentMonth, 100m, "Hard");
        await CreateExpenseAsync(category.Id, 90m);

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Snack", 10m, Today, category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        BudgetResponse status = await ReadAsync<BudgetResponse>(await Client.GetAsync($"/api/budgets/{budget.Id}"));
        Assert.Equal(BudgetStatus.Warning, status.Status);
        Assert.Equal(100m, status.Spent);
    }

    [Fact]
    [Trait("Requirement", "FR-11 AC2")]
    public async Task CreateExpense_HardBudgetOverByOneCent_Returns422AndSavesNothing()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateBudgetAsync(category.Id, CurrentMonth, 100m, "Hard");
        await CreateExpenseAsync(category.Id, 90m);
        int before = await CountExpensesAsync();

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Snack", 10.01m, Today, category.Id, null));

        // Assert
        Assert.Equal((HttpStatusCode)422, response.StatusCode);
        JsonElement problem = await ReadProblemAsync(response);
        Assert.Equal(category.Id, problem.GetProperty("categoryId").GetInt32());
        Assert.Equal(CurrentMonth, problem.GetProperty("month").GetString());
        Assert.Equal(100m, problem.GetProperty("limit").GetDecimal());
        Assert.Equal(90m, problem.GetProperty("currentSpent").GetDecimal());
        Assert.Equal(10.01m, problem.GetProperty("attemptedAmount").GetDecimal());
        Assert.Equal(before, await CountExpensesAsync());
    }

    [Fact]
    [Trait("Requirement", "FR-12 AC1")]
    public async Task CreateExpense_SoftBudgetExceeded_Returns201WithWarningAndStatusExceeded()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        BudgetResponse budget = await CreateBudgetAsync(category.Id, CurrentMonth, 100m, "Soft");
        await CreateExpenseAsync(category.Id, 90m);

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Dinner", 20m, Today, category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        ExpenseResponse created = await ReadAsync<ExpenseResponse>(response);
        string warning = Assert.Single(created.Warnings);
        Assert.Contains("Budget exceeded for 'Food'", warning, StringComparison.Ordinal);
        BudgetResponse status = await ReadAsync<BudgetResponse>(await Client.GetAsync($"/api/budgets/{budget.Id}"));
        Assert.Equal(BudgetStatus.Exceeded, status.Status);
    }

    [Fact]
    [Trait("Requirement", "BR-03")]
    public async Task CreateExpense_SoftBudgetMovesIntoWarning_ReturnsWarning()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateBudgetAsync(category.Id, CurrentMonth, 100m, "Soft");
        await CreateExpenseAsync(category.Id, 50m);

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Dinner", 35m, Today, category.Id, null));

        // Assert
        ExpenseResponse created = await ReadAsync<ExpenseResponse>(response);
        string warning = Assert.Single(created.Warnings);
        Assert.Contains("Budget warning", warning, StringComparison.Ordinal);
    }

    [Fact]
    [Trait("Requirement", "BR-04")]
    public async Task UpdateExpense_HardBudget_ExcludesTheExpensesOldAmount()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateBudgetAsync(category.Id, CurrentMonth, 100m, "Hard");
        ExpenseResponse expense = await CreateExpenseAsync(category.Id, 90m);

        // Act: 100 total after the update, not 190.
        HttpResponseMessage response = await Client.PutAsJsonAsync(
            $"/api/expenses/{expense.Id}", new ExpenseRequest("Groceries", 100m, Today, category.Id, null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "BR-04")]
    public async Task UpdateExpense_MovedIntoCategoryWithHardBudget_Returns422()
    {
        // Arrange
        CategoryResponse food = await CreateCategoryAsync("Food");
        CategoryResponse travel = await CreateCategoryAsync("Travel");
        await CreateBudgetAsync(travel.Id, CurrentMonth, 50m, "Hard");
        await CreateExpenseAsync(travel.Id, 40m);
        ExpenseResponse foodExpense = await CreateExpenseAsync(food.Id, 20m);

        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync(
            $"/api/expenses/{foodExpense.Id}", new ExpenseRequest("Taxi", 20m, Today, travel.Id, null), Json);

        // Assert
        Assert.Equal((HttpStatusCode)422, response.StatusCode);
        ExpenseResponse unchanged = await ReadAsync<ExpenseResponse>(await Client.GetAsync($"/api/expenses/{foodExpense.Id}"));
        Assert.Equal("Food", unchanged.CategoryName);
    }

    [Fact]
    [Trait("Requirement", "BR-04")]
    public async Task UpdateExpense_MovedToMonthWithoutBudget_Returns200()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateBudgetAsync(category.Id, CurrentMonth, 50m, "Hard");
        ExpenseResponse expense = await CreateExpenseAsync(category.Id, 40m);

        // Act: moving 80.00 into September, where there is no budget.
        HttpResponseMessage response = await Client.PutAsJsonAsync(
            $"/api/expenses/{expense.Id}", new ExpenseRequest("Groceries", 80m, new DateOnly(2026, 9, 20), category.Id, null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "BR-05")]
    public async Task CreateExpense_BudgetInOtherMonthOnly_HasNoWarnings()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateBudgetAsync(category.Id, "2026-09", 10m, "Hard");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Dinner", 500m, Today, category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        ExpenseResponse created = await ReadAsync<ExpenseResponse>(response);
        Assert.Empty(created.Warnings);
    }
}
