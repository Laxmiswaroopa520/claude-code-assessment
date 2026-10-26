using ExpenseManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseManagement.Api.Data.Configurations;

public sealed class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.ToTable("Expenses");
        builder.HasKey(expense => expense.Id);

        builder.Property(expense => expense.Title).IsRequired().HasMaxLength(100);
        builder.Property(expense => expense.Amount).HasPrecision(18, 2);
        builder.Property(expense => expense.Date).IsRequired();
        builder.Property(expense => expense.Notes).HasMaxLength(500);
        builder.Property(expense => expense.CreatedAt).IsRequired();

        builder.HasOne(expense => expense.Category)
            .WithMany(category => category.Expenses)
            .HasForeignKey(expense => expense.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(expense => expense.Date);
        builder.HasIndex(expense => expense.CategoryId);
    }
}
