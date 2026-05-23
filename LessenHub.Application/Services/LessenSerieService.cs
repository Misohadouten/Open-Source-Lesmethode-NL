using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;
using LessenHub.Domain.Enums;

namespace LessenHub.Application.Services;

public class LessenSerieService(ILessenSerieRepository repository) : ILessenSerieService
{
    public Task<LessenSerie?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetByIdAsync(id, cancellationToken);

    public Task<IReadOnlyList<LessenSerie>> GetByDocentIdAsync(Guid docentId, CancellationToken cancellationToken = default)
        => repository.GetByDocentIdAsync(docentId, cancellationToken);

    public async Task<IReadOnlyList<LessenSerie>> GetByStatusAsync(string status, CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<StatusEnum>(status, ignoreCase: true, out var statusEnum))
            return [];

        return await repository.GetByStatusAsync(statusEnum, cancellationToken);
    }

    public Task<IReadOnlyList<LessenSerie>> GetAvailableAsync(CancellationToken cancellationToken = default)
        => repository.GetAvailableAsync(cancellationToken);

    public Task<LessenSerie> CreateAsync(LessenSerie lessenSerie, CancellationToken cancellationToken = default)
        => repository.CreateAsync(lessenSerie, cancellationToken);

    public async Task<LessenSerie?> UpdateAsync(Guid id, LessenSerie lessenSerie, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
            return null;

        lessenSerie.Id = id;
        return await repository.UpdateAsync(lessenSerie, cancellationToken);
    }

    public Task<LessenSerie> SubmitAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.SubmitAsync(id, cancellationToken);

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.DeleteAsync(id, cancellationToken);

    public Task<LessenSerie?> UpsertBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default)
    {
        if (rating is < 1 or > 5)
            throw new ArgumentOutOfRangeException(nameof(rating), "Rating moet tussen 1 en 5 liggen.");

        return repository.UpsertBeoordelingAsync(seriesId, docent, rating, commentaar, cancellationToken);
    }

    public Task<LessenSerie?> GoedkeurMetBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default)
    {
        if (rating is < 1 or > 5)
            throw new ArgumentOutOfRangeException(nameof(rating), "Rating moet tussen 1 en 5 liggen.");

        return repository.GoedkeurMetBeoordelingAsync(seriesId, docent, rating, commentaar, cancellationToken);
    }

    public Task<LessenSerie?> AfwijzenMetBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default)
    {
        if (rating is < 1 or > 5)
            throw new ArgumentOutOfRangeException(nameof(rating), "Rating moet tussen 1 en 5 liggen.");

        if (string.IsNullOrWhiteSpace(commentaar))
            throw new ArgumentException("Geef een toelichting bij afwijzen.", nameof(commentaar));

        return repository.AfwijzenMetBeoordelingAsync(seriesId, docent, rating, commentaar, cancellationToken);
    }
}
