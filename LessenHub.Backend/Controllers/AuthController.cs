using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LessenHub.Application.Services;
using LessenHub.Domain.Entities;
using System.Security.Cryptography;
using System.Text;

namespace LessenHub.Backend.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IDocentService _docentService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IConfiguration configuration,
        IDocentService docentService,
        ILogger<AuthController> logger)
    {
        _configuration = configuration;
        _docentService = docentService;
        _logger = logger;
    }

    /// <summary>
    /// Initiates SurfConext login - redirects to SurfConext
    /// </summary>
    [HttpGet("surfconext/login")]
    public IActionResult Login()
    {
        var frontendUrl = _configuration["Frontend:Url"] ?? "https://localhost:3000";
        
        var properties = new AuthenticationProperties
        {
            RedirectUri = $"{frontendUrl}/"
        };

        // This triggers the OpenID Connect flow
        return Challenge(properties, OpenIdConnectDefaults.AuthenticationScheme);
    }

    /// <summary>
    /// Logout - clears the session
    /// </summary>
    [HttpGet("logout")]
    public IActionResult Logout()
    {
        var frontendUrl = _configuration["Frontend:Url"] ?? "https://localhost:3000";
        
        // Create properties for the sign-out redirect
        var properties = new AuthenticationProperties
        {
            RedirectUri = $"{frontendUrl}/login"
        };
        
        // Sign out from local cookies only (OIDC logout to SurfConext causes configuration errors)
        return SignOut(properties, CookieAuthenticationDefaults.AuthenticationScheme);
    }
    
    /// <summary>
    /// Callback endpoint after SurfConext logout
    /// </summary>
    [HttpGet("signout-callback")]
    public IActionResult SignOutCallback()
    {
        // Just redirect to login page after successful logout from SurfConext
        var frontendUrl = _configuration["Frontend:Url"] ?? "https://localhost:3000";
        return Redirect($"{frontendUrl}/login");
    }

    /// <summary>
    /// Get current authenticated user info
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        var email = User.FindFirst("email")?.Value
            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
        var name = User.FindFirst("name")?.Value
            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value;

        string? docentId = null;

        if (isAuthenticated && !string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(name))
        {
            try
            {
                docentId = await SyncDocentAsync(name, email);
            }
            catch (Exception ex)
            {
                // Keep authentication functional even if docent sync fails (e.g. temporary DB issues).
                _logger.LogWarning(ex, "Kon docent niet synchroniseren voor gebruiker {Email}", email);
            }
        }

        return Ok(new
        {
            isAuthenticated,
            email,
            name,
            docentId
        });
    }

    /// <summary>
    /// Syncs docent record from SurfConext claims
    /// Creates a new docent if they don't exist, or returns existing docent ID
    /// </summary>
    private async Task<string> SyncDocentAsync(string name, string email)
    {
        // Check if docent with this email already exists
        var existingDocent = await _docentService.GetByEmailAsync(email);
        
        if (existingDocent != null)
        {
            // Docent found, return their ID
            return existingDocent.Id.ToString();
        }

        // Generate deterministic GUID from email for new docent
        Guid docentId;
        using (var sha1 = SHA1.Create())
        {
            var hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(email));
            // Take first 16 bytes for GUID
            Array.Resize(ref hash, 16);
            docentId = new Guid(hash);
        }

        // Create new docent
        var newDocent = new Docent
        {
            Id = docentId,
            Naam = name,
            Email = email
        };
        await _docentService.CreateAsync(newDocent);

        return docentId.ToString();
    }
}
