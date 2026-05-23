using LessenHub.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace LessenHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ILesService, LesService>();
        services.AddScoped<ILessenSerieService, LessenSerieService>();
        services.AddScoped<IDocentService, DocentService>();
        services.AddScoped<LesDuplicaatDetectieService>();
        return services;
    }
}
