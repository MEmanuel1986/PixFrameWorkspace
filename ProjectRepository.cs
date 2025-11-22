using System.Collections.ObjectModel;
using System.Text;

namespace PixFrameWorkspace
{
    public static class ProjectRepository
    {
        private static readonly string _projectsFilePath;
        private static ObservableCollection<Project> _projects = new ObservableCollection<Project>();

        static ProjectRepository()
        {
            _projectsFilePath = Path.Combine(AppConfig.Settings.FullDataPath, "projects.csv");
            LoadProjects();
        }

        public static ObservableCollection<Project> Projects => _projects;

        public static void LoadProjects()
        {
            _projects.Clear();

            try
            {
                if (File.Exists(_projectsFilePath))
                {
                    var lines = File.ReadAllLines(_projectsFilePath, Encoding.UTF8);

                    // Header überspringen
                    for (int i = 1; i < lines.Length; i++)
                    {
                        var line = lines[i];
                        var parts = line.Split(',');

                        // Angepasst für neue Struktur (18 Felder)
                        if (parts.Length >= 11)
                        {
                            var project = new Project
                            {
                                ProjectId = int.Parse(parts[0]),
                                CustomerNumber = int.Parse(parts[1]),
                                ProjectName = UnescapeCsvField(parts[2]),
                                Category = UnescapeCsvField(parts[3]),
                                CreatedDate = DateTime.Parse(parts[4]),
                                Booking = string.IsNullOrEmpty(parts[5]) ? null : DateTime.Parse(parts[5]),
                                Status = UnescapeCsvField(parts[6]),
                                ProjectFolderPath = UnescapeCsvField(parts[7]),
                                Notes = UnescapeCsvField(parts[8]),
                                Location = UnescapeCsvField(parts[9]),
                                BookingTime = TimeSpan.Parse(parts[10]),
                                // NEUE FELDER
                                Fotografie = parts.Length > 11 ? bool.Parse(parts[11]) : false,
                                Videografie = parts.Length > 12 ? bool.Parse(parts[12]) : false,
                                Glueckwunschkarten = parts.Length > 13 ? bool.Parse(parts[13]) : false,
                                GettingReady = parts.Length > 14 ? bool.Parse(parts[14]) : false,
                                GettingReadyEr = parts.Length > 15 ? bool.Parse(parts[15]) : false,
                                GettingReadySie = parts.Length > 16 ? bool.Parse(parts[16]) : false,
                                GettingReadyBeide = parts.Length > 17 ? bool.Parse(parts[17]) : false
                            };
                            _projects.Add(project);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Laden der Projekte: {ex.Message}");
            }
        }

        public static void SaveProjects()
        {
            try
            {
                var lines = new List<string>
                {
                    // NEUE CSV-STRUKTUR mit 18 Spalten
                    "ProjectId,CustomerNumber,ProjectName,Category,CreatedDate,Booking,Status,ProjectFolderPath,Notes,Location,BookingTime,Fotografie,Videografie,Glueckwunschkarten,GettingReady,GettingReadyEr,GettingReadySie,GettingReadyBeide"
                };

                foreach (var project in _projects)
                {
                    var line = $"{project.ProjectId}," +
                              $"{project.CustomerNumber}," +
                              $"{EscapeCsvField(project.ProjectName)}," +
                              $"{EscapeCsvField(project.Category)}," +
                              $"{project.CreatedDate:yyyy-MM-dd HH:mm:ss}," +
                              $"{(project.Booking.HasValue ? project.Booking.Value.ToString("yyyy-MM-dd HH:mm:ss") : "")}," +
                              $"{EscapeCsvField(project.Status)}," +
                              $"{EscapeCsvField(project.ProjectFolderPath)}," +
                              $"{EscapeCsvField(project.Notes)}," +
                              $"{EscapeCsvField(project.Location)}," +
                              $"{project.BookingTime}," +
                              $"{project.Fotografie}," +
                              $"{project.Videografie}," +
                              $"{project.Glueckwunschkarten}," +
                              $"{project.GettingReady}," +
                              $"{project.GettingReadyEr}," +
                              $"{project.GettingReadySie}," +
                              $"{project.GettingReadyBeide}";
                    lines.Add(line);
                }

                File.WriteAllLines(_projectsFilePath, lines, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Speichern der Projekte: {ex.Message}");
            }
        }

        public static ObservableCollection<Project> GetProjectsByCustomer(int customerNumber)
        {
            return new ObservableCollection<Project>(
                _projects.Where(p => p.CustomerNumber == customerNumber)
            );
        }

        public static int GetNextProjectId()
        {
            return _projects.Count > 0 ? _projects.Max(p => p.ProjectId) + 1 : 1;
        }

        public static void AddProject(Project project)
        {
            _projects.Add(project);
            SaveProjects();
        }

        public static void UpdateProject(Project project)
        {
            var existing = _projects.FirstOrDefault(p => p.ProjectId == project.ProjectId);
            if (existing != null)
            {
                _projects.Remove(existing);
                _projects.Add(project);
                SaveProjects();
            }
        }

        public static void DeleteProject(int projectId)
        {
            var project = _projects.FirstOrDefault(p => p.ProjectId == projectId);
            if (project != null)
            {
                _projects.Remove(project);
                SaveProjects();
            }
        }

        // FEHLENDE METHODEN HINZUGEFÜGT:
        private static string EscapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field)) return "";
            if (field.Contains(",") || field.Contains("\"") || field.Contains("\n"))
            {
                return $"\"{field.Replace("\"", "\"\"")}\"";
            }
            return field;
        }

        private static string UnescapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field)) return string.Empty;

            if (field.StartsWith("\"") && field.EndsWith("\""))
            {
                field = field.Substring(1, field.Length - 2);
                field = field.Replace("\"\"", "\"");
            }
            return field;
        }

        public static string CreateProjectFolder(Customer customer, Project project)
        {
            string projectFolderName = $"P_{project.ProjectId}_{project.ProjectName.Replace(" ", "_")}";
            foreach (char invalidChar in Path.GetInvalidFileNameChars())
            {
                projectFolderName = projectFolderName.Replace(invalidChar, '_');
            }

            string customerProjectsPath = Path.Combine(AppConfig.Settings.FullCustomersPath, $"C_{customer.CustomerNumber}", "01_Projects");
            string projectFolderPath = Path.Combine(customerProjectsPath, projectFolderName);

            Directory.CreateDirectory(projectFolderPath);

            // Projekt-spezifische Unterordner erstellen
            var projectSubfolders = new[]
            {
                "Contracts",
                "Invoices",
                "Images",
                "Videos",
                "Documents",
                "Assets"
            };

            foreach (var folder in projectSubfolders)
            {
                Directory.CreateDirectory(Path.Combine(projectFolderPath, folder));
            }

            return projectFolderPath;
        }
    }
}