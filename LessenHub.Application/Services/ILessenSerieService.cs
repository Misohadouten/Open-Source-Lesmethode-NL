using LessenHub.Domain.Entities;
using LessenHub.Domain.Enums;

namespace LessenHub.Application.Services;

public interface ILessenSerieService
{
    Task<LessenSerie?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LessenSerie>> GetByDocentIdAsync(Guid docentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LessenSerie>> GetByStatusAsync(string status, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LessenSerie>> GetAvailableAsync(CancellationToken cancellationToken = default);
    Task<LessenSerie> CreateAsync(LessenSerie lessenSerie, CancellationToken cancellationToken = default);
    Task<LessenSerie?> UpdateAsync(Guid id, LessenSerie lessenSerie, CancellationToken cancellationToken = default);
    Task<LessenSerie> SubmitAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LessenSerie?> UpsertBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default);

    Task<LessenSerie?> GoedkeurMetBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default);

    Task<LessenSerie?> AfwijzenMetBeoordelingAsync(
        Guid seriesId,
        Docent docent,
        int rating,
        string? commentaar,
        CancellationToken cancellationToken = default);
}
