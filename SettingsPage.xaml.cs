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
using CsvHelper.Configuration;
using System.Diagnostics;

namespace PixFrameWorkspace
{
    public partial class SettingsPage : ContentPage
    {
        private string _dataFilePath => AppConfig.GetCustomerDatabasePath();
        private string _toolsConfigPath => AppConfig.GetToolsConfigPath();
        private string _backupFilePath => AppConfig.GetBackupFilePath();
        private string _customersBasePath => AppConfig.Settings.FullCustomersPath;
        private string _archivePath => AppConfig.Settings.FullArchivePath;
        private string _workspaceBasePath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "PixFrameWorkspace");
        private string _dataFolderPath => Path.Combine(_workspaceBasePath, "Data");
        private string _projectsFilePath => Path.Combine(_dataFolderPath, "projects.csv");

        public SettingsPage()
        {
            InitializeComponent();

            // Verzögerte Initialisierung um UI-Problem zu vermeiden
            Dispatcher.DispatchDelayed(TimeSpan.FromMilliseconds(100), () =>
            {
                LoadStatistics();
                LoadToolsConfiguration();
            });
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            Debug.WriteLine("=== SettingsPage OnAppearing ===");
            CheckForOldData();

            // Statistiken neu laden wenn Seite erscheint
            LoadStatistics();
        }

