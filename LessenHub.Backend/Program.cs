using LessenHub.Application;
using LessenHub.Application.Abstractions;
using LessenHub.Application.Abstractions.External;
using LessenHub.Backend.Services;
using LessenHub.Backend.Services.AI;
using LessenHub.Infrastructure;
using LessenHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using LessenHub.Backend.Middleware;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Serilog;
using System.Text.Json;

// Configure Serilog
var logDir = Path.Combine(Directory.GetCurrentDirectory(), "logs");
Directory.CreateDirectory(logDir);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: Path.Combine(logDir, "lessenhub-.txt"),
        rollingInterval: RollingInterval.Day,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}",
        retainedFileCountLimit: 30)
    .CreateLogger();

try
{
    Log.Information("Toepassing start");

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    // Set Google API key from configuration for Gemini if not already set
    var geminiKey = builder.Configuration["AI:ApiKey"];
    if (!string.IsNullOrWhiteSpace(geminiKey) && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_API_KEY")))
    {
        Environment.SetEnvironmentVariable("GOOGLE_API_KEY", geminiKey);
        Log.Information("GOOGLE_API_KEY environment variable set from configuration");
    }

    // Add services to the container.
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        });
    builder.Services.AddOpenApi();

    // Allow multipart uploads up to 20 MB
    builder.Services.Configure<FormOptions>(options =>
    {
        options.MultipartBodyLengthLimit = 20 * 1024 * 1024;
    });

    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

    var useInMemoryDatabase = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");
    if (useInMemoryDatabase)
        Log.Information("Persistence: InMemory-database");
    else
        Log.Information("Persistence: MongoDB ({Connection})",
            builder.Configuration["MongoDB:ConnectionString"] ?? "mongodb://localhost:27017/");

    builder.Services.AddScoped<PdfGeneratorService>();
    builder.Services.AddSingleton<DocumentExtractorService>();
    builder.Services.AddSingleton<LesTemplateExtractorService>();
    builder.Services.AddSingleton<LesLabelSectionExtractor>();
    builder.Services.AddSingleton<LesSemanticExtractorService>();
    builder.Services.AddSingleton<AiAnalyseTraceHolder>();
    builder.Services.AddSingleton<IPrivacyRedactionService, PrivacyRedactionService>();
    builder.Services.AddSingleton<ILesEmbeddingService, LesEmbeddingService>();

    // Register AI service with provider fallback chain (Open/Closed via IAiService implementations).
    builder.Services.AddSingleton<IAiService>(sp =>
    {
        var config = sp.GetRequiredService<IConfiguration>();
        var loggerFactory = sp.GetRequiredService<ILoggerFactory>();
        var traceHolder = sp.GetRequiredService<AiAnalyseTraceHolder>();
        var startupLogger = loggerFactory.CreateLogger("AiBootstrap");

        var providerOrder = config.GetSection("AI:ProviderOrder").Get<string[]>();
        if (providerOrder == null || providerOrder.Length == 0)
        {
            var preferred = config["AI:Provider"] ?? "Gemini";
            providerOrder = [preferred, "OpenAI", "Anthropic", "Gemini"];
        }

        var candidates = new List<AiProviderCandidate>();
        foreach (var raw in providerOrder)
        {
            var provider = (raw ?? string.Empty).Trim();
            if (provider.Length == 0)
            {
                continue;
            }

            try
            {
                var logger = loggerFactory.CreateLogger(provider);
                IAiService service = provider.ToLowerInvariant() switch
                {
                    "anthropic" => new AnthropicService(config, logger as ILogger<AnthropicService> ?? loggerFactory.CreateLogger<AnthropicService>()),
                    "openai" => new OpenAiService(config, logger as ILogger<OpenAiService> ?? loggerFactory.CreateLogger<OpenAiService>(), traceHolder),
                    "gemini" => new GeminiService(config, logger as ILogger<GeminiService> ?? loggerFactory.CreateLogger<GeminiService>(), traceHolder),
                    _ => throw new InvalidOperationException($"Onbekende AI provider: {provider}")
                };

                candidates.Add(new AiProviderCandidate(provider, service));
                startupLogger.LogInformation("AI provider {Provider} toegevoegd aan fallback-keten", provider);
            }
            catch (Exception ex)
            {
                startupLogger.LogWarning(ex, "AI provider {Provider} niet beschikbaar en wordt overgeslagen", provider);
            }
        }

        if (candidates.Count == 0)
        {
            throw new InvalidOperationException("Geen geldige AI providers beschikbaar. Configureer AI:ProviderOrder en bijbehorende ApiKeys.");
        }

        return new FallbackAiService(candidates, loggerFactory.CreateLogger<FallbackAiService>(), traceHolder);
    });

    // Configure CORS for frontend (reads Frontend:Url, adds http variant for local dev)
    var frontendUrl = builder.Configuration["Frontend:Url"] ?? "https://localhost:3000";
    var allowedOrigins = new List<string> { frontendUrl };
    if (frontendUrl.StartsWith("https://localhost"))
    {
        allowedOrigins.Add(frontendUrl.Replace("https://", "http://"));
    }

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy =>
        {
            policy.WithOrigins(allowedOrigins.ToArray())
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    // HTTP request logging (basic)
    builder.Services.AddHttpLogging(logging =>
    {
        logging.LoggingFields = HttpLoggingFields.RequestPropertiesAndHeaders | HttpLoggingFields.ResponseStatusCode;
        logging.RequestHeaders.Add("User-Agent");
    });

    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders =
            ForwardedHeaders.XForwardedFor |
            ForwardedHeaders.XForwardedProto |
            ForwardedHeaders.XForwardedHost;

        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    });

    // Configure Authentication with SurfConext
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddCookie(options =>
    {
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    })
    .AddOpenIdConnect(options =>
    {
        var authority = builder.Configuration["SurfConext:Authority"]
            ?? "https://connect.test.surfconext.nl";
        var frontendBaseUrl = (builder.Configuration["Frontend:Url"] ?? "https://localhost:3000").TrimEnd('/');
        var surfConextRedirectUri =
            builder.Configuration["SurfConext:RedirectUri"]
            ?? $"{frontendBaseUrl}/api/auth/callback";

        options.Authority = authority;
        options.ClientId = builder.Configuration["SurfConext:ClientId"]!;
        options.ClientSecret = builder.Configuration["SurfConext:ClientSecret"]!;

        options.ResponseType = OpenIdConnectResponseType.Code;
        options.ResponseMode = OpenIdConnectResponseMode.Query;
        options.SaveTokens = true;
        options.GetClaimsFromUserInfoEndpoint = true;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("email");

        options.CallbackPath = "/api/auth/callback";
        options.SignedOutCallbackPath = "/api/auth/signout-callback";
        options.SignedOutRedirectUri = builder.Configuration["Frontend:Url"] + "/login"
            ?? "https://localhost:3000/login";

        options.Events = new OpenIdConnectEvents
        {
            OnRedirectToIdentityProvider = context =>
            {
                context.ProtocolMessage.RedirectUri = surfConextRedirectUri;
                return Task.CompletedTask;
            },
            OnTicketReceived = context =>
            {
                var frontendUrl = builder.Configuration["Frontend:Url"] ?? "https://localhost:3000";
                context.ReturnUri = $"{frontendUrl}/";
                return Task.CompletedTask;
            },
            OnRemoteFailure = context =>
            {
                context.HandleResponse();
                context.Response.Redirect("/login?error=logout_failed");
                return Task.CompletedTask;
            }
        };
    });

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        await DevelopmentConceptSeed.EnsureDemoConceptAsync(app.Services);
    }

    app.UseDefaultFiles();
    app.MapStaticAssets();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseForwardedHeaders();
    app.UseHttpsRedirection();
    app.UseCors("Frontend");

    app.UseHttpLogging();
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapHealthChecks("/health");
    app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));

    app.MapGet("/", () =>
        Results.Content(
            """
            <!doctype html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>LessenHub API</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 2rem; line-height: 1.5; }
                    code { background: #f3f4f6; padding: 0.15rem 0.35rem; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>LessenHub backend is running</h1>
                <p>This deployment currently serves the API. Frontend static files are not bundled in this container image.</p>
                <p>Quick checks:</p>
                <ul>
                    <li><a href="/health">/health</a></li>
                    <li><a href="/api/auth/me">/api/auth/me</a></li>
                </ul>
            </body>
            </html>
            """,
            "text/html"));

    app.MapControllers();

    app.MapFallbackToFile("/index.html");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Toepassing beëindigd vanwege uitzonderlijke fout");
}
finally
{
    await Log.CloseAndFlushAsync();
}

// Expose Program for integration testing
public partial class Program { }