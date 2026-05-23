using LessenHub.Domain.Entities;
using LessenHub.Infrastructure.Persistence;

namespace LessenHub.Infrastructure.Persistence.InMemory;

public class InMemoryDataStore
{
    private static readonly Docent DemoDocent = new()
    {
        Id = DevelopmentConceptSeed.DemoDocentId,
        Naam = "Jane Smith",
        Email = "jane.smith@fontys.nl"
    };

    public List<Docent> Docenten { get; } =
    [
        DemoDocent,
        new Docent
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Naam = "John Doe",
            Email = "john.doe@fontys.nl"
        }
    ];

    public List<LessenSerie> LessenSeries { get; } = [DevelopmentConceptSeed.BuildDemoLessenSerie(DemoDocent)];

    public List<Les> Lessen { get; } = [.. DevelopmentConceptSeed.BuildDemoLessenSerie(DemoDocent).Lessen];
}
