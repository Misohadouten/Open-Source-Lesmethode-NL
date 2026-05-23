using LessenHub.Domain.Entities;

namespace LessenHub.Application.Services;

public interface IDocentService
{
    Task<Docent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Docent?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<Docent> CreateAsync(Docent docent, CancellationToken cancellationToken = default);
}
