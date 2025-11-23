using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Maui.Controls;
using CsvHelper;
using System.Globalization;
using System.Diagnostics;

namespace PixFrameWorkspace
{
    public partial class ProjectsPage : ContentPage
    {
        private Customer _currentCustomer;
        private Customer _initialCustomer; // falls Konstruktor mit Customer verwendet wurde
        private List<Project> _projects = new List<Project>();
        private List<Project> _allProjects = new List<Project>(); // Alle Projekte aus Repository
        private Project _selectedProject;
        private string _toolsConfigPath => AppConfig.GetToolsConfigPath();
        private Dictionary<string, bool> _toolsConfig;

        private ProjectRepository _projectRepo = new ProjectRepository();

        // CSV-Pfad für Projekte (nicht mehr direkt genutzt)
        private string _projectsCsvPath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            "PixFrameWorkspace", "Data", "projects.csv");

        // Neue Felder für Tools
        private List<ToolItem> _availableTools = new List<ToolItem>();

        // ToolItem Klasse für das Dropdown
        public class ToolItem
        {
            public string Name { get; set; }
            public string ProcessName { get; set; }
            public string ApplicationPath { get; set; }
        }

        // Parameterloser Konstruktor
        public ProjectsPage()
        {
            InitializeComponent();
            SetupEventHandlers();
            _ = InitializeAsync();
        }

        // Konstruktor mit Customer-Parameter
        public ProjectsPage(Customer customer) : this()
        {
            // Merke den initialen Kunden; InitializeAsync wird diesen berücksichtigen
            _initialCustomer = customer;
        }

        private async Task InitializeAsync()
        {
            try
            {
                await _projectRepo.InitializeAsync().ConfigureAwait(false);

                // Debug: zeige den Pfad, in den das Repository schreibt
                var repoPath = _projectRepo.ProjectsFilePath;
                Debug.WriteLine($"[ProjectsPage] ProjectRepository path = {repoPath}");

                // Setze _currentCustomer falls ein initialCustomer übergeben wurde
                if (_initialCustomer != null)
                {
                    _currentCustomer = _initialCustomer;
                    // UI-Thread-Updates für Title/Status/OpenFolder
                    Dispatcher.Dispatch(() =>
                    {
                        Title = $"Projekte - {_currentCustomer.DisplayName}";
                        StatusLabel.Text = $"Projekte für {_currentCustomer.DisplayName}";
                        OpenFolderButton.IsEnabled = true;
                    });
                }

                _allProjects = (await _projectRepo.GetAllProjectsAsync().ConfigureAwait(false)).ToList();

                // Filter und UI erst nachdem die Projekte geladen sind
                FilterProjectsByCustomer();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler bei Init ProjectsPage: {ex}");
                Console.WriteLine($"Fehler bei Init ProjectsPage: {ex.Message}");
            }
        }

        private void SetupEventHandlers()
        {
            // Event-Handler für automatische Projektnamensgenerierung
            CategoryPicker.SelectedIndexChanged += OnCategoryPickerChanged;
            BookingDateEntry.TextChanged += OnBookingDateEntryChanged;

            // Event-Handler für Getting Ready
            GettingReadyCheckBox.CheckedChanged += OnGettingReadyCheckedChanged;
            GettingReadyBeideCheckBox.CheckedChanged += OnGettingReadyBeideCheckedChanged;

            // Event-Handler für Tools Picker
            ToolsPicker.SelectedIndexChanged += OnToolsPickerSelectedIndexChanged;
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            LoadToolsConfiguration();
            UpdateProjectCount();
        }

