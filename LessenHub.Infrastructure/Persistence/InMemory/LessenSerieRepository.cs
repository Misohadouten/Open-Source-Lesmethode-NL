using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;
using LessenHub.Domain.Enums;

namespace LessenHub.Infrastructure.Persistence.InMemory;

public class LessenSerieRepository(InMemoryDataStore store) : ILessenSerieRepository
{
    public Task<LessenSerie> CreateAsync(LessenSerie lessenSerie, CancellationToken cancellationToken = default)
    {
        if (lessenSerie.Id == Guid.Empty)
            lessenSerie.Id = Guid.NewGuid();

        lessenSerie.Status = StatusEnum.Nieuw;
        lessenSerie.AantalLessen = lessenSerie.Lessen.Count;
        store.LessenSeries.Add(lessenSerie);
        return Task.FromResult(lessenSerie);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var existing = store.LessenSeries.FirstOrDefault(s => s.Id == id);
        if (existing is null)
            return Task.FromResult(false);

        store.LessenSeries.Remove(existing);
        return Task.FromResult(true);
    }

    public Task<IReadOnlyList<LessenSerie>> GetByDocentIdAsync(Guid docentId, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<LessenSerie>>(
            store.LessenSeries.Where(s => s.Eigenaar.Id == docentId).ToList());
    }

    public Task<IReadOnlyList<LessenSerie>> GetAvailableAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<LessenSerie>>(
            store.LessenSeries.Where(s => s.Status == StatusEnum.Beschikbaar).ToList());
    }

    public Task<IReadOnlyList<LessenSerie>> GetAllForLesLookupAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<LessenSerie>>(store.LessenSeries.ToList());
    }

    public Task<IReadOnlyList<LessenSerie>> GetByStatusAsync(StatusEnum status, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<LessenSerie>>(
            store.LessenSeries.Where(s => s.Status == status).ToList());
    }

    public Task<LessenSerie?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(store.LessenSeries.FirstOrDefault(s => s.Id == id));
    }

    public Task<LessenSerie> SubmitAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var serie = store.LessenSeries.FirstOrDefault(s => s.Id == id)
            ?? throw new InvalidOperationException($"LessenSerie met id {id} niet gevonden");

        serie.Status = StatusEnum.Concept;
        return Task.FromResult(serie);
    }

    public Task<LessenSerie?> UpdateAsync(LessenSerie lessenSerie, CancellationToken cancellationToken = default)
    {
        var existing = store.LessenSeries.FirstOrDefault(s => s.Id == lessenSerie.Id);
        if (existing is null)
            return Task.FromResult<LessenSerie?>(null);

        existing.Titel = lessenSerie.Titel;
        existing.Omschrijving = lessenSerie.Omschrijving;
        existing.Leerdoelen = lessenSerie.Leerdoelen;
        existing.SchoolNiveau = lessenSerie.SchoolNiveau;
        existing.TaalNiveau = lessenSerie.TaalNiveau;
        existing.Leerjaar = lessenSerie.Leerjaar;
        existing.Vaardigheden = lessenSerie.Vaardigheden;
        existing.TijdsDuur = lessenSerie.TijdsDuur;
        existing.Status = lessenSerie.Status;
        existing.Literatuurlijst = lessenSerie.Literatuurlijst;
        existing.Eigenaar = lessenSerie.Eigenaar;
        existing.Lessen = lessenSerie.Lessen;
        existing.Bijlagen = lessenSerie.Bijlagen;
        existing.Beoordelingen = lessenSerie.Beoordelingen;
        existing.AantalLessen = existing.Lessen.Count;

        return Task.FromResult<LessenSerie?>(existing);
    }

    public Task<LessenSerie?> UpsertBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default)
    {
        var serie = store.LessenSeries.FirstOrDefault(s => s.Id == seriesId);
        if (serie is null)
            return Task.FromResult<LessenSerie?>(null);

        if (serie.Status != StatusEnum.Concept)
            throw new InvalidOperationException("Alleen concept-lessenseries kunnen beoordeeld worden vóór goedkeuring.");

        serie.Beoordelingen ??= [];
        var existing = serie.Beoordelingen.FirstOrDefault(b => b.Eigenaar?.Id == docent.Id);
        if (existing is not null)
        {
            existing.Rating = rating;
            existing.Commentaar = commentaar;
        }
        else
        {
            serie.Beoordelingen.Add(new Beoordeling
            {
                Rating = rating,
                Commentaar = commentaar,
                Eigenaar = docent
            });
        }

        return Task.FromResult<LessenSerie?>(serie);
    }

    public async Task<LessenSerie?> GoedkeurMetBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default)
    {
        var serie = await UpsertBeoordelingAsync(seriesId, docent, rating, commentaar, cancellationToken);
        if (serie is null)
            return null;

        serie.Status = StatusEnum.Beschikbaar;
        return serie;
    }

    public async Task<LessenSerie?> AfwijzenMetBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default)
    {
        var serie = await UpsertBeoordelingAsync(seriesId, docent, rating, commentaar, cancellationToken);
        if (serie is null)
            return null;

        serie.Status = StatusEnum.Afgewezen;
        return serie;
    }
}
