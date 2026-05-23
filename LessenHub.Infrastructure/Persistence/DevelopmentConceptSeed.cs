using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;
using LessenHub.Domain.Enums;
using LessenHub.Infrastructure.Persistence.InMemory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LessenHub.Infrastructure.Persistence;

/// <summary>
/// Zorgt in development voor minstens één concept van een andere docent,
/// zodat "Ter controle" op Concepten getest kan worden met één account.
/// </summary>
public static class DevelopmentConceptSeed
{
    public static readonly Guid DemoDocentId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid DemoLessenSerieId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    public static async Task EnsureDemoConceptAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        var environment = services.GetRequiredService<IHostEnvironment>();
        if (!environment.IsDevelopment())
            return;

        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DevelopmentConceptSeed");

        var inMemoryStore = services.GetService<InMemoryDataStore>();
        if (inMemoryStore is not null)
        {
            SeedInMemory(inMemoryStore, logger);
            return;
        }

        var lessenSerieRepository = services.GetRequiredService<ILessenSerieRepository>();
        var docentRepository = services.GetRequiredService<IDocentRepository>();

        var existing = await lessenSerieRepository.GetByIdAsync(DemoLessenSerieId, cancellationToken);
        if (existing is not null)
        {
            if (existing.Status == StatusEnum.Concept)
                return;

            existing.Status = StatusEnum.Concept;
            existing.Beoordelingen = [];
            await lessenSerieRepository.UpdateAsync(existing, cancellationToken);
            logger.LogInformation(
                "Demo-concept {LessenSerieId} teruggezet naar Concept voor opnieuw testen",
                DemoLessenSerieId);
            return;
        }

        var docent = await docentRepository.GetByIdAsync(DemoDocentId, cancellationToken)
            ?? await docentRepository.GetByEmailAsync("jane.smith@fontys.nl", cancellationToken);

        if (docent is null)
        {
            docent = new Docent
            {
                Id = DemoDocentId,
                Naam = "Jane Smith (demo)",
                Email = "jane.smith@fontys.nl",
            };
            await docentRepository.CreateAsync(docent, cancellationToken);
        }

        var demo = BuildDemoLessenSerie(docent);
        await lessenSerieRepository.CreateAsync(demo, cancellationToken);
        demo.Status = StatusEnum.Concept;
        await lessenSerieRepository.UpdateAsync(demo, cancellationToken);

        logger.LogInformation(
            "Demo-concept lessenserie {LessenSerieId} aangemaakt voor docent {DocentEmail}",
            DemoLessenSerieId,
            docent.Email);
    }

    private static void SeedInMemory(InMemoryDataStore store, ILogger logger)
    {
        var docent = store.Docenten.FirstOrDefault(d => d.Id == DemoDocentId)
            ?? store.Docenten.First();

        var existing = store.LessenSeries.FirstOrDefault(s => s.Id == DemoLessenSerieId);
        if (existing is not null)
        {
            if (existing.Status == StatusEnum.Concept)
                return;

            store.LessenSeries.Remove(existing);
            foreach (var les in existing.Lessen)
                store.Lessen.Remove(les);
        }

        var demo = BuildDemoLessenSerie(docent);
        demo.Status = StatusEnum.Concept;
        store.LessenSeries.Add(demo);
        foreach (var les in demo.Lessen)
            store.Lessen.Add(les);

        logger.LogInformation(
            existing is not null
                ? "Demo-concept {LessenSerieId} opnieuw in wachtrij gezet (in-memory)"
                : "Demo-concept lessenserie {LessenSerieId} toegevoegd aan in-memory store",
            DemoLessenSerieId);
    }

    public static LessenSerie BuildDemoLessenSerie(Docent eigenaar)
    {
        var les1 = new Les
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444401"),
            Titel = "Les 1: Introductie Nederlands",
            Leerdoel = [LeerdoelEnum.BegrijpendLezen, LeerdoelEnum.Woordenschat],
            Introductie = "Kennismaking met het thema.",
            Inhoud = "Leestekst en opdrachten.",
            Slot = "Reflectie.",
            TijdsDuur = TimeSpan.FromMinutes(45),
        };

        var les2 = new Les
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444402"),
            Titel = "Les 2: Grammatica in context",
            Leerdoel = [LeerdoelEnum.Grammatica],
            Introductie = "Korte uitleg.",
            Inhoud = "Oefeningen.",
            Slot = "Samenvatting.",
            TijdsDuur = TimeSpan.FromMinutes(50),
        };

        return new LessenSerie
        {
            Id = DemoLessenSerieId,
            Titel = "Demo: Lessenserie ter beoordeling",
            Omschrijving =
                "Voorbeeldconcept van een collega-docent. Gebruik Goedkeuren of Afkeuren om de beoordelingsflow te testen.",
            Leerdoelen = [LeerdoelEnum.BegrijpendLezen],
            SchoolNiveau = SchoolNiveauEnum.HAVO,
            TaalNiveau = TaalNiveauEnum.B1,
            Leerjaar = LeerjaarEnum.EersteLeerjaar,
            AantalLessen = 2,
            TijdsDuur = TimeSpan.FromMinutes(95),
            Status = StatusEnum.Concept,
            Eigenaar = eigenaar,
            Lessen = [les1, les2],
        };
    }
}