        #region CSV Operations - via ProjectRepository
        private void EnsureCsvDirectoryExists()
        {
            var directory = Path.GetDirectoryName(_projectsCsvPath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
        }

        private void LoadAllProjects()
        {
            // Not used: loading is done via repo in InitializeAsync
        }

        private void FilterProjectsByCustomer()
        {
            try
            {
                _projects.Clear();

                if (_currentCustomer != null)
                {
                    // Nur Projekte des aktuellen Kunden anzeigen
                    _projects = _allProjects
                        .Where(p => p.CustomerNumber == _currentCustomer.CustomerNumber)
                        .ToList();
                }
                else
                {
                    // Wenn kein Kunde ausgewählt ist, alle Projekte anzeigen
                    _projects = new List<Project>(_allProjects);
                }

                UpdateProjectsList();
                UpdateProjectCount();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Filtern der Projekte: {ex}");
            }
        }

        private async void SaveProjectsToCsv()
        {
            try
            {
                await _projectRepo.SaveAllProjectsAsync(_allProjects).ConfigureAwait(false);
                Debug.WriteLine($"[ProjectsPage] SaveProjectsToCsv: saved {_allProjects.Count} projects to {_projectRepo.ProjectsFilePath}");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[ProjectsPage] SaveProjectsToCsv Fehler: {ex}");
                Console.WriteLine($"Fehler beim Speichern der Projekte in CSV: {ex.Message}");
                await DisplayAlert("Fehler", $"Projekte konnten nicht gespeichert werden: {ex.Message}", "OK");
            }
        }

        private void CreateExampleProjects()
        {
            if (_currentCustomer != null)
            {
                var exampleProjects = new List<Project>
                {
                    new Project
                    {
                        ProjectId = 1,
                        ProjectName = "Hochzeit Sommer 2024",
                        Category = "Hochzeit",
                        Status = "Aktiv",
                        Booking = new DateTime(2024, 7, 15),
                        CustomerNumber = _currentCustomer.CustomerNumber,
                        CreatedDate = DateTime.Now
                    },
                    new Project
                    {
                        ProjectId = 2,
                        ProjectName = "Portrait Shooting",
                        Category = "Portrait",
                        Status = "Abgeschlossen",
                        Booking = new DateTime(2024, 5, 20),
                        CustomerNumber = _currentCustomer.CustomerNumber,
                        CreatedDate = DateTime.Now
                    }
                };

                _allProjects.AddRange(exampleProjects);
                _projects.AddRange(exampleProjects);
            }
        }
        #endregion

        #region Tools Configuration
        private void LoadToolsConfiguration()
        {
            try
            {
                _availableTools.Clear();
                ToolsPicker.ItemsSource = null;

                if (File.Exists(_toolsConfigPath))
                {
                    var json = File.ReadAllText(_toolsConfigPath);
                    var toolsConfig = JsonSerializer.Deserialize<Dictionary<string, bool>>(json);

                    if (toolsConfig != null)
                    {
                        // Nur aktivierte Tools zur Liste hinzufügen
                        foreach (var tool in toolsConfig)
                        {
                            if (tool.Value) // Nur wenn Tool aktiviert ist
                            {
                                var toolItem = CreateToolItem(tool.Key);
                                if (toolItem != null)
                                {
                                    _availableTools.Add(toolItem);
                                }
                            }
                        }

                        // Dropdown mit verfügbaren Tools füllen
                        ToolsPicker.ItemsSource = _availableTools;

                        // Start-Button aktivieren wenn Tools verfügbar
                        StartToolButton.IsEnabled = _availableTools.Any();
                    }
                }

                if (!_availableTools.Any())
                {
                    StartToolButton.IsEnabled = false;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Laden der Tools-Konfiguration: {ex}");
                StartToolButton.IsEnabled = false;
            }
        }

        private ToolItem CreateToolItem(string toolName)
        {
            return new ToolItem
            {
                Name = toolName,
                ProcessName = GetProcessName(toolName),
                ApplicationPath = GetApplicationPath(toolName)
            };
        }

        private void OnToolsPickerSelectedIndexChanged(object sender, EventArgs e)
        {
            // Start-Button aktivieren wenn ein Tool ausgewählt ist
            StartToolButton.IsEnabled = ToolsPicker.SelectedItem != null;
        }

        private async void OnStartToolButtonClicked(object sender, EventArgs e)
        {
            if (ToolsPicker.SelectedItem is ToolItem selectedTool)
            {
                await StartTool(selectedTool);
            }
            else
            {
                await DisplayAlert("Info", "Bitte wählen Sie zuerst ein Tool aus.", "OK");
            }
        }

        private async Task StartTool(ToolItem tool)
        {
            try
            {
                // Zuerst versuchen, über den ApplicationPath zu starten
                if (!string.IsNullOrEmpty(tool.ApplicationPath) && File.Exists(tool.ApplicationPath))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = tool.ApplicationPath,
                        UseShellExecute = true
                    });

                    StatusLabel.Text = $"{tool.Name} wird gestartet...";
                    await DisplayAlert("Erfolg", $"{tool.Name} wurde gestartet.", "OK");
                }
                else
                {
                    // Fallback: Über ProcessName starten
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = tool.ProcessName,
                        UseShellExecute = true
                    });

