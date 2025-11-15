using Microsoft.Maui.Controls;

namespace PixFrameWorkspace
{
    public partial class ProjectDetailPage : ContentPage
    {
        private Customer _currentCustomer;
        private Project _currentProject;
        private bool _isEditing = false;

        // KONSTRUKTOR MIT 2 PARAMETERN HINZUFÜGEN
        public ProjectDetailPage(Customer customer, Project project)
        {
            InitializeComponent();
            _currentCustomer = customer;
            _currentProject = project;
            _isEditing = project != null;

            if (_isEditing)
            {
                LoadProjectData();
                Title = "Projekt bearbeiten";
            }
            else
            {
                Title = "Neues Projekt";
                // Setze Standardwerte für neues Projekt
                StatusPicker.SelectedItem = "Aktiv";
            }
        }

        private void LoadProjectData()
        {
            if (_currentProject == null) return;

            ProjectNameEntry.Text = _currentProject.ProjectName;
            DescriptionEntry.Text = _currentProject.Description;

            if (_currentProject.Deadline.HasValue)
            {
                DeadlineDatePicker.Date = _currentProject.Deadline.Value;
            }

            StatusPicker.SelectedItem = _currentProject.Status;
            NotesEditor.Text = _currentProject.Notes;
        }

        // EVENT-HANDLER IMPLEMENTIEREN
        private async void OnSaveProjectClicked(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(ProjectNameEntry.Text))
            {
                await DisplayAlert("Fehler", "Bitte geben Sie einen Projektnamen ein.", "OK");
                return;
            }

            try
            {
                if (_isEditing && _currentProject != null)
                {
                    // Bestehendes Projekt aktualisieren
                    _currentProject.ProjectName = ProjectNameEntry.Text;
                    _currentProject.Description = DescriptionEntry.Text;
                    _currentProject.Deadline = DeadlineDatePicker.Date;
                    _currentProject.Status = StatusPicker.SelectedItem?.ToString() ?? "Aktiv";
                    _currentProject.Notes = NotesEditor.Text;

                    ProjectRepository.UpdateProject(_currentProject);
                    await DisplayAlert("Erfolg", "Projekt aktualisiert.", "OK");
                }
                else
                {
                    // Neues Projekt erstellen
                    var newProject = new Project
                    {
                        ProjectId = ProjectRepository.GetNextProjectId(),
                        CustomerNumber = _currentCustomer.CustomerNumber,
                        ProjectName = ProjectNameEntry.Text,
                        Description = DescriptionEntry.Text,
                        CreatedDate = DateTime.Now,
                        Deadline = DeadlineDatePicker.Date,
                        Status = StatusPicker.SelectedItem?.ToString() ?? "Aktiv",
                        Notes = NotesEditor.Text
                    };

                    // Projektordner erstellen
                    newProject.ProjectFolderPath = ProjectRepository.CreateProjectFolder(_currentCustomer, newProject);

                    ProjectRepository.AddProject(newProject);
                    await DisplayAlert("Erfolg", "Projekt erstellt.", "OK");
                }

                await Navigation.PopAsync();
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Speichern fehlgeschlagen: {ex.Message}", "OK");
            }
        }

        private async void OnAddContractClicked(object sender, EventArgs e)
        {
            // TODO: Implementieren
            await DisplayAlert("Info", "Verträge hinzufügen wird implementiert.", "OK");
        }

        private async void OnAddInvoiceClicked(object sender, EventArgs e)
        {
            // TODO: Implementieren
            await DisplayAlert("Info", "Rechnungen hinzufügen wird implementiert.", "OK");
        }

        private async void OnAddImageClicked(object sender, EventArgs e)
        {
            // TODO: Implementieren
            await DisplayAlert("Info", "Bilder hinzufügen wird implementiert.", "OK");
        }

        private async void OnAddVideoClicked(object sender, EventArgs e)
        {
            // TODO: Implementieren
            await DisplayAlert("Info", "Videos hinzufügen wird implementiert.", "OK");
        }

        private async void OnOpenProjectFolderClicked(object sender, EventArgs e)
        {
            if (_currentProject == null || string.IsNullOrEmpty(_currentProject.ProjectFolderPath))
            {
                await DisplayAlert("Fehler", "Projekt muss erst gespeichert werden.", "OK");
                return;
            }

            try
            {
                if (Directory.Exists(_currentProject.ProjectFolderPath))
                {
                    // Verwende die gleiche Methode wie in MainPage
                    await Launcher.Default.OpenAsync(new OpenFileRequest
                    {
                        File = new ReadOnlyFile(_currentProject.ProjectFolderPath)
                    });
                }
                else
                {
                    await DisplayAlert("Fehler", "Projektordner existiert nicht.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Ordner konnte nicht geöffnet werden: {ex.Message}", "OK");
            }
        }
    }
}