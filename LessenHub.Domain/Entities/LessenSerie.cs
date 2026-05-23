using System.ComponentModel.DataAnnotations;
using LessenHub.Domain.Enums;

namespace LessenHub.Domain.Entities;

public class LessenSerie
{
    public Guid Id { get; set; }

    [Required]
    [StringLength(200)]
    public required string Titel { get; set; }

    [MaxLength(20000)]
    public string? Omschrijving { get; set; }

    public List<LeerdoelEnum> Leerdoelen { get; set; } = [];

    [Required]
    public SchoolNiveauEnum SchoolNiveau { get; set; }

    [Required]
    public TaalNiveauEnum TaalNiveau { get; set; }

    public LeerjaarEnum? Leerjaar { get; set; }

    public List<LeerjaarEnum> Leerjaren { get; set; } = [];

    public List<VaardighedenEnum> Vaardigheden { get; set; } = [];

    /// <summary>CEFR (A1–C2) blijft in TaalNiveau; Meijerink apart voor NT2/referentiekader.</summary>
    public string? TaalniveauMeijerink { get; set; }

    /// <summary>SLO-kerndoelen taal, bijv. 2A, 3B.</summary>
    public List<string> SloKerndoelen { get; set; } = [];

    /// <summary>Vrije invoer bij vakoverstijgend taalonderwijs.</summary>
    public List<string> OverigeVakken { get; set; } = [];

    [Range(0, 100, ErrorMessage = "Aantal lessen moet tussen 0 en 100 liggen.")]
    public int AantalLessen { get; set; }

    public TimeSpan TijdsDuur { get; set; }

    [Required]
    public StatusEnum Status { get; set; }

    public List<string> Literatuurlijst { get; set; } = [];

    [Required]
    public required Docent Eigenaar { get; set; }

    public List<Les> Lessen { get; set; } = [];

    public List<Bijlage> Bijlagen { get; set; } = [];

    public List<Beoordeling> Beoordelingen { get; set; } = [];
}
