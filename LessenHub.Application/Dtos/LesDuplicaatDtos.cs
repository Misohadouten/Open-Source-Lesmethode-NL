namespace LessenHub.Application.Dtos;

public class LesDuplicaatControleRequest
{
    public required string Titel { get; set; }
    public string? Introductie { get; set; }
    public string? Inhoud { get; set; }
    public string? Slot { get; set; }
    public Guid? ExcludeLesId { get; set; }
}

public class LesDuplicaatMatchDto
{
    public Guid LesId { get; set; }
    public string Titel { get; set; } = string.Empty;
    public double SimilarityScore { get; set; }
    public string Reden { get; set; } = string.Empty;
    public Guid? LessenSerieId { get; set; }
    public string? LessenSerieTitel { get; set; }
    public string Introductie { get; set; } = string.Empty;
    public string Inhoud { get; set; } = string.Empty;
    public string Slot { get; set; } = string.Empty;
}

public class LesDuplicaatControleResponse
{
    public bool HeeftDuplicaten { get; set; }
    public List<LesDuplicaatMatchDto> Matches { get; set; } = [];
}
