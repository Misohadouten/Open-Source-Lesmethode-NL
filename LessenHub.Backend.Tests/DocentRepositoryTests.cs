using FluentAssertions;
using LessenHub.Backend.Models;
using LessenHub.Backend.Repositories.InMemory;
using Xunit;

namespace LessenHub.Backend.Tests;

public class DocentRepositoryTests
{
    [Fact]
    public void Create_AssignsId_WhenEmpty()
    {
        var repo = new DocentRepository();
        var docent = new Docent { Naam = "Test Docent", Email = "test@example.com" };

        var created = repo.Create(docent);

        created.Id.Should().NotBe(Guid.Empty);
        created.Naam.Should().Be("Test Docent");
    }

    [Fact]
    public void GetById_ReturnsNull_WhenNotFound()
    {
        var repo = new DocentRepository();

        var result = repo.GetById(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public void GetById_ReturnsDocent_WhenExists()
    {
        var repo = new DocentRepository();
        var docent = new Docent { Naam = "Jane", Email = "jane@example.com" };
        var created = repo.Create(docent);

        var fetched = repo.GetById(created.Id);

        fetched.Should().NotBeNull();
        fetched!.Email.Should().Be("jane@example.com");
    }
}
