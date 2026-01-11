using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace PixFrameWorkspace;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        // DI-Registrierungen
        builder.Services.AddSingleton<CustomerManager>();
        builder.Services.AddSingleton<ProjectRepository>();

        builder.Services.AddTransient<MainPage>();
        builder.Services.AddTransient<ProjectsPage>();
        builder.Services.AddTransient<SettingsPage>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}