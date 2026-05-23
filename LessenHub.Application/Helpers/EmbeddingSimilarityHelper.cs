namespace LessenHub.Application.Helpers;

public static class EmbeddingSimilarityHelper
{
    public static double CosineSimilarity(IReadOnlyList<float> links, IReadOnlyList<float> rechts)
    {
        if (links.Count == 0 || rechts.Count == 0 || links.Count != rechts.Count)
            return 0;

        double dot = 0, normA = 0, normB = 0;
        for (var i = 0; i < links.Count; i++)
        {
            dot += links[i] * rechts[i];
            normA += links[i] * links[i];
            normB += rechts[i] * rechts[i];
        }

        if (normA == 0 || normB == 0)
            return 0;

        return dot / (Math.Sqrt(normA) * Math.Sqrt(normB));
    }
}
