using Microsoft.Maui.Controls;

namespace PixFrameWorkspace;

public partial class App : Application
{
    // App erhält MainPage via DI (MainPage ist transient; ihre Abhängigkeiten werden injiziert)
    public App(MainPage mainPage)
    {
        InitializeComponent();

        // MainPage wird in eine NavigationPage gepackt
        MainPage = new NavigationPage(mainPage);
    }
}