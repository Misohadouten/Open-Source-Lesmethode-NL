using LessenHub.Domain.Entities;

namespace LessenHub.Application.Services;

public interface ILesService
{
    Task<Les?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Les> CreateAsync(Les les, CancellationToken cancellationToken = default);
    Task<Les?> UpdateAsync(Guid id, Les les, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
