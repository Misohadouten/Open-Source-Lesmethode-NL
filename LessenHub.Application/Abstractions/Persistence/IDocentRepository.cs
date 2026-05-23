using LessenHub.Domain.Entities;

namespace LessenHub.Application.Abstractions.Persistence;

public interface IDocentRepository
{
    Task<Docent> CreateAsync(Docent docent, CancellationToken cancellationToken = default);
    Task<Docent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Docent?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
}
