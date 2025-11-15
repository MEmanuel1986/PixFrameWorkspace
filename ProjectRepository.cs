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

                        if (parts.Length >= 9)
                        {
                            var project = new Project
                            {
                                ProjectId = int.Parse(parts[0]),
                                CustomerNumber = int.Parse(parts[1]),
                                ProjectName = UnescapeCsvField(parts[2]),
                                Description = UnescapeCsvField(parts[3]),
                                CreatedDate = DateTime.Parse(parts[4]),
                                Deadline = string.IsNullOrEmpty(parts[5]) ? null : DateTime.Parse(parts[5]),
                                Status = UnescapeCsvField(parts[6]),
                                ProjectFolderPath = UnescapeCsvField(parts[7]),
                                Notes = UnescapeCsvField(parts[8])
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
                    "ProjectId,CustomerNumber,ProjectName,Description,CreatedDate,Deadline,Status,ProjectFolderPath,Notes"
                };

                foreach (var project in _projects)
                {
                    var line = $"{project.ProjectId}," +
                              $"{project.CustomerNumber}," +
                              $"{EscapeCsvField(project.ProjectName)}," +
                              $"{EscapeCsvField(project.Description)}," +
                              $"{project.CreatedDate:yyyy-MM-dd HH:mm:ss}," +
                              $"{(project.Deadline.HasValue ? project.Deadline.Value.ToString("yyyy-MM-dd HH:mm:ss") : "")}," +
                              $"{EscapeCsvField(project.Status)}," +
                              $"{EscapeCsvField(project.ProjectFolderPath)}," +
                              $"{EscapeCsvField(project.Notes)}";
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

        // IN PROJECTREPOSITORY.CS - AM ENDE DER KLasse EINFÜGEN:

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