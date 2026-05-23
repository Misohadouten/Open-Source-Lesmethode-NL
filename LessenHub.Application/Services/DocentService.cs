using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;

namespace LessenHub.Application.Services;

public class DocentService(IDocentRepository repository) : IDocentService
{
    public Task<Docent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetByIdAsync(id, cancellationToken);

    public Task<Docent?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
        => repository.GetByEmailAsync(email, cancellationToken);

    public Task<Docent> CreateAsync(Docent docent, CancellationToken cancellationToken = default)
        => repository.CreateAsync(docent, cancellationToken);
}
