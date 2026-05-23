using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;
using LessenHub.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace LessenHub.Infrastructure.Persistence.Mongo;

public class LesRepository : ILesRepository
{
    private readonly IMongoCollection<Les> _lessen;
    private readonly IMongoCollection<LessenSerie> _series;

    public LesRepository(IMongoClient client, IOptions<MongoSettings> settings)
    {
        var db = client.GetDatabase(settings.Value.DatabaseName);
        _lessen = db.GetCollection<Les>("lessen");
        _series = db.GetCollection<LessenSerie>("lessenseries");
    }

    public async Task<Les> CreateAsync(Les les, CancellationToken cancellationToken = default)
    {
        if (les.Id == Guid.Empty)
            les.Id = Guid.NewGuid();

        await _lessen.InsertOneAsync(les, cancellationToken: cancellationToken);
        return les;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _lessen.DeleteOneAsync(l => l.Id == id, cancellationToken);
        return result.DeletedCount > 0;
    }

    public async Task<Les?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _lessen.Find(l => l.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Les>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _lessen.Find(_ => true).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Les>> GetByLessenSerieIdAsync(Guid lessenSerieId, CancellationToken cancellationToken = default)
    {
        var serie = await _series.Find(l => l.Id == lessenSerieId).FirstOrDefaultAsync(cancellationToken);
        return serie?.Lessen ?? [];
    }

    public async Task<Les?> UpdateAsync(Les les, CancellationToken cancellationToken = default)
    {
        var existing = await GetByIdAsync(les.Id, cancellationToken);
        if (existing is null)
            return null;

        var replaceResult = await _lessen.ReplaceOneAsync(l => l.Id == les.Id, les, cancellationToken: cancellationToken);
        if (replaceResult.MatchedCount == 0)
            return null;

        var filter = Builders<LessenSerie>.Filter.ElemMatch(ls => ls.Lessen, l => l.Id == les.Id);
        var serie = await _series.Find(filter).FirstOrDefaultAsync(cancellationToken);
        if (serie is not null)
        {
            var index = serie.Lessen.FindIndex(l => l.Id == les.Id);
            if (index >= 0)
            {
                serie.Lessen[index] = les;
                await _series.ReplaceOneAsync(s => s.Id == serie.Id, serie, cancellationToken: cancellationToken);
            }
        }

        return await GetByIdAsync(les.Id, cancellationToken);
    }
}
