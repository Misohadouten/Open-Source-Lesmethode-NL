using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;

namespace LessenHub.Application.Services;

public class LesService(ILesRepository repository) : ILesService
{
    public Task<Les?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetByIdAsync(id, cancellationToken);

    public Task<Les> CreateAsync(Les les, CancellationToken cancellationToken = default)
        => repository.CreateAsync(les, cancellationToken);

    public async Task<Les?> UpdateAsync(Guid id, Les les, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
            return null;

        les.Id = id;
        return await repository.UpdateAsync(les, cancellationToken);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.DeleteAsync(id, cancellationToken);
}
