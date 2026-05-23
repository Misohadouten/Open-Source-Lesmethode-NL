namespace LessenHub.Domain.Entities;

public class Beoordeling
{
    public int Rating { get; set; }
    public string? Commentaar { get; set; }
    public required Docent Eigenaar { get; set; }
}
