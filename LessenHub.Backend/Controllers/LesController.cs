using LessenHub.Application.Services;
using LessenHub.Backend.Services;
using LessenHub.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LessenHub.Backend.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize]
    public class LesController(ILesService lesService, PdfGeneratorService pdfGenerator, ILogger<LesController> logger) : ControllerBase
    {
        private readonly ILogger<LesController> _logger = logger;

        private static readonly string[] AllowedContentTypes =
        [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ];

        private static readonly string[] AllowedExtensions =
        [
            ".pdf", ".docx", ".pptx"
        ];

        [HttpGet("{id}", Name = "GetLesById")]
        public async Task<ActionResult<Les>> Get(Guid id)
        {
            try
            {
                var les = await lesService.GetByIdAsync(id);
                if (les == null) return NotFound();
                return Ok(les);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij ophalen les {LesId}", id);
                return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de les.");
            }
        }

        [HttpPost(Name = "CreateLes")]
        public async Task<ActionResult<Les>> Create([FromBody] Les les)
        {
            try
            {
                if (les == null) return BadRequest("Les data is required.");
                var created = await lesService.CreateAsync(les);
                return StatusCode(201, created);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij aanmaken les");
                return StatusCode(500, "Er is een fout opgetreden bij het aanmaken van de les.");
            }
        }

        [HttpPut("{id}", Name = "UpdateLes")]
        public async Task<ActionResult<Les>> Update(Guid id, [FromBody] Les les)
        {
            try
            {
                if (les == null) return BadRequest("Les data is required.");
                var updated = await lesService.UpdateAsync(id, les);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij bijwerken les {LesId}", id);
                return StatusCode(500, "Er is een fout opgetreden bij het bijwerken van de les.");
            }
        }

        [HttpDelete("{id}", Name = "DeleteLes")]
        public async Task<ActionResult> Delete(Guid id)
        {
            try
            {
                var existing = await lesService.GetByIdAsync(id);
                if (existing == null) return NotFound();
                await lesService.DeleteAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij verwijderen les {LesId}", id);
                return StatusCode(500, "Er is een fout opgetreden bij het verwijderen van de les.");
            }
        }

        [HttpPost("{id}/bijlagen", Name = "UploadBijlage")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<Bijlage>> UploadBijlage(Guid id, [FromForm] IFormFile bestand)
        {
            try
            {
                var les = await lesService.GetByIdAsync(id);
                if (les == null) return NotFound("Les niet gevonden.");

                if (bestand == null || bestand.Length == 0)
                    return BadRequest("Geen bestand meegegeven.");

                var extension = Path.GetExtension(bestand.FileName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(extension))
                    return BadRequest($"Bestandstype niet toegestaan. Toegestaan: {string.Join(", ", AllowedExtensions)}");

                if (!AllowedContentTypes.Contains(bestand.ContentType))
                    return BadRequest("Ongeldig content type.");

                var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "bijlagen");
                Directory.CreateDirectory(uploadsDir);

                var uniqueFilename = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsDir, uniqueFilename);

                await using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await bestand.CopyToAsync(stream);
                }

                var bijlage = new Bijlage
                {
                    Id = Guid.NewGuid(),
                    Bestandsnaam = bestand.FileName,
                    ContentType = bestand.ContentType,
                    Pad = filePath,
                    Grootte = bestand.Length,
                    GeuploadOp = DateTime.UtcNow,
                };

                les.Bijlagen.Add(bijlage);
                await lesService.UpdateAsync(id, les);

                return StatusCode(201, bijlage);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij uploaden bijlage voor les {LesId}", id);
                return StatusCode(500, "Er is een fout opgetreden bij het uploaden van de bijlage.");
            }
        }

        [HttpDelete("{id}/bijlagen/{bijlageId}", Name = "DeleteBijlage")]
        public async Task<ActionResult> DeleteBijlage(Guid id, Guid bijlageId)
        {
            try
            {
                var les = await lesService.GetByIdAsync(id);
                if (les == null) return NotFound("Les niet gevonden.");

                var bijlage = les.Bijlagen.FirstOrDefault(b => b.Id == bijlageId);
                if (bijlage == null) return NotFound("Bijlage niet gevonden.");

                if (System.IO.File.Exists(bijlage.Pad))
                    System.IO.File.Delete(bijlage.Pad);

                les.Bijlagen.Remove(bijlage);
                await lesService.UpdateAsync(id, les);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij verwijderen bijlage {BijlageId} van les {LesId}", bijlageId, id);
                return StatusCode(500, "Er is een fout opgetreden bij het verwijderen van de bijlage.");
            }
        }

        [HttpGet("{id}/bijlagen/{bijlageId}/download", Name = "DownloadBijlage")]
        public async Task<ActionResult> DownloadBijlage(Guid id, Guid bijlageId)
        {
            try
            {
                var les = await lesService.GetByIdAsync(id);
                if (les == null) return NotFound("Les niet gevonden.");

                var bijlage = les.Bijlagen.FirstOrDefault(b => b.Id == bijlageId);
                if (bijlage == null) return NotFound("Bijlage niet gevonden.");

                if (!System.IO.File.Exists(bijlage.Pad))
                    return NotFound("Bestand niet gevonden op server.");

                var bytes = await System.IO.File.ReadAllBytesAsync(bijlage.Pad);
                return File(bytes, bijlage.ContentType, bijlage.Bestandsnaam);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij downloaden bijlage {BijlageId} van les {LesId}", bijlageId, id);
                return StatusCode(500, "Er is een fout opgetreden bij het downloaden van de bijlage.");
            }
        }

        [HttpGet("{id}/download", Name = "DownloadLesPdf")]
        public async Task<ActionResult> DownloadPdf(Guid id)
        {
            try
            {
                var les = await lesService.GetByIdAsync(id);
                if (les == null)
                {
                    return NotFound("Les not found.");
                }

                var pdfBytes = pdfGenerator.GenerateLesPdf(les);
                var fileName = $"{les.Titel.Replace(" ", "_")}.pdf";

                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fout bij genereren PDF voor les {LesId}", id);
                return StatusCode(500, "Er is een fout opgetreden bij het genereren van de PDF.");
            }
        }
    }
}