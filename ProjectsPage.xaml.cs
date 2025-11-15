using Microsoft.Maui.Controls;
using System.Collections.ObjectModel;

namespace PixFrameWorkspace
{
    public partial class ProjectsPage : ContentPage
    {
        private Customer _currentCustomer;
        private ObservableCollection<Project> _customerProjects;

        public ProjectsPage(Customer customer)
        {
            InitializeComponent();
            _currentCustomer = customer;
            LoadProjects();
        }

        private void LoadProjects()
        {
            _customerProjects = ProjectRepository.GetProjectsByCustomer(_currentCustomer.CustomerNumber);
            ProjectsCollectionView.ItemsSource = _customerProjects;

            StatusLabel.Text = _customerProjects.Count == 0
                ? "Keine Projekte vorhanden"
                : $"{_customerProjects.Count} Projekte gefunden";
        }

        private async void OnBackButtonClicked(object sender, EventArgs e)
        {
            await Navigation.PopAsync();
        }

        private async void OnNewProjectClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new ProjectDetailPage(_currentCustomer, null));
        }

        private async void OnProjectSelected(object sender, SelectionChangedEventArgs e)
        {
            if (e.CurrentSelection.FirstOrDefault() is Project selectedProject)
            {
                await Navigation.PushAsync(new ProjectDetailPage(_currentCustomer, selectedProject));
            }
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            LoadProjects(); // Projekte neu laden falls Änderungen gemacht wurden
        }
    }
}