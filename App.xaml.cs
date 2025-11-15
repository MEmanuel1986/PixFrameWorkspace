namespace PixFrameWorkspace
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();

            // Moderne .NET MAUI Initialisierung
            MainPage = new NavigationPage(new MainPage());
        }

        // Alternative: Noch modernerer Ansatz
        //protected override Window CreateWindow(IActivationState activationState)
        //{
        //    return new Window(new NavigationPage(new MainPage()))
        //    {
        //        Title = "PixFrameWorkspace"
        //    };
        //}
    }
}