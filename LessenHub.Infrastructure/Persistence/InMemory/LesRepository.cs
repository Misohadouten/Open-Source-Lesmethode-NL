using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;

namespace LessenHub.Infrastructure.Persistence.InMemory;

public class LesRepository(InMemoryDataStore store, ILessenSerieRepository lessenSerieRepository) : ILesRepository
{
    public Task<Les> CreateAsync(Les les, CancellationToken cancellationToken = default)
    {
        if (les.Id == Guid.Empty)
            les.Id = Guid.NewGuid();

        store.Lessen.Add(les);
        return Task.FromResult(les);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var existing = store.Lessen.FirstOrDefault(l => l.Id == id);
        if (existing is null)
            return Task.FromResult(false);

        store.Lessen.Remove(existing);
        return Task.FromResult(true);
    }

    public Task<Les?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var fromStore = store.Lessen.FirstOrDefault(l => l.Id == id);
        if (fromStore is not null)
            return Task.FromResult<Les?>(fromStore);

        return Task.FromResult<Les?>(null);
    }

    public Task<IReadOnlyList<Les>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var standalone = store.Lessen.ToList();
        var fromSeries = store.LessenSeries.SelectMany(s => s.Lessen).ToList();
        var map = new Dictionary<Guid, Les>();
        foreach (var les in standalone.Concat(fromSeries))
        {
            if (!map.ContainsKey(les.Id))
                map[les.Id] = les;
        }

        return Task.FromResult<IReadOnlyList<Les>>(map.Values.ToList());
    }

    public async Task<IReadOnlyList<Les>> GetByLessenSerieIdAsync(Guid lessenSerieId, CancellationToken cancellationToken = default)
    {
        var serie = await lessenSerieRepository.GetByIdAsync(lessenSerieId, cancellationToken);
        return serie?.Lessen ?? [];
    }

    public Task<Les?> UpdateAsync(Les les, CancellationToken cancellationToken = default)
    {
        var existing = store.Lessen.FirstOrDefault(l => l.Id == les.Id);
        if (existing is not null)
        {
            existing.Titel = les.Titel;
            existing.Leerdoel = les.Leerdoel;
            existing.Introductie = les.Introductie;
            existing.Inhoud = les.Inhoud;
            existing.Slot = les.Slot;
            existing.TijdsDuur = les.TijdsDuur;
            existing.Literatuurlijst = les.Literatuurlijst;
            existing.Bijlagen = les.Bijlagen;
            return Task.FromResult<Les?>(existing);
        }

        foreach (var serie in store.LessenSeries)
        {
            var index = serie.Lessen.FindIndex(l => l.Id == les.Id);
            if (index >= 0)
            {
                serie.Lessen[index] = les;
                return Task.FromResult<Les?>(les);
            }
        }

        return Task.FromResult<Les?>(null);
    }
}
