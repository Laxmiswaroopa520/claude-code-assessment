using ExpenseManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseManagement.Api.Data.Configurations;

public sealed class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("Budgets");
        builder.HasKey(budget => budget.Id);

        builder.Property(budget => budget.LimitAmount).HasPrecision(18, 2);
        builder.Property(budget => budget.Enforcement).HasConversion<string>().HasMaxLength(10);

        builder.HasOne(budget => budget.Category)
            .WithMany(category => category.Budgets)
            .HasForeignKey(budget => budget.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // VR-08: one budget per category per month.
        builder.HasIndex(budget => new { budget.CategoryId, budget.Year, budget.Month }).IsUnique();
    }
}
