namespace LessenHub.Domain.Entities;

public class Bijlage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string Bestandsnaam { get; set; }

    public required string ContentType { get; set; }

    public required string Pad { get; set; }

    public long Grootte { get; set; }

    public DateTime GeuploadOp { get; set; } = DateTime.UtcNow;
}
