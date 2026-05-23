using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;

namespace LessenHub.Infrastructure.Persistence.InMemory;

public class DocentRepository(InMemoryDataStore store) : IDocentRepository
{
    public Task<Docent> CreateAsync(Docent docent, CancellationToken cancellationToken = default)
    {
        if (docent.Id == Guid.Empty)
            docent.Id = Guid.NewGuid();

        store.Docenten.Add(docent);
        return Task.FromResult(docent);
    }

    public Task<Docent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(store.Docenten.FirstOrDefault(d => d.Id == id));
    }

    public Task<Docent?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(store.Docenten.FirstOrDefault(d => d.Email == email));
    }
}
