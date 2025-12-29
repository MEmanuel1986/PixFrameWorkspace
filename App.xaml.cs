namespace PixFrameWorkspace
{
    public partial class App : Application
    {
        public App(MainPage mainPage)
        {
            InitializeComponent();

            // Moderne .NET MAUI Initialisierung
            MainPage = new NavigationPage(new MainPage());
        }
    }
}