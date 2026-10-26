using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Infrastructure;

/// <summary>
/// Development-only demo data (FR-17). Runs at startup only in the Development environment, only when the schema is
/// fully migrated and the database has no categories. Tests run as "Testing" and never call it. It never migrates.
/// </summary>
public static class DevDataSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken ct)
    {
        using IServiceScope scope = services.CreateScope();
        AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        ILogger logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DevDataSeeder));

        List<string> pending = (await db.Database.GetPendingMigrationsAsync(ct)).ToList();
        if (pending.Count > 0)
        {
            logger.LogWarning(
                "Skipping development seed data: {Count} migration(s) not applied. Run 'dotnet ef database update --project backend/ExpenseManagement.Api'.",
                pending.Count);
            return;
        }

        if (await db.Categories.AnyAsync(ct))
        {
            return;
        }

        TimeProvider timeProvider = scope.ServiceProvider.GetRequiredService<TimeProvider>();
        DateOnly today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        DateOnly currentMonth = new DateOnly(today.Year, today.Month, 1);
        DateOnly previousMonth = currentMonth.AddMonths(-1);

        Category food = new Category { Name = "Food", Description = "Groceries, restaurants and coffee" };
        Category travel = new Category { Name = "Travel", Description = "Taxis, trains and flights" };
        Category utilities = new Category { Name = "Utilities", Description = "Electricity, water and internet" };
        Category office = new Category { Name = "Office Supplies", Description = "Paper, ink and small equipment" };
        Category entertainment = new Category { Name = "Entertainment", Description = "Cinema, concerts and events" };
        Category health = new Category { Name = "Health", Description = "Pharmacy and fitness" };
        db.Categories.AddRange(food, travel, utilities, office, entertainment, health);

        DateTime createdAt = timeProvider.GetUtcNow().UtcDateTime;
        List<Expense> expenses = new List<Expense>
        {
            Current(food, "Groceries", 120.00m, 1),
            Current(food, "Lunch with team", 45.50m, 2),
            Current(food, "Coffee beans", 18.75m, 3),
            Current(food, "Dinner out", 95.00m, 5),
            Current(food, "Supermarket", 140.00m, 6),
            Current(travel, "Taxi to airport", 38.00m, 2),
            Current(travel, "Train ticket", 62.40m, 4),
            Current(utilities, "Electricity bill", 85.20m, 3),
            Current(utilities, "Internet", 49.99m, 4),
            Current(office, "Printer paper", 24.99m, 2),
            Current(entertainment, "Cinema tickets", 28.00m, 5),
            Current(health, "Pharmacy", 16.40m, 1),
            Previous(food, "Monthly groceries", 250.00m, 3),
            Previous(food, "Restaurant", 60.00m, 12),
            Previous(travel, "Bus pass", 45.00m, 1),
            Previous(utilities, "Water bill", 30.10m, 8),
            Previous(utilities, "Electricity bill", 92.30m, 9),
            Previous(health, "Gym membership", 40.00m, 1),
            Previous(entertainment, "Concert", 75.00m, 20),
            Previous(office, "Ink cartridges", 33.50m, 15),
        };
        db.Expenses.AddRange(expenses);

        // Food is Soft and already in Warning (419.25 / 500 = 83.85 %); Travel is Hard and OnTrack.
        db.Budgets.AddRange(
            new Budget { Category = food, Year = currentMonth.Year, Month = currentMonth.Month, LimitAmount = 500m, Enforcement = BudgetEnforcement.Soft },
            new Budget { Category = travel, Year = currentMonth.Year, Month = currentMonth.Month, LimitAmount = 300m, Enforcement = BudgetEnforcement.Hard });

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Seeded development data: 6 categories, {ExpenseCount} expenses, 2 budgets.", expenses.Count);

        // Current-month days never go past today, so no seeded expense is in the future.
        Expense Current(Category category, string title, decimal amount, int day) =>
            Create(category, title, amount, currentMonth.AddDays(Math.Min(day, today.Day) - 1));

        Expense Previous(Category category, string title, decimal amount, int day) =>
            Create(category, title, amount, previousMonth.AddDays(day - 1));

        Expense Create(Category category, string title, decimal amount, DateOnly date) =>
            new Expense { Category = category, Title = title, Amount = amount, Date = date, CreatedAt = createdAt };
    }
}
