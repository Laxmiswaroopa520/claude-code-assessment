using System.Net;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Tests.TestSupport;

namespace ExpenseManagement.Api.Tests.Integration;

public sealed class ExpenseQueryApiTests : ApiTestBase
{
    private async Task<(CategoryResponse Food, CategoryResponse Travel)> SeedAsync()
    {
        CategoryResponse food = await CreateCategoryAsync("Food");
        CategoryResponse travel = await CreateCategoryAsync("Travel");
        await CreateExpenseAsync(food.Id, 12.00m, Today.AddDays(-10), "Groceries", "weekly shop");
        await CreateExpenseAsync(food.Id, 45.50m, Today.AddDays(-5), "Dinner", "with TAXI home");
        await CreateExpenseAsync(travel.Id, 30.00m, Today.AddDays(-2), "Taxi to airport");
        await CreateExpenseAsync(travel.Id, 150.00m, Today, "Train");
        return (food, travel);
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC1")]
    public async Task ListExpenses_NoParameters_ReturnsFirstPageSortedByDateDescending()
    {
        // Arrange
        await SeedAsync();

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        Assert.Equal(1, page.Page);
        Assert.Equal(20, page.PageSize);
        Assert.Equal(4, page.TotalCount);
        Assert.Equal(1, page.TotalPages);
        Assert.Equal(new[] { "Train", "Taxi to airport", "Dinner", "Groceries" }, page.Items.Select(item => item.Title));
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC2")]
    public async Task ListExpenses_Search_MatchesTitleOrNotesCaseInsensitively()
    {
        // Arrange
        await SeedAsync();

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses?q=taxi");

        // Assert
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        Assert.Equal(new[] { "Taxi to airport", "Dinner" }, page.Items.Select(item => item.Title));
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC2")]
    public async Task ListExpenses_SearchWithLikeWildcard_IsTreatedLiterally()
    {
        // Arrange
        await SeedAsync();

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses?q=%25");

        // Assert
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC2")]
    public async Task ListExpenses_CombinedFilters_AreAppliedWithAnd()
    {
        // Arrange
        (CategoryResponse food, CategoryResponse _) = await SeedAsync();
        string from = Today.AddDays(-7).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        string to = Today.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

        // Act
        HttpResponseMessage response = await Client.GetAsync($"/api/expenses?categoryId={food.Id}&from={from}&to={to}&minAmount=40&maxAmount=50");

        // Assert
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        ExpenseResponse only = Assert.Single(page.Items);
        Assert.Equal("Dinner", only.Title);
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC3")]
    public async Task ListExpenses_SortByAmountAscending_OrdersByDecimalValue()
    {
        // Arrange
        await SeedAsync();

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses?sortBy=amount&sortDir=asc");

        // Assert
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        Assert.Equal(new[] { 12.00m, 30.00m, 45.50m, 150.00m }, page.Items.Select(item => item.Amount));
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC3")]
    public async Task ListExpenses_SortByTitleDescending_OrdersCaseInsensitively()
    {
        // Arrange
        await SeedAsync();

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses?sortBy=title&sortDir=desc");

        // Assert
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        Assert.Equal(new[] { "Train", "Taxi to airport", "Groceries", "Dinner" }, page.Items.Select(item => item.Title));
    }

    [Theory]
    [Trait("Requirement", "FR-09 AC4")]
    [InlineData("pageSize=101", "pageSize")]
    [InlineData("pageSize=0", "pageSize")]
    [InlineData("page=0", "page")]
    [InlineData("from=2026-10-10&to=2026-10-01", "from")]
    [InlineData("minAmount=50&maxAmount=10", "minAmount")]
    [InlineData("sortBy=foo", "sortBy")]
    [InlineData("sortDir=up", "sortDir")]
    public async Task ListExpenses_InvalidQuery_Returns400(string query, string field)
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync($"/api/expenses?{query}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), field);
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC5")]
    public async Task ListExpenses_PageBeyondLast_ReturnsEmptyItemsWithTotalCount()
    {
        // Arrange
        await SeedAsync();

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses?page=3&pageSize=2");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        Assert.Empty(page.Items);
        Assert.Equal(4, page.TotalCount);
        Assert.Equal(2, page.TotalPages);
    }

    [Fact]
    [Trait("Requirement", "FR-09 AC1")]
    public async Task ListExpenses_SecondPage_ReturnsRemainingItems()
    {
        // Arrange
        await SeedAsync();

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses?page=2&pageSize=3");

        // Assert
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        ExpenseResponse only = Assert.Single(page.Items);
        Assert.Equal("Groceries", only.Title);
    }
}
