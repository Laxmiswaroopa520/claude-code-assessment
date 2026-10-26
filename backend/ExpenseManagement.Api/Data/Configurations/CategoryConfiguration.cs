using ExpenseManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExpenseManagement.Api.Data.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");
        builder.HasKey(category => category.Id);

        // NOCASE makes the unique index (VR-05) case-insensitive at database level.
        builder.Property(category => category.Name).IsRequired().HasMaxLength(50).UseCollation("NOCASE");
        builder.Property(category => category.Description).HasMaxLength(250);
        builder.HasIndex(category => category.Name).IsUnique();
    }
}
