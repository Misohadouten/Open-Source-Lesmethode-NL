using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;
using LessenHub.Domain.Enums;
using LessenHub.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace LessenHub.Infrastructure.Persistence.Mongo;

public class LessenSerieRepository : ILessenSerieRepository
{
    private readonly IMongoCollection<LessenSerie> _series;
    private readonly IMongoCollection<Les> _lessen;

    public LessenSerieRepository(IMongoClient client, IOptions<MongoSettings> settings)
    {
        var db = client.GetDatabase(settings.Value.DatabaseName);
        _series = db.GetCollection<LessenSerie>("lessenseries");
        _lessen = db.GetCollection<Les>("lessen");
    }

    public async Task<LessenSerie> CreateAsync(LessenSerie lessenSerie, CancellationToken cancellationToken = default)
    {
        if (lessenSerie.Id == Guid.Empty)
            lessenSerie.Id = Guid.NewGuid();

        lessenSerie.Status = StatusEnum.Nieuw;
        lessenSerie.AantalLessen = lessenSerie.Lessen.Count;

        await _series.InsertOneAsync(lessenSerie, cancellationToken: cancellationToken);
        return lessenSerie;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var serie = await GetByIdAsync(id, cancellationToken);
        if (serie is null)
            return true;

        foreach (var les in serie.Lessen)
            await _lessen.DeleteOneAsync(l => l.Id == les.Id, cancellationToken);

        var result = await _series.DeleteOneAsync(s => s.Id == id, cancellationToken);
        return result.DeletedCount > 0;
    }

    public async Task<IReadOnlyList<LessenSerie>> GetByDocentIdAsync(Guid docentId, CancellationToken cancellationToken = default)
    {
        return await _series.Find(s => s.Eigenaar.Id == docentId).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LessenSerie>> GetAvailableAsync(CancellationToken cancellationToken = default)
    {
        return await _series.Find(s => s.Status == StatusEnum.Beschikbaar).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LessenSerie>> GetAllForLesLookupAsync(CancellationToken cancellationToken = default)
    {
        return await _series.Find(_ => true).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LessenSerie>> GetByStatusAsync(StatusEnum status, CancellationToken cancellationToken = default)
    {
        return await _series.Find(s => s.Status == status).ToListAsync(cancellationToken);
    }

    public async Task<LessenSerie?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _series.Find(s => s.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<LessenSerie> SubmitAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var serie = await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException($"LessenSerie met id {id} niet gevonden");

        serie.Status = StatusEnum.Concept;
        await _series.ReplaceOneAsync(s => s.Id == id, serie, cancellationToken: cancellationToken);
        return serie;
    }

    public async Task<LessenSerie?> UpdateAsync(LessenSerie lessenSerie, CancellationToken cancellationToken = default)
    {
        var existing = await GetByIdAsync(lessenSerie.Id, cancellationToken);
        if (existing is null)
            return null;

        lessenSerie.AantalLessen = lessenSerie.Lessen.Count;
        await _series.ReplaceOneAsync(s => s.Id == lessenSerie.Id, lessenSerie, cancellationToken: cancellationToken);
        return await GetByIdAsync(lessenSerie.Id, cancellationToken);
    }

    public async Task<LessenSerie?> UpsertBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default)
    {
        var serie = await GetByIdAsync(seriesId, cancellationToken);
        if (serie is null)
            return null;

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

        await _series.ReplaceOneAsync(s => s.Id == seriesId, serie, cancellationToken: cancellationToken);
        return serie;
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
        await _series.ReplaceOneAsync(s => s.Id == seriesId, serie, cancellationToken: cancellationToken);
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
        await _series.ReplaceOneAsync(s => s.Id == seriesId, serie, cancellationToken: cancellationToken);
        return serie;
    }
}
