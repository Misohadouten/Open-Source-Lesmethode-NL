using System.ComponentModel.DataAnnotations;

namespace LessenHub.Domain.Entities;

public class Docent
{
    public Guid Id { get; set; }

    [Required]
    [StringLength(200)]
    public required string Naam { get; set; }

    [Required]
    [EmailAddress]
    [StringLength(320)]
    public required string Email { get; set; }
}
