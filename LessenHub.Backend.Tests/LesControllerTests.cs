using FluentAssertions;
using LessenHub.Backend.Models;
using LessenHub.Backend.Models.Enums;
using LessenHub.Backend.Repositories.InMemory;
using LessenHub.Server.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace LessenHub.Backend.Tests;

public class LesControllerTests
{
    [Fact]
    public void Get_ReturnsNotFound_WhenLesDoesNotExist()
    {
        var repo = new LesRepository();
        var controller = new LesController(repo, NullLogger<LesController>.Instance);

        var result = controller.Get(Guid.NewGuid());

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public void Create_Returns201AndPersists()
    {
        var repo = new LesRepository();
        var controller = new LesController(repo, NullLogger<LesController>.Instance);

        var les = new Les
        {
            Titel = "Intro les",
            Leerdoel = new List<LeerdoelEnum> { LeerdoelEnum.BegrijpendLezen },
            Inhoud = "Inhoud tekst"
        };

        var actionResult = controller.Create(les);

        var objectResult = actionResult.Result as ObjectResult;
        objectResult.Should().NotBeNull();
        objectResult!.StatusCode.Should().Be(201);

        var created = objectResult.Value as Les;
        created.Should().NotBeNull();
        created!.Id.Should().NotBe(Guid.Empty);

        // Ensure repository now returns the same entity
        repo.GetById(created.Id).Should().NotBeNull();
    }
}
