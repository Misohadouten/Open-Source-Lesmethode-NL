using System.ComponentModel.DataAnnotations;
using LessenHub.Domain.Enums;

namespace LessenHub.Domain.Entities;

public class Les
{
    public Guid Id { get; set; }

    [Required]
    [StringLength(200)]
    public required string Titel { get; set; }

    [MinLength(1, ErrorMessage = "Minstens één leerdoel vereist.")]
    public List<LeerdoelEnum> Leerdoel { get; set; } = [];

    [StringLength(2000)]
    public string? Introductie { get; set; }

    [StringLength(8000)]
    public string? Inhoud { get; set; }

    [StringLength(2000)]
    public string? Slot { get; set; }

    public TimeSpan? TijdsDuur { get; set; }

    public List<string> Literatuurlijst { get; set; } = [];

    public List<Bijlage> Bijlagen { get; set; } = [];
}
