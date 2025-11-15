using System.Text.Json;

namespace PixFrameWorkspace
{
    public static class AppConfig
    {
        private static string _configFilePath;
        private static AppSettings _settings;

        static AppConfig()
        {
            // Zuerst Standardpfade setzen um Konfigurationspfad zu bestimmen
            _settings = new AppSettings();

            // Konfigurationsdatei jetzt im Data-Verzeichnis des Workspace
            _configFilePath = Path.Combine(_settings.FullDataPath, "pixframe_config.json");
            LoadSettings();
        }

        public static AppSettings Settings => _settings;

        public class AppSettings
        {
            public string WorkspacePath { get; set; } = GetDefaultWorkspacePath();

            // Unterordner-Struktur innerhalb des Workspace
            public string DataPath { get; set; } = "Data";           // Für Kundendatenbank und Konfiguration
            public string BackupPath { get; set; } = "Backup";       // Für Backups
            public string ArchivePath { get; set; } = "Archive";     // Für Archivierung
            public string CustomersPath { get; set; } = "Customers"; // Für Kundenordner

            // Vollständige Pfade (werden automatisch generiert)
            public string FullDataPath => Path.Combine(WorkspacePath, DataPath);
            public string FullBackupPath => Path.Combine(WorkspacePath, BackupPath);
            public string FullArchivePath => Path.Combine(WorkspacePath, ArchivePath);
            public string FullCustomersPath => Path.Combine(WorkspacePath, CustomersPath);

            // Dateinamen
            public string CustomerDatabaseFile => "Customer.csv";
            public string ToolsConfigFile => "tools_config.json";
            public string AppConfigFile => "pixframe_config.json";
        }

        private static string GetDefaultWorkspacePath()
        {
            string documentsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            return Path.Combine(documentsPath, "PixFrameWorkspace");
        }

        private static void LoadSettings()
        {
            try
            {
                // Stelle sicher, dass das Data-Verzeichnis existiert
                Directory.CreateDirectory(_settings.FullDataPath);

                if (File.Exists(_configFilePath))
                {
                    var json = File.ReadAllText(_configFilePath);
                    var loadedSettings = JsonSerializer.Deserialize<AppSettings>(json);

                    if (loadedSettings != null)
                    {
                        _settings = loadedSettings;

                        // Aktualisiere den Konfigurationspfad basierend auf den geladenen Einstellungen
                        _configFilePath = Path.Combine(_settings.FullDataPath, _settings.AppConfigFile);
                    }
                }
                else
                {
                    // Erstelle Standard-Konfiguration
                    SaveSettings();
                }

                // Verzeichnisse erstellen
                EnsureDirectories();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Laden der Konfiguration: {ex.Message}");
                // Behalte Standard-Einstellungen bei Fehler
            }
        }

        public static void SaveSettings()
        {
            try
            {
                // Stelle sicher, dass das Data-Verzeichnis existiert
                Directory.CreateDirectory(_settings.FullDataPath);

                var options = new JsonSerializerOptions { WriteIndented = true };
                var json = JsonSerializer.Serialize(_settings, options);
                File.WriteAllText(_configFilePath, json);

                // Verzeichnisse erneut erstellen (falls Pfade geändert wurden)
                EnsureDirectories();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Speichern der Konfiguration: {ex.Message}");
            }
        }

        private static void EnsureDirectories()
        {
            try
            {
                Directory.CreateDirectory(_settings.FullDataPath);
                Directory.CreateDirectory(_settings.FullBackupPath);
                Directory.CreateDirectory(_settings.FullArchivePath);
                Directory.CreateDirectory(_settings.FullCustomersPath);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Erstellen der Verzeichnisse: {ex.Message}");
            }
        }

        // Methode zum Aktualisieren der Einstellungen
        public static void UpdateSettings(Action<AppSettings> updateAction)
        {
            updateAction(_settings);
            SaveSettings();
        }

        // Hilfsmethoden für häufig verwendete Dateipfade
        public static string GetCustomerDatabasePath() => Path.Combine(_settings.FullDataPath, _settings.CustomerDatabaseFile);
        public static string GetToolsConfigPath() => Path.Combine(_settings.FullDataPath, _settings.ToolsConfigFile);
        public static string GetBackupFilePath() => Path.Combine(_settings.FullBackupPath, _settings.CustomerDatabaseFile);
        public static string GetAppConfigPath() => Path.Combine(_settings.FullDataPath, _settings.AppConfigFile);
    }
}