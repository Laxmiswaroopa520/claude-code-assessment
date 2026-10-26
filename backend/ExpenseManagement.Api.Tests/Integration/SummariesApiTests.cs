using System.Net;
using System.Text.Json;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Tests.TestSupport;

namespace ExpenseManagement.Api.Tests.Integration;

public sealed class SummariesApiTests : ApiTestBase
{
    [Fact]
    [Trait("Requirement", "FR-13 AC1")]
    public async Task MonthlyTotals_Year_ReturnsMonthsWithExpensesAscending()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateExpenseAsync(category.Id, 10.10m, new DateOnly(2026, 10, 1));
        await CreateExpenseAsync(category.Id, 20.20m, new DateOnly(2026, 10, 2));
        await CreateExpenseAsync(category.Id, 5.00m, new DateOnly(2026, 1, 31));
        await CreateExpenseAsync(category.Id, 99.00m, new DateOnly(2025, 12, 31));

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/summaries/monthly?year=2026");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<MonthlyTotalResponse> months = await ReadAsync<List<MonthlyTotalResponse>>(response);
        Assert.Equal(2, months.Count);
        Assert.Equal(new MonthlyTotalResponse("2026-01", 5.00m, 1), months[0]);
        Assert.Equal(new MonthlyTotalResponse("2026-10", 30.30m, 2), months[1]);
    }

    [Fact]
    [Trait("Requirement", "FR-13 AC1")]
    public async Task MonthlyTotals_YearWithoutExpenses_ReturnsEmptyList()
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/summaries/monthly?year=2030");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<MonthlyTotalResponse> months = await ReadAsync<List<MonthlyTotalResponse>>(response);
        Assert.Empty(months);
    }

    [Theory]
    [Trait("Requirement", "FR-13 AC1")]
    [InlineData("")]
    [InlineData("?year=1999")]
    public async Task MonthlyTotals_MissingOrInvalidYear_Returns400(string query)
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync($"/api/summaries/monthly{query}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "year");
    }

    [Fact]
    [Trait("Requirement", "FR-14 AC1")]
    public async Task CategorySummary_Month_ReturnsRowPerCategoryWithBudgetStatus()
    {
        // Arrange
        CategoryResponse food = await CreateCategoryAsync("Food");
        CategoryResponse travel = await CreateCategoryAsync("Travel");
        CategoryResponse health = await CreateCategoryAsync("Health");
        await CreateBudgetAsync(food.Id, CurrentMonth, 100m, "Soft");
        await CreateExpenseAsync(food.Id, 60m);
        await CreateExpenseAsync(food.Id, 30m);
        await CreateExpenseAsync(travel.Id, 30m);
        await CreateExpenseAsync(health.Id, 70m, new DateOnly(2026, 9, 1));

        // Act
        HttpResponseMessage response = await Client.GetAsync($"/api/summaries/categories?month={CurrentMonth}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<CategorySummaryRow> rows = await ReadAsync<List<CategorySummaryRow>>(response);
        Assert.Equal(3, rows.Count);
        CategorySummaryRow foodRow = rows.Single(row => row.CategoryId == food.Id);
        Assert.Equal(90m, foodRow.Total);
        Assert.Equal(2, foodRow.Count);
        Assert.Equal(75.00m, foodRow.PercentOfTotal);
        Assert.Equal(100m, foodRow.BudgetLimit);
        Assert.Equal(90.00m, foodRow.PercentUsed);
        Assert.Equal(BudgetStatus.Warning, foodRow.Status);
        CategorySummaryRow healthRow = rows.Single(row => row.CategoryId == health.Id);
        Assert.Equal(0m, healthRow.Total);
        Assert.Null(healthRow.Status);
        Assert.Equal(120m, rows.Sum(row => row.Total));
    }

    [Fact]
    [Trait("Requirement", "FR-14 AC1")]
    public async Task CategorySummary_EmptyMonth_ReturnsZeroTotalsNot404()
    {
        // Arrange
        await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/summaries/categories?month=2026-03");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<CategorySummaryRow> rows = await ReadAsync<List<CategorySummaryRow>>(response);
        CategorySummaryRow only = Assert.Single(rows);
        Assert.Equal(0m, only.Total);
        Assert.Equal(0, only.Count);
    }

    [Theory]
    [Trait("Requirement", "FR-14 AC2")]
    [InlineData("?month=2026-13")]
    [InlineData("?month=October")]
    [InlineData("")]
    public async Task CategorySummary_InvalidMonth_Returns400(string query)
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync($"/api/summaries/categories{query}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await ReadProblemAsync(response);
        AssertHasError(problem, "month");
    }
}
