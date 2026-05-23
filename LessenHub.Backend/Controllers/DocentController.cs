using LessenHub.Application.Services;
using LessenHub.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LessenHub.Backend.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class DocentController(IDocentService docentService, ILogger<DocentController> logger) : ControllerBase
{
    [HttpGet("{id}", Name = "GetDocentById")]
    public async Task<ActionResult<Docent>> Get(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var docent = await docentService.GetByIdAsync(id, cancellationToken);
            if (docent is null)
                return NotFound();

            return Ok(docent);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fout bij ophalen docent {DocentId}", id);
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de docent.");
        }
    }
}
