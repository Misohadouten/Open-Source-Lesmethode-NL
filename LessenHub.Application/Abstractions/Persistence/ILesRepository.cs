using LessenHub.Domain.Entities;

namespace LessenHub.Application.Abstractions.Persistence;

public interface ILesRepository
{
    Task<Les?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Les>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Les>> GetByLessenSerieIdAsync(Guid lessenSerieId, CancellationToken cancellationToken = default);
    Task<Les> CreateAsync(Les les, CancellationToken cancellationToken = default);
    Task<Les?> UpdateAsync(Les les, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
