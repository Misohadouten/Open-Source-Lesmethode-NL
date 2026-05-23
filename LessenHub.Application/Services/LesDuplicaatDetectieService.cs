using LessenHub.Application.Abstractions;
using LessenHub.Application.Abstractions.External;
using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Application.Dtos;
using LessenHub.Application.Helpers;
using LessenHub.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace LessenHub.Application.Services;

public class LesDuplicaatDetectieService(
    ILesRepository lesRepository,
    ILessenSerieRepository lessenSerieRepository,
    ILesEmbeddingService embeddingService,
    IPrivacyRedactionService privacyRedaction,
    ILogger<LesDuplicaatDetectieService> logger)
{
    private const double MinEmbeddingSimilarity = 0.82;
    private const double MinLexicaleOverlap = 0.55;
    private const int MaxResultaten = 10;

    public async Task<LesDuplicaatControleResponse> ControleerAsync(
        LesDuplicaatControleRequest request,
        CancellationToken cancellationToken = default)
    {
        var nieuweTekst = LesDuplicaatTekstHelper.BouwVolledigeTekst(
            request.Titel,
            request.Introductie,
            request.Inhoud,
            request.Slot);

        if (nieuweTekst.Length < 40)
            return new LesDuplicaatControleResponse { HeeftDuplicaten = false, Matches = [] };

        var alleLessen = await VerzamelAlleLessenAsync(request.ExcludeLesId, cancellationToken);
        if (alleLessen.Count == 0)
            return new LesDuplicaatControleResponse { HeeftDuplicaten = false, Matches = [] };

        var serieLookup = await BouwSerieLookupAsync(cancellationToken);
        var geredigeerdeTekst = privacyRedaction.RedactForAi(nieuweTekst);

        try
        {
            return await ControleerViaEmbeddingsAsync(geredigeerdeTekst, alleLessen, serieLookup, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Embedding-controle mislukt, fallback naar lexicale vergelijking");
            return ControleerLexicaal(geredigeerdeTekst, alleLessen, serieLookup);
        }
    }

    private async Task<LesDuplicaatControleResponse> ControleerViaEmbeddingsAsync(
        string geredigeerdeTekst,
        List<Les> alleLessen,
        Dictionary<Guid, (Guid? SeriesId, string? SeriesTitel)> serieLookup,
        CancellationToken cancellationToken)
    {
        var nieuweEmbedding = await embeddingService.MaakEmbeddingAsync(
            LesDuplicaatTekstHelper.Inkorten(geredigeerdeTekst, 8000),
            cancellationToken);

        if (nieuweEmbedding.Length == 0)
            throw new InvalidOperationException("Embedding leverde geen vector op.");

        var scores = new List<(Les Les, double Score)>();

        foreach (var les in alleLessen)
        {
            var kandidaatTekst = privacyRedaction.RedactForAi(LesDuplicaatTekstHelper.BouwVolledigeTekst(les));
            if (string.IsNullOrWhiteSpace(kandidaatTekst))
                continue;

            float[] kandidaatEmbedding;
            try
            {
                kandidaatEmbedding = await embeddingService.MaakEmbeddingAsync(
                    LesDuplicaatTekstHelper.Inkorten(kandidaatTekst, 8000),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Embedding voor les {LesId} overgeslagen", les.Id);
                continue;
            }

            if (kandidaatEmbedding.Length != nieuweEmbedding.Length)
                continue;

            var similarity = EmbeddingSimilarityHelper.CosineSimilarity(nieuweEmbedding, kandidaatEmbedding);
            if (similarity >= MinEmbeddingSimilarity)
                scores.Add((les, similarity));
        }

        return BouwResponse(scores, serieLookup, embedding: true);
    }

    private static LesDuplicaatControleResponse ControleerLexicaal(
        string geredigeerdeTekst,
        List<Les> alleLessen,
        Dictionary<Guid, (Guid? SeriesId, string? SeriesTitel)> serieLookup)
    {
        var nieuweTokens = LesDuplicaatTekstHelper.Tokenize(geredigeerdeTekst);
        var scores = new List<(Les Les, double Score)>();

        foreach (var les in alleLessen)
        {
            var kandidaatTekst = LesDuplicaatTekstHelper.BouwVolledigeTekst(les);
            if (string.IsNullOrWhiteSpace(kandidaatTekst))
                continue;

            var overlap = LesDuplicaatTekstHelper.BerekenLexicaleOverlap(
                nieuweTokens,
                LesDuplicaatTekstHelper.Tokenize(kandidaatTekst));

            if (overlap >= MinLexicaleOverlap)
                scores.Add((les, overlap));
        }

        return BouwResponse(scores, serieLookup, embedding: false);
    }

    private static LesDuplicaatControleResponse BouwResponse(
        List<(Les Les, double Score)> scores,
        Dictionary<Guid, (Guid? SeriesId, string? SeriesTitel)> serieLookup,
        bool embedding)
    {
        var matches = scores
            .OrderByDescending(s => s.Score)
            .Take(MaxResultaten)
            .Select(s =>
            {
                serieLookup.TryGetValue(s.Les.Id, out var serieInfo);
                var methode = embedding ? "Embedding-vergelijking" : "Tekstvergelijking (fallback)";
                return new LesDuplicaatMatchDto
                {
                    LesId = s.Les.Id,
                    Titel = s.Les.Titel,
                    SimilarityScore = Math.Round(s.Score, 2),
                    Reden = $"{methode}: {Math.Round(s.Score * 100)}% inhoudelijke overeenkomst.",
                    LessenSerieId = serieInfo.SeriesId,
                    LessenSerieTitel = serieInfo.SeriesTitel,
                    Introductie = s.Les.Introductie ?? string.Empty,
                    Inhoud = s.Les.Inhoud ?? string.Empty,
                    Slot = s.Les.Slot ?? string.Empty,
                };
            })
            .ToList();

        return new LesDuplicaatControleResponse
        {
            HeeftDuplicaten = matches.Count > 0,
            Matches = matches
        };
    }

    private async Task<List<Les>> VerzamelAlleLessenAsync(Guid? excludeLesId, CancellationToken cancellationToken)
    {
        var map = new Dictionary<Guid, Les>();

        foreach (var les in await lesRepository.GetAllAsync(cancellationToken))
            map[les.Id] = les;

        foreach (var serie in await lessenSerieRepository.GetAllForLesLookupAsync(cancellationToken))
        {
            foreach (var les in serie.Lessen)
            {
                if (!map.ContainsKey(les.Id))
                    map[les.Id] = les;
            }
        }

        if (excludeLesId.HasValue)
            map.Remove(excludeLesId.Value);

        return map.Values.ToList();
    }

    private async Task<Dictionary<Guid, (Guid? SeriesId, string? SeriesTitel)>> BouwSerieLookupAsync(
        CancellationToken cancellationToken)
    {
        var lookup = new Dictionary<Guid, (Guid? SeriesId, string? SeriesTitel)>();

        foreach (var serie in await lessenSerieRepository.GetAllForLesLookupAsync(cancellationToken))
        {
            foreach (var les in serie.Lessen)
                lookup[les.Id] = (serie.Id, serie.Titel);
        }

        return lookup;
    }
}