                    StatusLabel.Text = $"{tool.Name} wird gestartet...";
                    await DisplayAlert("Erfolg", $"{tool.Name} wurde gestartet.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"{tool.Name} konnte nicht gestartet werden: {ex.Message}", "OK");
                StatusLabel.Text = $"Fehler beim Starten von {tool.Name}";
            }
        }

        private string GetApplicationPath(string toolName)
        {
            switch (toolName)
            {
                case "Photoshop":
                    return @"C:\Program Files\Adobe\Adobe Photoshop 2023\Photoshop.exe";
                case "Lightroom":
                    return @"C:\Program Files\Adobe\Adobe Lightroom Classic\Lightroom.exe";
                case "GIMP":
                    return @"C:\Program Files\GIMP 2\bin\gimp-2.10.exe";
                case "Affinity Photo":
                    return @"C:\Program Files\Affinity\Affinity Photo\Photo.exe";
                case "DaVinci Resolve":
                    return @"C:\Program Files\Blackmagic Design\DaVinci Resolve\Resolve.exe";
                case "iMovie":
                    return @"/Applications/iMovie.app/Contents/MacOS/iMovie";
                case "Premiere Pro":
                    return @"C:\Program Files\Adobe\Adobe Premiere Pro 2023\Adobe Premiere Pro.exe";
                case "Final Cut Pro":
                    return @"/Applications/Final Cut Pro.app/Contents/MacOS/Final Cut Pro";
                case "Capture One":
                    return @"C:\Program Files\Capture One\Capture One 22\CaptureOne.exe";
                case "Camerabag":
                    return @"C:\Program Files\Camerabag Photo\Camerabag Photo.exe";
                default:
                    return null;
            }
        }
        #endregion

        #region Project Management - KORRIGIERT FÜR KUNDENFILTERUNG
        private void UpdateProjectsList()
        {
            ProjectsListView.ItemsSource = null;
            ProjectsListView.ItemsSource = _projects;
        }

        private void UpdateProjectCount()
        {
            if (_currentCustomer != null)
            {
                ProjectCountLabel.Text = $"{_projects.Count} Projekte für {_currentCustomer.DisplayName}";
            }
            else
            {
                ProjectCountLabel.Text = $"{_projects.Count} Projekte gesamt";
            }
        }

        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            var searchText = e.NewTextValue?.ToLower() ?? "";

            if (string.IsNullOrWhiteSpace(searchText))
            {
                ProjectsListView.ItemsSource = _projects;
            }
            else
            {
                var filteredProjects = _projects.Where(p =>
                    (p.ProjectName?.ToLower().Contains(searchText) ?? false) ||
                    (p.Category?.ToLower().Contains(searchText) ?? false) ||
                    (p.Status?.ToLower().Contains(searchText) ?? false) ||
                    (p.BookingInfo?.ToLower().Contains(searchText) ?? false)
                ).ToList();

                ProjectsListView.ItemsSource = filteredProjects;
            }

            ProjectCountLabel.Text = $"{((System.Collections.IList)ProjectsListView.ItemsSource).Count} Projekte gefunden";
        }

        private void OnClearSearchClicked(object sender, EventArgs e)
        {
            SearchEntry.Text = string.Empty;
            ProjectsListView.ItemsSource = _projects;
            UpdateProjectCount();
        }

        private void OnProjectSelected(object sender, SelectedItemChangedEventArgs e)
        {
            if (e.SelectedItem is Project project)
            {
                _selectedProject = project;
                DisplayProjectDetails(project);
                StatusLabel.Text = $"Projekt {project.ProjectName} ausgewählt";
                OpenFolderButton.IsEnabled = true;
            }
        }

        private void DisplayProjectDetails(Project project)
        {
            // Projekt-ID setzen
            ProjectIdLabel.Text = project.ProjectId.ToString();

            // Projektname anzeigen
            GeneratedProjectNameLabel.Text = project.ProjectName;

            // Kategorie setzen
            if (!string.IsNullOrEmpty(project.Category))
            {
                CategoryPicker.SelectedItem = project.Category;
            }

            // Dienstleistungen setzen
            FotografieCheckBox.IsChecked = project.Fotografie;
            VideografieCheckBox.IsChecked = project.Videografie;
            GlueckwunschkartenCheckBox.IsChecked = project.Glueckwunschkarten;

            // Getting Ready setzen
            GettingReadyCheckBox.IsChecked = project.GettingReady;

            // Getting Ready Optionen setzen und aktivieren/deaktivieren
            GettingReadyErCheckBox.IsChecked = project.GettingReadyEr;
            GettingReadySieCheckBox.IsChecked = project.GettingReadySie;
            GettingReadyBeideCheckBox.IsChecked = project.GettingReadyBeide;

            // Aktivierung basierend auf Getting Ready Status
            GettingReadyErCheckBox.IsEnabled = project.GettingReady;
            GettingReadySieCheckBox.IsEnabled = project.GettingReady;
            GettingReadyBeideCheckBox.IsEnabled = project.GettingReady;

            // Status setzen
            if (!string.IsNullOrEmpty(project.Status))
            {
                StatusPicker.SelectedItem = project.Status;
            }

            // Buchungsdaten setzen
            BookingDateEntry.Text = project.Booking?.ToString("dd.MM.yyyy") ?? "";
            if (project.BookingTime != TimeSpan.Zero)
            {
                BookingTimeEntry.Text = project.BookingTime.ToString(@"hh\:mm");
            }
            else
            {
                BookingTimeEntry.Text = "";
            }
            LocationEntry.Text = project.Location;

            // Notizen setzen
            NotesEditor.Text = project.Notes ?? "";
        }

        private void OnCategoryPickerChanged(object sender, EventArgs e)
        {
            GenerateProjectName();
        }

        private void OnBookingDateEntryChanged(object sender, TextChangedEventArgs e)
        {
            GenerateProjectName();
        }

        private void GenerateProjectName()
        {
            try
            {
                var category = CategoryPicker.SelectedItem as string;
                var bookingDate = BookingDateEntry.Text;

                if (!string.IsNullOrEmpty(category) && !string.IsNullOrEmpty(bookingDate))
                {
                    // Projektname generieren: Kategorie + Datum
                    if (DateTime.TryParse(bookingDate, out DateTime date))
                    {
                        GeneratedProjectNameLabel.Text = $"{category} {date:dd.MM.yyyy}";
                    }
                    else
                    {
                        GeneratedProjectNameLabel.Text = $"{category} {bookingDate}";
                    }
                }
                else if (!string.IsNullOrEmpty(category))
                {
                    GeneratedProjectNameLabel.Text = category;
                }
                else
                {
                    GeneratedProjectNameLabel.Text = "Neues Projekt";
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Generieren des Projektnamens: {ex}");
            }
        }
        #endregion

        #region Getting Ready Logic
        private void OnGettingReadyCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            // Getting Ready Optionen aktivieren/deaktivieren basierend auf der Checkbox
            GettingReadyErCheckBox.IsEnabled = GettingReadyCheckBox.IsChecked;
            GettingReadySieCheckBox.IsEnabled = GettingReadyCheckBox.IsChecked;
            GettingReadyBeideCheckBox.IsEnabled = GettingReadyCheckBox.IsChecked;

            if (!GettingReadyCheckBox.IsChecked)
            {
                // Reset Getting Ready Optionen wenn deaktiviert
                GettingReadyErCheckBox.IsChecked = false;
                GettingReadySieCheckBox.IsChecked = false;
                GettingReadyBeideCheckBox.IsChecked = false;
            }
        }

        private void OnGettingReadyBeideCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            if (GettingReadyBeideCheckBox.IsChecked)
            {
                GettingReadyErCheckBox.IsChecked = true;
                GettingReadySieCheckBox.IsChecked = true;
            }
        }
        #endregion

        #region Date and Time Pickers
        private async void OnBookingDatePickerClicked(object sender, EventArgs e)
        {
            try
            {
                var selectedDate = await DisplayPromptAsync(
                    "Buchungsdatum auswählen",
                    "Bitte geben Sie das Datum ein (dd.MM.yyyy):",
                    initialValue: BookingDateEntry.Text,
                    maxLength: 10,
                    keyboard: Keyboard.Text);

                if (!string.IsNullOrEmpty(selectedDate))
                {
                    if (DateTime.TryParse(selectedDate, out DateTime date))
                    {
                        BookingDateEntry.Text = date.ToString("dd.MM.yyyy");
                    }
                    else
                    {
                        await DisplayAlert("Fehler", "Ungültiges Datumsformat. Bitte verwenden Sie dd.MM.yyyy", "OK");
                    }
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Auswählen des Datums: {ex.Message}", "OK");
            }
        }

        private async void OnBookingTimePickerClicked(object sender, EventArgs e)
        {
            try
            {
                var selectedTime = await DisplayPromptAsync(
                    "Uhrzeit auswählen",
                    "Bitte geben Sie die Uhrzeit ein (HH:mm):",
                    initialValue: BookingTimeEntry.Text,
                    maxLength: 5,
                    keyboard: Keyboard.Text);

                if (!string.IsNullOrEmpty(selectedTime))
                {
                    if (TimeSpan.TryParse(selectedTime, out TimeSpan time))
                    {
                        BookingTimeEntry.Text = time.ToString(@"hh\:mm");
                    }
                    else
                    {
                        await DisplayAlert("Fehler", "Ungültiges Zeitformat. Bitte verwenden Sie HH:mm", "OK");
                    }
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Auswählen der Zeit: {ex.Message}", "OK");
            }
        }
        #endregion

        #region Button Click Handlers - KORRIGIERT FÜR KUNDENFILTERUNG
        private async void OnSaveButtonClicked(object sender, EventArgs e)
        {
            try
            {
                // Validierung
                if (string.IsNullOrEmpty(CategoryPicker.SelectedItem as string))
                {
                    await DisplayAlert("Fehler", "Bitte wählen Sie eine Kategorie aus.", "OK");
                    return;
                }

                if (string.IsNullOrEmpty(GeneratedProjectNameLabel.Text))
                {
                    await DisplayAlert("Fehler", "Projektname konnte nicht generiert werden.", "OK");
                    return;
                }

                var project = new Project
                {
                    ProjectName = GeneratedProjectNameLabel.Text,
                    Category = CategoryPicker.SelectedItem as string,
                    Status = StatusPicker.SelectedItem as string ?? "Aktiv",
                    Location = LocationEntry.Text,
                    Notes = NotesEditor.Text,
                    GettingReady = GettingReadyCheckBox.IsChecked,
                    GettingReadyEr = GettingReadyErCheckBox.IsChecked,
                    GettingReadySie = GettingReadySieCheckBox.IsChecked,
                    GettingReadyBeide = GettingReadyBeideCheckBox.IsChecked,
                    Fotografie = FotografieCheckBox.IsChecked,
                    Videografie = VideografieCheckBox.IsChecked,
                    Glueckwunschkarten = GlueckwunschkartenCheckBox.IsChecked,
                    CreatedDate = DateTime.Now
                };

                // IMMER die CustomerNumber des aktuellen Kunden setzen
                if (_currentCustomer != null)
                {
                    project.CustomerNumber = _currentCustomer.CustomerNumber;
                }
                else
                {
                    await DisplayAlert("Fehler", "Kein Kunde ausgewählt. Projekt kann nicht gespeichert werden.", "OK");
                    return;
                }

                if (!string.IsNullOrEmpty(BookingDateEntry.Text))
                {
                    if (DateTime.TryParse(BookingDateEntry.Text, out DateTime bookingDate))
                    {
                        project.Booking = bookingDate;
                    }
                }

                if (!string.IsNullOrEmpty(BookingTimeEntry.Text))
                {
                    if (TimeSpan.TryParse(BookingTimeEntry.Text, out TimeSpan bookingTime))
                    {
                        project.BookingTime = bookingTime;
                    }
                }

                if (_selectedProject == null)
                {
                    // Neue ProjectId vergeben
                    project.ProjectId = await _projectRepo.GetNextProjectIdAsync().ConfigureAwait(false);

                    // PROJEKTORDNER ERSTELLEN
                    if (_currentCustomer != null)
                    {
                        project.ProjectFolderPath = _projectRepo.CreateProjectFolder(_currentCustomer, project);
                    }

                    await _projectRepo.AddOrUpdateProjectAsync(project).ConfigureAwait(false);

                    await Dispatcher.DispatchAsync(() =>
                    {
                        _allProjects.Add(project);
                        FilterProjectsByCustomer();
                        StatusLabel.Text = $"Projekt {project.ProjectName} erstellt";
                    });

                    await DisplayAlert("Erfolg", "Projekt erfolgreich erstellt", "OK");
                }
                else
                {
                    project.ProjectId = _selectedProject.ProjectId;
                    project.CustomerNumber = _selectedProject.CustomerNumber;
                    project.CreatedDate = _selectedProject.CreatedDate;
                    project.ProjectFolderPath = _selectedProject.ProjectFolderPath;

                    await _projectRepo.AddOrUpdateProjectAsync(project).ConfigureAwait(false);

                    await Dispatcher.DispatchAsync(() =>
                    {
                        var index = _allProjects.FindIndex(p => p.ProjectId == project.ProjectId);
                        if (index != -1)
                        {
                            _allProjects[index] = project;
                        }

                        FilterProjectsByCustomer();
                        StatusLabel.Text = $"Projekt {project.ProjectName} aktualisiert";
                    });

                    await DisplayAlert("Erfolg", "Projekt erfolgreich aktualisiert", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Speichern: {ex.Message}", "OK");
            }
        }

        private void OnClearButtonClicked(object sender, EventArgs e)
        {
            ClearForm();
            StatusLabel.Text = "Bereit für neues Projekt";
        }

        private void ClearForm()
        {
            _selectedProject = null;
            ProjectIdLabel.Text = "";
            GeneratedProjectNameLabel.Text = "";
            CategoryPicker.SelectedIndex = -1;
            StatusPicker.SelectedIndex = -1;

            FotografieCheckBox.IsChecked = false;
            VideografieCheckBox.IsChecked = false;
            GlueckwunschkartenCheckBox.IsChecked = false;
            GettingReadyCheckBox.IsChecked = false;

            // Getting Ready Optionen zurücksetzen und deaktivieren
            GettingReadyErCheckBox.IsChecked = false;
            GettingReadySieCheckBox.IsChecked = false;
            GettingReadyBeideCheckBox.IsChecked = false;
            GettingReadyErCheckBox.IsEnabled = false;
            GettingReadySieCheckBox.IsEnabled = false;
            GettingReadyBeideCheckBox.IsEnabled = false;

            // Formularfelder leeren
            BookingDateEntry.Text = "";
            BookingTimeEntry.Text = "";
            LocationEntry.Text = "";
            NotesEditor.Text = "";

            // Tools Dropdown zurücksetzen
            ToolsPicker.SelectedIndex = -1;
            StartToolButton.IsEnabled = false;

            // Selection in ListView zurücksetzen
            ProjectsListView.SelectedItem = null;
            OpenFolderButton.IsEnabled = false;
        }

        private async void OnOpenProjectFolderClicked(object sender, EventArgs e)
        {
            if (_currentCustomer == null)
            {
                await DisplayAlert("Info", "Kein Kunde ausgewählt.", "OK");
                return;
            }

            try
            {
                var customerManager = new CustomerManager();
                var success = await customerManager.OpenCustomerFolderAsync(_currentCustomer).ConfigureAwait(false);

                if (success)
                {
                    StatusLabel.Text = $"Ordner für {_currentCustomer.DisplayName} geöffnet";
                }
                else
                {
                    await DisplayAlert("Fehler", "Ordner konnte nicht geöffnet werden.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Öffnen des Ordners: {ex.Message}", "OK");
            }
        }

        private async void OnBackButtonClicked(object sender, EventArgs e)
        {
            await Navigation.PopAsync();
        }

        private async void OnAddImageClicked(object sender, EventArgs e)
        {
            try
            {
                var fileResult = await FilePicker.Default.PickAsync(new PickOptions
                {
                    PickerTitle = "Bild auswählen",
                    FileTypes = FilePickerFileType.Images
                });

                if (fileResult != null)
                {
                    await DisplayAlert("Erfolg", $"Bild ausgewählt: {fileResult.FileName}", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Auswählen des Bildes: {ex.Message}", "OK");
            }
        }

        private async void OnAddVideoClicked(object sender, EventArgs e)
        {
            try
            {
                var fileResult = await FilePicker.Default.PickAsync(new PickOptions
                {
                    PickerTitle = "Video auswählen",
                    FileTypes = FilePickerFileType.Videos
                });

                if (fileResult != null)
                {
                    await DisplayAlert("Erfolg", $"Video ausgewählt: {fileResult.FileName}", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Auswählen des Videos: {ex.Message}", "OK");
            }
        }
        #endregion
    }
}