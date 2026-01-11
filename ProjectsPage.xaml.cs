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

        public Customer SelectedCustomer
        {
            get => _initialCustomer;
            set => _initialCustomer = value;
        }

        private List<Project> _projects = new List<Project>();
        private List<Project> _allProjects = new List<Project>(); // Alle Projekte aus Repository
        private Project _selectedProject;
        private string _toolsConfigPath => AppConfig.GetToolsConfigPath();
        private Dictionary<string, bool> _toolsConfig;

        private readonly ProjectRepository _projectRepo;
        private readonly CustomerManager _customerManager;

        // Neue Felder für Tools
        private List<ToolItem> _availableTools = new List<ToolItem>();

        // ToolItem Klasse für das Dropdown
        public class ToolItem
        {
            public string Name { get; set; }
            public string ProcessName { get; set; }
            public string ApplicationPath { get; set; }
        }

        // DI-fähiger Konstruktor
        public ProjectsPage(ProjectRepository projectRepo, CustomerManager customerManager)
        {
            InitializeComponent();
            _projectRepo = projectRepo ?? throw new ArgumentNullException(nameof(projectRepo));
            _customerManager = customerManager ?? throw new ArgumentNullException(nameof(customerManager));
            SetupEventHandlers();
            _ = InitializeAsync();
        }

        // Konstruktor mit Customer-Parameter
        public ProjectsPage(ProjectRepository projectRepo, CustomerManager customerManager, Customer customer) : this(projectRepo, customerManager)
        {
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

        private async Task PersistProjectsAndReloadAsync()
        {
            // Speichere via Repo und lade danach die aktuelle Liste vom Repo
            await _projectRepo.SaveAllProjectsAsync(_allProjects).ConfigureAwait(false);
            _allProjects = (await _projectRepo.GetAllProjectsAsync().ConfigureAwait(false)).ToList();
        }

        private async void SaveProjectsToCsv()
        {
            try
            {
                await PersistProjectsAndReloadAsync().ConfigureAwait(false);
                Debug.WriteLine($"[ProjectsPage] SaveProjectsToCsv: saved {_allProjects.Count} projects to {_projectRepo.ProjectsFilePath}");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[ProjectsPage] SaveProjectsToCsv Fehler: {ex}");
                Console.WriteLine($"Fehler beim Speichern der Projekte in CSV: {ex.Message}");
                await DisplayAlert("Fehler", $"Projekte konnten nicht gespeichert werden: {ex.Message}", "OK");
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
        private string GetProcessName(string toolName)
        {
            switch (toolName.ToLower())
            {
                case "photoshop":
                    return "photoshop";
                case "lightroom":
                    return "lightroom";
                case "gimp":
                    return "gimp-2.10";
                case "affinity photo":
                    return "affinityphoto";
                case "davinci resolve":
                    return "resolve";
                case "imovie":
                    return "iMovie";
                case "premiere pro":
                    return "Adobe Premiere Pro";
                case "final cut pro":
                    return "Final Cut Pro";
                case "capture one":
                    return "captureone";
                case "camerabag":
                    return "Camerabag Photo";
                default:
                    return toolName.ToLower().Replace(" ", "");
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

        #region Project Management UI Handlers
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

        private void OnGettingReadyCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            GettingReadyErCheckBox.IsEnabled = GettingReadyCheckBox.IsChecked;
            GettingReadySieCheckBox.IsEnabled = GettingReadyCheckBox.IsChecked;
            GettingReadyBeideCheckBox.IsEnabled = GettingReadyCheckBox.IsChecked;

            if (!GettingReadyCheckBox.IsChecked)
            {
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

        private void GenerateProjectName()
        {
            try
            {
                var category = CategoryPicker.SelectedItem as string;
                var bookingDate = BookingDateEntry.Text;

                if (!string.IsNullOrEmpty(category) && !string.IsNullOrEmpty(bookingDate))
                {
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

        // Restliche Button-Handler (Save, Clear, OpenFolder etc.) bleiben wie zuvor und nutzen _projectRepo/_customerManager
    }
}