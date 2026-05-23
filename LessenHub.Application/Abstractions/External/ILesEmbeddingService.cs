namespace LessenHub.Application.Abstractions.External;

public interface ILesEmbeddingService
{
    Task<float[]> MaakEmbeddingAsync(string tekst, CancellationToken cancellationToken = default);
}
