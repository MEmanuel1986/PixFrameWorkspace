namespace PixFrameWorkspace
{
    public partial class App : Application
    {
        private readonly IServiceProvider serviceProvider;

        public App(IServiceProvider serviceProvider)
        {
            InitializeComponent();
            this.serviceProvider = serviceProvider;
            MainPage = serviceProvider.GetRequiredService<MainPage>();
        }
    }
}