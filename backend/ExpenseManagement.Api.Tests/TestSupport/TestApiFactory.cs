using ExpenseManagement.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace ExpenseManagement.Api.Tests.TestSupport;

/// <summary>
/// Hosts the real API in the "Testing" environment on a private in-memory SQLite connection that stays open for the
/// factory's lifetime. Migrations are applied to it; the development database file is never opened.
/// </summary>
public sealed class TestApiFactory : WebApplicationFactory<Program>
{
    /// <summary>"Now" for every test: 2026-10-15 12:00 UTC, so "today" is 2026-10-15.</summary>
    public static readonly DateTimeOffset FixedUtcNow = new DateTimeOffset(2026, 10, 15, 12, 0, 0, TimeSpan.Zero);

    private readonly SqliteConnection _connection = new SqliteConnection("DataSource=:memory:");

    public TestApiFactory()
    {
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(new FixedTimeProvider(FixedUtcNow));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        IHost host = base.CreateHost(builder);

        using IServiceScope scope = host.Services.CreateScope();
        AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        string? connectionString = db.Database.GetConnectionString();
        if (connectionString is null || !connectionString.Contains(":memory:", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Tests must use in-memory SQLite, but the connection is '{connectionString}'.");
        }

        db.Database.Migrate();
        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }
}
