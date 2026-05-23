using LessenHub.Application.Models;
using LessenHub.Application.Services;
using LessenHub.Backend.Services;
using LessenHub.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;

namespace LessenHub.Backend.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class LessenSerieController(
    ILessenSerieService lessenSerieService,
    IDocentService docentService,
    PdfGeneratorService pdfGenerator,
    ILogger<LessenSerieController> logger) : ControllerBase
{
    [HttpGet(Name = "GetAllLessenSeries")]
    public async Task<ActionResult<IEnumerable<LessenSerie>>> GetAll(Guid docentId, CancellationToken cancellationToken)
    {
        try
        {
            var lessenSeries = await lessenSerieService.GetByDocentIdAsync(docentId, cancellationToken);
            return Ok(lessenSeries);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij ophalen lessenseries voor docent {DocentId}", docentId);
            return StatusCode(500, $"Er is een fout opgetreden bij het ophalen van de lessenseries. Details: {ex.Message}");
        }
    }

    [HttpGet("status/{status}", Name = "GetLessenSeriesByStatus")]
    public async Task<ActionResult<IEnumerable<LessenSerie>>> GetByStatus(string status, CancellationToken cancellationToken)
    {
        try
        {
            var lessenSeries = await lessenSerieService.GetByStatusAsync(status, cancellationToken);
            return Ok(lessenSeries);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij ophalen lessenseries met status {Status}", status);
            return StatusCode(500, $"Er is een fout opgetreden bij het ophalen van de lessenseries (status). Details: {ex.Message}");
        }
    }

    [HttpGet("{id}", Name = "GetLessenSerieById")]
    public async Task<ActionResult<LessenSerie>> Get(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var serie = await lessenSerieService.GetByIdAsync(id, cancellationToken);
            if (serie is null)
                return NotFound();

            return Ok(serie);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij ophalen lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de lessenserie.");
        }
    }

    [HttpGet("Indienen/{id}", Name = "LessenSerieIndienen")]
    public async Task<ActionResult<LessenSerie>> Indienen(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var serie = await lessenSerieService.SubmitAsync(id, cancellationToken);
            return Ok(serie);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij indienen lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het indienen van de lessenserie.");
        }
    }

    [HttpPost(Name = "CreateLessenSerie")]
    public async Task<ActionResult<LessenSerie>> Create([FromBody] LessenSerie lessenSerie, CancellationToken cancellationToken)
    {
        try
        {
            if (lessenSerie is null)
                return BadRequest("LessenSerie data is required.");

            var created = await lessenSerieService.CreateAsync(lessenSerie, cancellationToken);
            return StatusCode(201, created);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij aanmaken lessenserie");
            return StatusCode(500, "Er is een fout opgetreden bij het aanmaken van de lessenserie.");
        }
    }

    [HttpPut("{id}", Name = "UpdateLessenSerie")]
    public async Task<ActionResult<LessenSerie>> Update(Guid id, [FromBody] LessenSerie lessenSerie, CancellationToken cancellationToken)
    {
        try
        {
            if (lessenSerie is null)
                return BadRequest("LessenSerie data is required.");

            var updated = await lessenSerieService.UpdateAsync(id, lessenSerie, cancellationToken);
            if (updated is null)
                return NotFound();

            return Ok(updated);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij bijwerken lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het bijwerken van de lessenserie.");
        }
    }

    [HttpDelete("{id}", Name = "DeleteLessenSerie")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await lessenSerieService.DeleteAsync(id, cancellationToken);
            if (!deleted)
                return NotFound();

            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij verwijderen lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het verwijderen van de lessenserie.");
        }
    }

    [HttpPost("beoordeling/{id:guid}", Name = "UpsertLessenSerieBeoordelingByPath")]
    [HttpPost("{id:guid}/beoordeling", Name = "UpsertLessenSerieBeoordeling")]
    public async Task<ActionResult<LessenSerie>> UpsertBeoordeling(
        Guid id,
        [FromBody] BeoordelingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request is null || request.Rating is < 1 or > 5)
                return BadRequest("Geef een rating tussen 1 en 5 sterren.");

            var docent = await ResolveCurrentDocentAsync(cancellationToken);
            if (docent is null)
                return Unauthorized("Geen ingelogde docent gevonden.");

            var serie = await lessenSerieService.UpsertBeoordelingAsync(
                id, docent, request.Rating, request.Commentaar, cancellationToken);

            if (serie is null)
                return NotFound();

            return Ok(serie);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij opslaan beoordeling voor lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het opslaan van de beoordeling.");
        }
    }

    [HttpPost("goedkeuren/{id:guid}", Name = "GoedkeurLessenSerieMetBeoordeling")]
    public async Task<ActionResult<LessenSerie>> GoedkeurMetBeoordeling(
        Guid id,
        [FromBody] BeoordelingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request is null || request.Rating is < 1 or > 5)
                return BadRequest("Geef een rating tussen 1 en 5 sterren.");

            var docent = await ResolveCurrentDocentAsync(cancellationToken);
            if (docent is null)
                return Unauthorized("Geen ingelogde docent gevonden.");

            var serie = await lessenSerieService.GoedkeurMetBeoordelingAsync(
                id, docent, request.Rating, request.Commentaar, cancellationToken);

            if (serie is null)
                return NotFound();

            return Ok(serie);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij goedkeuren lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het goedkeuren van de lessenserie.");
        }
    }

    [HttpPost("afwijzen/{id:guid}", Name = "AfwijzenLessenSerieMetBeoordeling")]
    public async Task<ActionResult<LessenSerie>> AfwijzenMetBeoordeling(
        Guid id,
        [FromBody] BeoordelingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request is null || request.Rating is < 1 or > 5)
                return BadRequest("Geef een rating tussen 1 en 5 sterren.");

            if (string.IsNullOrWhiteSpace(request.Commentaar))
                return BadRequest("Geef een toelichting bij afwijzen.");

            var docent = await ResolveCurrentDocentAsync(cancellationToken);
            if (docent is null)
                return Unauthorized("Geen ingelogde docent gevonden.");

            var serie = await lessenSerieService.AfwijzenMetBeoordelingAsync(
                id, docent, request.Rating, request.Commentaar, cancellationToken);

            if (serie is null)
                return NotFound();

            return Ok(serie);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij afwijzen lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het afwijzen van de lessenserie.");
        }
    }

    [HttpGet("download/{id}", Name = "DownloadLessenSeriePdf")]
    public async Task<ActionResult> DownloadPdf(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var lessenSerie = await lessenSerieService.GetByIdAsync(id, cancellationToken);
            if (lessenSerie is null)
                return NotFound("LessenSerie not found.");

            var pdfBytes = pdfGenerator.GenerateLessenSeriePdf(lessenSerie);
            var fileName = $"{lessenSerie.Titel.Replace(" ", "_")}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij genereren PDF voor lessenserie {LessenSerieId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het genereren van de PDF.");
        }
    }

    [HttpGet("{seriesId}/download/{lessonId}", Name = "DownloadLessenSerieLesPdf")]
    public async Task<ActionResult> DownloadLesPdf(Guid seriesId, Guid lessonId, CancellationToken cancellationToken)
    {
        try
        {
            var lessenSerie = await lessenSerieService.GetByIdAsync(seriesId, cancellationToken);
            if (lessenSerie is null)
                return NotFound("LessenSerie not found.");

            var lessonIndex = lessenSerie.Lessen.FindIndex(les => les.Id == lessonId);
            var les = lessenSerie.Lessen.FirstOrDefault(l => l.Id == lessonId);
            if (les is null)
                return NotFound("Les not found in lessenserie.");

            var pdfBytes = pdfGenerator.GenerateLesPdf(les, lessenSerie, lessonIndex >= 0 ? lessonIndex + 1 : null);
            var safeTitle = string.IsNullOrWhiteSpace(les.Titel) ? $"les_{lessonId}" : les.Titel.Replace(" ", "_");
            return File(pdfBytes, "application/pdf", $"{safeTitle}.pdf");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij genereren PDF voor les {LesId} in lessenserie {LessenSerieId}", lessonId, seriesId);
            return StatusCode(500, "Er is een fout opgetreden bij het genereren van de PDF.");
        }
    }

    private async Task<Docent?> ResolveCurrentDocentAsync(CancellationToken cancellationToken)
    {
        var email = User.FindFirst("email")?.Value
            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
        var name = User.FindFirst("name")?.Value
            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value;

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(name))
            return null;

        var existing = await docentService.GetByEmailAsync(email, cancellationToken);
        if (existing is not null)
            return existing;

        Guid docentId;
        using (var sha1 = SHA1.Create())
        {
            var hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(email));
            Array.Resize(ref hash, 16);
            docentId = new Guid(hash);
        }

        var newDocent = new Docent
        {
            Id = docentId,
            Naam = name,
            Email = email
        };
        return await docentService.CreateAsync(newDocent, cancellationToken);
    }
}
