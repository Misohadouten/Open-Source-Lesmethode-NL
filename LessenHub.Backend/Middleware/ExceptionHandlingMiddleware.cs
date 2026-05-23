using System.Diagnostics;
using System.Net.Mime;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace LessenHub.Backend.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
                _logger.LogError(ex, "Onverwerkte fout. TraceId={TraceId}", traceId);

                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = MediaTypeNames.Application.Json;

                var problem = new
                {
                    title = "Er is een fout opgetreden",
                    status = StatusCodes.Status500InternalServerError,
                    traceId
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
            }
        }
    }
}