        #region STATISTIKEN
        private void LoadStatistics()
        {
            try
            {
                Debug.WriteLine("=== DEBUG: Starte LoadStatistics ===");

                // Sofortige UI-Updates
                CustomerCountLabel.Text = "Lade...";
                NextCustomerNumberLabel.Text = "Lade...";

                // Pfad-Informationen
                string actualDataPath = _dataFilePath;
                Debug.WriteLine($"CSV-Pfad: {actualDataPath}");
                Debug.WriteLine($"Datei existiert: {File.Exists(actualDataPath)}");

                if (!File.Exists(actualDataPath))
                {
                    Debug.WriteLine("FEHLER: CSV-Datei existiert nicht!");
                    UpdateStatisticsUI(0, 1000, 0, 0, 0);
                    return;
                }

                // Kunden aus CSV laden
                var customers = SimpleLoadCustomers();
                int customerCount = customers.Count;

                Debug.WriteLine($"DEBUG: {customerCount} Kunden geladen");

                // Nächste Kundennummer
                int nextCustomerNumber = CalculateNextCustomerNumber(customers);
                Debug.WriteLine($"DEBUG: Nächste Kundennummer: {nextCustomerNumber}");

                // Projekte zählen
                int projectCount = SimpleLoadProjectCount();

                // Größen berechnen
                long databaseSize = CalculateDatabaseSize();
                long mediaDocumentsSize = CalculateMediaSize();

                // UI aktualisieren
                UpdateStatisticsUI(customerCount, nextCustomerNumber, projectCount, databaseSize, mediaDocumentsSize);

                Debug.WriteLine($"=== DEBUG: LoadStatistics abgeschlossen ===");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"FEHLER in LoadStatistics: {ex.Message}");
                Debug.WriteLine($"StackTrace: {ex.StackTrace}");

                // Fallback-Werte setzen
                UpdateStatisticsUI(0, 1000, 0, 0, 0);

                // Fehler anzeigen
                Dispatcher.Dispatch(async () =>
                {
                    await DisplayAlert("Fehler", $"Statistiken konnten nicht geladen werden: {ex.Message}", "OK");
                });
            }
        }

        private List<Customer> SimpleLoadCustomers()
        {
            var customers = new List<Customer>();

            try
            {
                string csvPath = _dataFilePath;
                if (!File.Exists(csvPath))
                {
                    Debug.WriteLine("CSV-Datei nicht gefunden: " + csvPath);
                    return customers;
                }

                Debug.WriteLine("=== CSV-INHALT ===");
                var allLines = File.ReadAllLines(csvPath, Encoding.UTF8);
                Debug.WriteLine($"Anzahl Zeilen: {allLines.Length}");

                if (allLines.Length > 0)
                {
                    Debug.WriteLine($"Header: {allLines[0]}");
                }

                for (int i = 1; i < allLines.Length; i++)
                {
                    try
                    {
                        string line = allLines[i];
                        Debug.WriteLine($"Zeile {i}: {line}");

                        // Einfache Aufteilung
                        string[] fields = line.Split(',');

                        if (fields.Length >= 1)
                        {
                            var customer = new Customer();

                            // Kundennummer
                            if (int.TryParse(fields[0].Trim().Trim('\"'), out int customerNumber))
                            {
                                customer.CustomerNumber = customerNumber;
                                Debug.WriteLine($"Kundennummer erkannt: {customerNumber}");
                            }
                            else
                            {
                                Debug.WriteLine($"FEHLER: Kundennummer nicht parsbar: '{fields[0]}'");
                                continue;
                            }

                            // Einfache Feldzuordnung
                            if (fields.Length > 1) customer.FirstName = fields[1].Trim().Trim('\"');
                            if (fields.Length > 2) customer.LastName = fields[2].Trim().Trim('\"');
                            if (fields.Length > 3) customer.Company = fields[3].Trim().Trim('\"');
                            if (fields.Length > 4) customer.Email = fields[4].Trim().Trim('\"');
                            if (fields.Length > 5) customer.Phone = fields[5].Trim().Trim('\"');
                            if (fields.Length > 6) customer.Street = fields[6].Trim().Trim('\"');
                            if (fields.Length > 7) customer.HouseNumber = fields[7].Trim().Trim('\"');
                            if (fields.Length > 8) customer.ZipCode = fields[8].Trim().Trim('\"');
                            if (fields.Length > 9) customer.City = fields[9].Trim().Trim('\"');
                            if (fields.Length > 10) customer.VatId = fields[10].Trim().Trim('\"');
                            if (fields.Length > 11) customer.FolderPath = fields[11].Trim().Trim('\"');

                            customers.Add(customer);
                            Debug.WriteLine($"Erfolg: Kunde {customer.CustomerNumber} geladen: {customer.FirstName} {customer.LastName}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"Fehler in Zeile {i}: {ex.Message}");
                    }
                }

                Debug.WriteLine($"=== SIMPLE LOAD: {customers.Count} Kunden geladen ===");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"FEHLER in SimpleLoadCustomers: {ex.Message}");
            }

            return customers;
        }

        private void UpdateStatisticsUI(int customerCount, int nextCustomerNumber, int projectCount, long databaseSize, long mediaSize)
        {
            // UI-Update muss im Main Thread erfolgen
            Dispatcher.Dispatch(() =>
            {
                try
                {
                    CustomerCountLabel.Text = customerCount.ToString();
                    NextCustomerNumberLabel.Text = nextCustomerNumber.ToString();
                    ProjectCountLabel.Text = projectCount.ToString();
                    DatabaseSizeLabel.Text = FormatFileSize(databaseSize);
                    MediaSizeLabel.Text = FormatFileSize(mediaSize);

                    // VOLLSTÄNDIGER PFAD statt gekürzt
                    DatabasePathLabel.Text = _workspaceBasePath;

                    Debug.WriteLine($"UI Update: Kunden={customerCount}, NächsteNr={nextCustomerNumber}");
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Fehler beim UI-Update: {ex.Message}");
                }
            });
        }

        private int CalculateNextCustomerNumber(List<Customer> customers)
        {
            try
            {
                if (customers == null || !customers.Any())
                {
                    Debug.WriteLine("DEBUG: Keine Kunden, gebe 1000 zurück");
                    return 1000;
                }

                // Finde die höchste Kundennummer
                int maxCustomerNumber = customers.Max(c => c.CustomerNumber);
                int nextNumber = maxCustomerNumber + 1;

                Debug.WriteLine($"DEBUG CalculateNextCustomerNumber: Max={maxCustomerNumber}, Next={nextNumber}");
                return nextNumber;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler in CalculateNextCustomerNumber: {ex.Message}");
                return 1000 + (customers?.Count ?? 0);
            }
        }

        private int SimpleLoadProjectCount()
        {
            try
            {
                if (!File.Exists(_projectsFilePath))
                    return 0;

                var lines = File.ReadAllLines(_projectsFilePath);
                return Math.Max(0, lines.Length - 1);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Laden der Projekte: {ex.Message}");
                return 0;
            }
        }

        private long CalculateDatabaseSize()
        {
            try
            {
                if (!Directory.Exists(_dataFolderPath))
                    return 0;

                long size = 0;
                var csvFiles = Directory.GetFiles(_dataFolderPath, "*.csv");
                foreach (var file in csvFiles)
                {
                    var fileInfo = new FileInfo(file);
                    if (fileInfo.Exists)
                    {
                        size += fileInfo.Length;
                    }
                }
                return size;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Berechnen der DB-Größe: {ex.Message}");
                return 0;
            }
        }

        private long CalculateMediaSize()
        {
            try
            {
                if (!Directory.Exists(_customersBasePath))
                    return 0;

                return CalculateDirectorySize(_customersBasePath);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Berechnen der Media-Größe: {ex.Message}");
                return 0;
            }
        }

        private long CalculateDirectorySize(string directoryPath)
        {
            long size = 0;
            try
            {
                if (!Directory.Exists(directoryPath))
                    return 0;

                foreach (string file in Directory.GetFiles(directoryPath, "*", SearchOption.AllDirectories))
                {
                    try
                    {
                        var fileInfo = new FileInfo(file);
                        if (fileInfo.Exists)
                        {
                            size += fileInfo.Length;
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"Fehler beim Lesen der Datei {file}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Berechnen der Verzeichnisgröße: {ex.Message}");
            }
            return size;
        }

        private string FormatFileSize(long bytes)
        {
            if (bytes == 0) return "0 B";

            string[] suffixes = { "B", "KB", "MB", "GB", "TB" };
            int counter = 0;
            decimal number = bytes;

            while (Math.Round(number / 1024) >= 1)
            {
                number /= 1024;
                counter++;
                if (counter == suffixes.Length - 1) break;
            }

            return $"{number:n1} {suffixes[counter]}";
        }
        #endregion

        #region ORDNER FUNKTIONEN
        private async void OnOpenDatabaseFolderButtonClicked(object sender, EventArgs e)
        {
            try
            {
                // Öffne den Workspace-Ordner (Dokumente\PixFrameWorkspace)
                if (Directory.Exists(_workspaceBasePath))
                {
                    bool success = await OpenFolder(_workspaceBasePath);
                    if (!success)
                    {
                        // Fallback: Zeige Pfad an
                        await DisplayAlert("Info",
                            $"Workspace-Ordner:\n{_workspaceBasePath}",
                            "OK");
                    }
                }
                else
                {
                    await DisplayAlert("Info",
                        "Workspace-Ordner existiert noch nicht. Er wird beim ersten Speichern automatisch erstellt.",
                        "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler",
                    $"Ordner konnte nicht geöffnet werden: {ex.Message}",
                    "OK");
            }
        }

        private async Task<bool> OpenFolder(string folderPath)
        {
            try
            {
                if (DeviceInfo.Platform == DevicePlatform.WinUI)
                {
                    // Windows: Explorer öffnen und Ordner auswählen
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"\"{folderPath}\"",
                        UseShellExecute = true
                    });
                    return true;
                }
                else if (DeviceInfo.Platform == DevicePlatform.MacCatalyst)
                {
                    // macOS: Finder öffnen
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "open",
                        Arguments = $"\"{folderPath}\"",
                        UseShellExecute = true
                    });
                    return true;
                }
                else
                {
                    // Fallback für andere Plattformen
                    await Launcher.Default.OpenAsync($"file://{folderPath}");
                    return true;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Öffnen des Ordners: {ex.Message}");
                return false;
            }
        }
        #endregion

        #region TOOLS KONFIGURATION
        private void LoadToolsConfiguration()
        {
            try
            {
                if (File.Exists(_toolsConfigPath))
                {
                    var json = File.ReadAllText(_toolsConfigPath);
                    var toolsConfig = JsonSerializer.Deserialize<Dictionary<string, bool>>(json);

                    if (toolsConfig != null)
                    {
                        // Checkboxen setzen
                        PhotoshopCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Photoshop", false);
                        LightroomCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Lightroom", false);
                        GimpCheckBox.IsChecked = toolsConfig.GetValueOrDefault("GIMP", false);
                        AffinityPhotoCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Affinity Photo", false);
                        DavinciResolveCheckBox.IsChecked = toolsConfig.GetValueOrDefault("DaVinci Resolve", false);
                        IMovieCheckBox.IsChecked = toolsConfig.GetValueOrDefault("iMovie", false);
                        PremiereProCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Premiere Pro", false);
                        FinalCutProCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Final Cut Pro", false);
                        CaptureOneCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Capture One", false);
                        CamerabagCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Camerabag", false);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Fehler beim Laden der Tools-Konfiguration: {ex.Message}");
            }
        }

        private async void OnSaveToolsButtonClicked(object sender, EventArgs e)
        {
            try
            {
                var toolsConfig = new Dictionary<string, bool>
                {
                    ["Photoshop"] = PhotoshopCheckBox.IsChecked,
                    ["Lightroom"] = LightroomCheckBox.IsChecked,
                    ["GIMP"] = GimpCheckBox.IsChecked,
                    ["Affinity Photo"] = AffinityPhotoCheckBox.IsChecked,
                    ["DaVinci Resolve"] = DavinciResolveCheckBox.IsChecked,
                    ["iMovie"] = IMovieCheckBox.IsChecked,
                    ["Premiere Pro"] = PremiereProCheckBox.IsChecked,
                    ["Final Cut Pro"] = FinalCutProCheckBox.IsChecked,
                    ["Capture One"] = CaptureOneCheckBox.IsChecked,
                    ["Camerabag"] = CamerabagCheckBox.IsChecked
                };

                var json = JsonSerializer.Serialize(toolsConfig, new JsonSerializerOptions { WriteIndented = true });

                // Tools-Config Ordner sicherstellen
                var toolsDir = Path.GetDirectoryName(_toolsConfigPath);
                if (!Directory.Exists(toolsDir))
                {
                    Directory.CreateDirectory(toolsDir);
                }

                File.WriteAllText(_toolsConfigPath, json, Encoding.UTF8);

                await DisplayAlert("Erfolg", "Tool-Konfiguration wurde gespeichert!", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Speichern fehlgeschlagen: {ex.Message}", "OK");
            }
        }
        #endregion

        #region JSON EXPORT & IMPORT
        private async void OnExportJsonButtonClicked(object sender, EventArgs e)
        {
            try
            {
                var customers = SimpleLoadCustomers();
                if (customers.Count == 0)
                {
                    await DisplayAlert("Export", "Keine Kundendaten zum Exportieren vorhanden.", "OK");
                    return;
                }

                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                string jsonData = JsonSerializer.Serialize(customers, options);

                // Export-Pfad im Workspace-Ordner
                string exportDir = Path.Combine(_workspaceBasePath, "Exports");
                if (!Directory.Exists(exportDir))
                {
                    Directory.CreateDirectory(exportDir);
                }

                string exportPath = Path.Combine(exportDir, $"kunden_export_{DateTime.Now:yyyyMMdd_HHmmss}.json");
                File.WriteAllText(exportPath, jsonData, Encoding.UTF8);

                await DisplayAlert("Export erfolgreich",
                    $"Kundendaten wurden als JSON exportiert:\n{exportPath}", "OK");

                LoadStatistics(); // Statistiken neu laden wegen neuer Datei
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Export fehlgeschlagen: {ex.Message}", "OK");
            }
        }

        private async void OnImportJsonButtonClicked(object sender, EventArgs e)
        {
            try
            {
                var fileResult = await FilePicker.Default.PickAsync(new PickOptions
                {
                    PickerTitle = "JSON-Datei auswählen",
                    FileTypes = new FilePickerFileType(
                        new Dictionary<DevicePlatform, IEnumerable<string>>
                        {
                            { DevicePlatform.WinUI, new[] { ".json" } },
                            { DevicePlatform.MacCatalyst, new[] { ".json" } }
                        })
                });

                if (fileResult == null) return;

                string jsonData = File.ReadAllText(fileResult.FullPath, Encoding.UTF8);
                var customers = JsonSerializer.Deserialize<List<Customer>>(jsonData);

                if (customers == null || customers.Count == 0)
                {
                    await DisplayAlert("Import", "Keine gültigen Kundendaten in der Datei gefunden.", "OK");
                    return;
                }

                bool answer = await DisplayAlert("Import bestätigen",
                    $"Möchten Sie {customers.Count} Kunden importieren?\n\n" +
                    "Existierende Daten werden nicht überschrieben.",
                    "Ja, importieren", "Abbrechen");

                if (!answer) return;

                // Bestehende Kundennummern ermitteln
                var existingCustomers = SimpleLoadCustomers();
                var existingCustomerNumbers = new HashSet<int>(existingCustomers.Select(c => c.CustomerNumber));

                // Neue Kunden filtern (keine Duplikate)
                var newCustomers = customers.Where(c => !existingCustomerNumbers.Contains(c.CustomerNumber)).ToList();

                if (newCustomers.Count == 0)
                {
                    await DisplayAlert("Import", "Alle Kunden in der Importdatei existieren bereits.", "OK");
                    return;
                }

                // CSV-Header falls Datei nicht existiert
                if (!File.Exists(_dataFilePath))
                {
                    File.WriteAllText(_dataFilePath, "CustomerNumber,FirstName,LastName,Company,Email,Phone,Street,HouseNumber,ZipCode,City,VatId,FolderPath\n", Encoding.UTF8);
                }

                // Neue Kunden zur CSV hinzufügen
                foreach (var customer in newCustomers)
                {
                    var csvLine = $"{customer.CustomerNumber}," +
                                 $"{EscapeCsvField(customer.FirstName)}," +
                                 $"{EscapeCsvField(customer.LastName)}," +
                                 $"{EscapeCsvField(customer.Company)}," +
                                 $"{EscapeCsvField(customer.Email)}," +
                                 $"{EscapeCsvField(customer.Phone)}," +
                                 $"{EscapeCsvField(customer.Street)}," +
                                 $"{EscapeCsvField(customer.HouseNumber)}," +
                                 $"{EscapeCsvField(customer.ZipCode)}," +
                                 $"{EscapeCsvField(customer.City)}," +
                                 $"{EscapeCsvField(customer.VatId)}," +
                                 $"{EscapeCsvField(customer.FolderPath)}";

                    File.AppendAllText(_dataFilePath, csvLine + "\n", Encoding.UTF8);
                }

                await DisplayAlert("Import erfolgreich",
                    $"{newCustomers.Count} von {customers.Count} Kunden wurden importiert.\n\n" +
                    $"{customers.Count - newCustomers.Count} Kunden wurden übersprungen (bereits vorhanden).", "OK");

                LoadStatistics();
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Import fehlgeschlagen: {ex.Message}", "OK");
            }
        }
        #endregion

        #region HILFSMETHODEN
        private string EscapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field)) return "";
            if (field.Contains(",") || field.Contains("\"") || field.Contains("\n"))
            {
                return $"\"{field.Replace("\"", "\"\"")}\"";
            }
            return field;
        }

        private void CheckForOldData()
        {
            string oldDataPath = Path.Combine(FileSystem.AppDataDirectory, "Customer.csv");
            string oldConfigPath = Path.Combine(FileSystem.AppDataDirectory, "tools_config.json");

            if (File.Exists(oldDataPath) || File.Exists(oldConfigPath))
            {
                // Kein Popup mehr automatisch - der Benutzer kann selbst entscheiden
                Debug.WriteLine("Alte Daten für Migration gefunden");
            }
        }
        #endregion
    }
}