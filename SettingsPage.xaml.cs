using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Maui.Controls;

namespace PixFrameWorkspace
{
    public partial class SettingsPage : ContentPage
    {
        private string _dataFilePath => AppConfig.GetCustomerDatabasePath();
        private string _toolsConfigPath => AppConfig.GetToolsConfigPath();
        private string _backupFilePath => AppConfig.GetBackupFilePath();
        private string _customersBasePath => AppConfig.Settings.FullCustomersPath;
        private string _archivePath => AppConfig.Settings.FullArchivePath;

        public SettingsPage()
        {
            InitializeComponent();

            // NEUE PFADE: Alles unter Dokumente\PixFrameWorkspace
            string workspacePath = GetWorkspaceBasePath();
            
            // Statistiken laden
            LoadStatistics();

            // Tools-Konfiguration laden
            LoadToolsConfiguration();
        }

        private string GetWorkspaceBasePath()
        {
            string documentsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string workspacePath = Path.Combine(documentsPath, "PixFrameWorkspace");

            // Erstelle alle benötigten Unterordner
            Directory.CreateDirectory(Path.Combine(workspacePath, "Data"));
            Directory.CreateDirectory(Path.Combine(workspacePath, "BackUp"));
            Directory.CreateDirectory(Path.Combine(workspacePath, "Kunden"));

            return workspacePath;
        }

        private void LoadStatistics()
        {
            try
            {
                // Anzahl Kunden zählen
                int customerCount = 0;
                int nextCustomerNumber = 1000;
                long databaseSize = 0;
                long backupSize = 0;
                long totalFoldersSize = 0;

                if (File.Exists(_dataFilePath))
                {
                    var lines = File.ReadAllLines(_dataFilePath);
                    customerCount = Math.Max(0, lines.Length - 1); // Header abziehen

                    // Datenbank-Größe berechnen
                    databaseSize = new FileInfo(_dataFilePath).Length;

                    // Nächste Kundennummer finden
                    if (lines.Length > 1)
                    {
                        var lastLine = lines[^1];
                        var parts = lastLine.Split(',');
                        if (parts.Length > 0 && int.TryParse(parts[0], out int lastNumber))
                        {
                            nextCustomerNumber = lastNumber + 1;
                        }
                    }
                }

                // Backup-Größe berechnen
                if (File.Exists(_backupFilePath))
                {
                    backupSize = new FileInfo(_backupFilePath).Length;
                }

                // Ordner-Größe berechnen (nur wenn der Pfad existiert)
                if (Directory.Exists(_customersBasePath))
                {
                    totalFoldersSize = CalculateDirectorySize(_customersBasePath);
                }

                // Labels aktualisieren
                CustomerCountLabel.Text = customerCount.ToString();
                NextCustomerNumberLabel.Text = nextCustomerNumber.ToString();
                DatabaseSizeLabel.Text = FormatFileSize(databaseSize);
                BackupSizeLabel.Text = FormatFileSize(backupSize);
                TotalFoldersSizeLabel.Text = FormatFileSize(totalFoldersSize);

                // Pfad-Button Text setzen (gekürzte Anzeige)
                string shortPath = _dataFilePath.Length > 50
                    ? "..." + _dataFilePath.Substring(_dataFilePath.Length - 47)
                    : _dataFilePath;
                DatabasePathLabel.Text = _dataFilePath;
            }
            catch (Exception ex)
            {
                DisplayAlert("Fehler", $"Statistiken konnten nicht geladen werden: {ex.Message}", "OK");
            }
        }

        // Hilfsmethode zur Berechnung der Verzeichnisgröße
        private long CalculateDirectorySize(string directoryPath)
        {
            long size = 0;
            try
            {
                // Alle Dateien im aktuellen Verzeichnis
                foreach (string file in Directory.GetFiles(directoryPath))
                {
                    try
                    {
                        var fileInfo = new FileInfo(file);
                        size += fileInfo.Length;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Fehler beim Lesen der Datei {file}: {ex.Message}");
                    }
                }

                // Rekursiv Unterverzeichnisse durchsuchen
                foreach (string subDirectory in Directory.GetDirectories(directoryPath))
                {
                    try
                    {
                        size += CalculateDirectorySize(subDirectory);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Fehler beim Lesen des Verzeichnisses {subDirectory}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Berechnen der Verzeichnisgröße: {ex.Message}");
            }

            return size;
        }

        // Hilfsmethode zur Formatierung der Dateigröße
        private string FormatFileSize(long bytes)
        {
            string[] suffixes = { "B", "KB", "MB", "GB", "TB" };
            int counter = 0;
            decimal number = bytes;

            while (Math.Round(number / 1024) >= 1)
            {
                number /= 1024;
                counter++;
            }

            return $"{number:n1} {suffixes[counter]}";
        }

        // BACKUP FUNKTION
        private async void OnBackupButtonClicked(object sender, EventArgs e)
        {
            try
            {
                if (File.Exists(_dataFilePath))
                {
                    File.Copy(_dataFilePath, _backupFilePath, overwrite: true);
                    await DisplayAlert("Backup",
                        $"Backup wurde erfolgreich erstellt!\n\nPfad: {_backupFilePath}",
                        "OK");

                    // Statistiken neu laden um Backup-Größe zu aktualisieren
                    LoadStatistics();
                }
                else
                {
                    await DisplayAlert("Backup", "Keine Kundendaten zum Backup vorhanden.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Backup fehlgeschlagen: {ex.Message}", "OK");
            }
        }

        // UPDATE KUNDENMODELL
        private async void OnUpdateModelButtonClicked(object sender, EventArgs e)
        {
            bool answer = await DisplayAlert("Kundenmodell aktualisieren",
                "Möchten Sie für alle bestehenden Kunden Ordner erstellen?\n\n" +
                "Dies wird für jeden Kunden einen Ordner mit der Standard-Struktur anlegen.",
                "Ja, fortfahren", "Abbrechen");

            if (!answer) return;

            try
            {
                int createdFolders = 0;
                var customers = LoadCustomersFromCsv();

                foreach (var customer in customers)
                {
                    string customerFolderPath = GetCustomerFolderPath(customer);

                    if (!Directory.Exists(customerFolderPath))
                    {
                        Directory.CreateDirectory(customerFolderPath);
                        CreateSubfolders(customerFolderPath);
                        CreateCustomerInfoFile(customerFolderPath, customer);
                        createdFolders++;
                    }
                }

                await DisplayAlert("Erfolg",
                    $"{createdFolders} Kundenordner wurden erstellt.",
                    "OK");

                LoadStatistics(); // Statistiken aktualisieren
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler",
                    $"Update fehlgeschlagen: {ex.Message}",
                    "OK");
            }
        }

        // DATENBANK-ORDNER ÖFFNEN - OHNE POPUP
        private async void OnOpenDatabaseFolderButtonClicked(object sender, EventArgs e)
        {
            try
            {
                // Der AppData-Ordner, wo die CSV-Datei gespeichert ist
                string databaseFolder = FileSystem.AppDataDirectory;

                if (Directory.Exists(databaseFolder))
                {
                    bool success = await OpenFolder(databaseFolder);

                    // Kein Popup mehr bei Erfolg - nur im Fehlerfall
                    if (!success)
                    {
                        // Fallback: Pfad anzeigen
                        await DisplayAlert("Info",
                            $"Datenbank-Ordner konnte nicht geöffnet werden:\n{databaseFolder}\n\n" +
                            $"Datei: {Path.GetFileName(_dataFilePath)}",
                            "OK");
                    }
                }
                else
                {
                    await DisplayAlert("Fehler",
                        "Datenbank-Ordner existiert nicht.",
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

        // Hilfsmethode zum Öffnen von Ordnern (plattformübergreifend)
        private async Task<bool> OpenFolder(string folderPath)
        {
            try
            {
                if (DeviceInfo.Platform == DevicePlatform.WinUI)
                {
                    // Windows: Explorer öffnen
                    System.Diagnostics.Process.Start("explorer", folderPath);
                    return true;
                }
                else if (DeviceInfo.Platform == DevicePlatform.MacCatalyst)
                {
                    // macOS: Finder öffnen
                    System.Diagnostics.Process.Start("open", folderPath);
                    return true;
                }
                else
                {
                    // Fallback für andere Plattformen
                    var result = await Launcher.Default.OpenAsync($"file://{folderPath}");
                    return result;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Öffnen des Ordners: {ex.Message}");
                return false;
            }
        }

        // DATENBANK LÖSCHEN
        private async void OnDeleteDatabaseButtonClicked(object sender, EventArgs e)
        {
            bool answer = await DisplayAlert("⚠️ Alle Kundendaten löschen",
                "MÖCHTEN SIE WIRKLICH ALLE KUNDENDATEN LÖSCHEN?\n\n" +
                "• CSV-Datei mit allen Kundendaten wird gelöscht\n" +
                "• Backup-Datei wird gelöscht\n" +
                "• Kundenordner bleiben erhalten\n" +
                "• Diese Aktion kann nicht rückgängig gemacht werden!",
                "JA, LÖSCHEN", "Abbrechen");

            if (!answer) return;

            try
            {
                // CSV-Datei löschen
                if (File.Exists(_dataFilePath))
                {
                    File.Delete(_dataFilePath);
                }

                // Backup-Datei löschen
                if (File.Exists(_backupFilePath))
                {
                    File.Delete(_backupFilePath);
                }

                await DisplayAlert("Erfolg",
                    "Alle Kundendaten wurden gelöscht.\n\nDie Kundenordner bleiben erhalten.",
                    "OK");

                LoadStatistics(); // Statistiken aktualisieren
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler",
                    $"Löschen fehlgeschlagen: {ex.Message}",
                    "OK");
            }
        }

        // ORDNER LÖSCHEN
        private async void OnDeleteFoldersButtonClicked(object sender, EventArgs e)
        {
            bool answer = await DisplayAlert("⚠️ Alle Kundenordner löschen",
                "MÖCHTEN SIE WIRKLICH ALLE KUNDENORDNER LÖSCHEN?\n\n" +
                "• Alle Kundenordner werden gelöscht\n" +
                "• Kundendaten (CSV) bleiben erhalten\n" +
                "• Diese Aktion kann nicht rückgängig gemacht werden!",
                "JA, LÖSCHEN", "Abbrechen");

            if (!answer) return;

            try
            {
                int deletedFolders = 0;

                if (Directory.Exists(_customersBasePath))
                {
                    var customerFolders = Directory.GetDirectories(_customersBasePath);

                    foreach (var folder in customerFolders)
                    {
                        Directory.Delete(folder, recursive: true);
                        deletedFolders++;
                    }
                }

                await DisplayAlert("Erfolg",
                    $"{deletedFolders} Kundenordner wurden gelöscht.\n\nDie Kundendaten (CSV) bleiben erhalten.",
                    "OK");

                LoadStatistics();
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler",
                    $"Löschen fehlgeschlagen: {ex.Message}",
                    "OK");
            }
        }

        // ALLES LÖSCHEN
        private async void OnDeleteAllButtonClicked(object sender, EventArgs e)
        {
            bool answer = await DisplayAlert("💥 ALLES LÖSCHEN",
                "SIND SIE SICH ABSOLUT SICHER?\n\n" +
                "• Alle Kundendaten (CSV) werden gelöscht\n" +
                "• Alle Kundenordner werden gelöscht\n" +
                "• Backup wird gelöscht\n" +
                "• ALLES WIRD KOMPLETT ENTFERNT!\n\n" +
                "Diese Aktion kann nicht rückgängig gemacht werden!",
                "JA, ALLES LÖSCHEN", "Abbrechen");

            if (!answer) return;

            // Zweite Sicherheitsabfrage
            bool finalAnswer = await DisplayAlert("LETZTE BESTÄTIGUNG",
                "Sind Sie sich zu 100% sicher? ALLE DATEN WERDEN UNWIEDERBRINGLICH GELÖSCHT!",
                "JA, ICH BIN MIR SICHER", "NEIN, ABBRECHEN");

            if (!finalAnswer) return;

            try
            {
                int deletedFolders = 0;

                // CSV und Backup löschen
                if (File.Exists(_dataFilePath)) File.Delete(_dataFilePath);
                if (File.Exists(_backupFilePath)) File.Delete(_backupFilePath);

                // Ordner löschen
                if (Directory.Exists(_customersBasePath))
                {
                    var customerFolders = Directory.GetDirectories(_customersBasePath);
                    deletedFolders = customerFolders.Length;

                    foreach (var folder in customerFolders)
                    {
                        Directory.Delete(folder, recursive: true);
                    }
                }

                await DisplayAlert("Erfolg",
                    $"Alles wurde gelöscht:\n• {deletedFolders} Kundenordner\n• Kundendatenbank\n• Backup",
                    "OK");

                LoadStatistics();
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler",
                    $"Löschen fehlgeschlagen: {ex.Message}",
                    "OK");
            }
        }

        private string GetCustomerFolderPath(int customerNumber, string lastName, string firstName)
        {
            // NEUE STRUKTUR: C_1001
            string folderName = $"C_{customerNumber}";
            return Path.Combine(_customersBasePath, folderName);
        }

        // HILFSMETHODEN
        private List<Customer> LoadCustomersFromCsv()
        {
            var customers = new List<Customer>();

            if (File.Exists(_dataFilePath))
            {
                var lines = File.ReadAllLines(_dataFilePath, Encoding.UTF8);

                for (int i = 1; i < lines.Length; i++) // Header überspringen
                {
                    var line = lines[i];
                    var parts = line.Split(',');

                    if (parts.Length >= 12) // Jetzt 12 Spalten
                    {
                        var customer = new Customer
                        {
                            CustomerNumber = int.Parse(parts[0]),
                            FirstName = UnescapeCsvField(parts[1]),
                            LastName = UnescapeCsvField(parts[2]),
                            Company = UnescapeCsvField(parts[3]),
                            Email = UnescapeCsvField(parts[4]),
                            Phone = UnescapeCsvField(parts[5]),
                            Street = UnescapeCsvField(parts[6]),
                            HouseNumber = UnescapeCsvField(parts[7]),
                            ZipCode = UnescapeCsvField(parts[8]),
                            City = UnescapeCsvField(parts[9]),
                            VatId = UnescapeCsvField(parts[10]),
                            FolderPath = UnescapeCsvField(parts[11]) // NEUE SPALTE
                        };
                        customers.Add(customer);
                    }
                    else if (parts.Length >= 11)
                    {
                        // Fallback für alte CSV ohne FolderPath
                        var customer = new Customer
                        {
                            CustomerNumber = int.Parse(parts[0]),
                            FirstName = UnescapeCsvField(parts[1]),
                            LastName = UnescapeCsvField(parts[2]),
                            Company = UnescapeCsvField(parts[3]),
                            Email = UnescapeCsvField(parts[4]),
                            Phone = UnescapeCsvField(parts[5]),
                            Street = UnescapeCsvField(parts[6]),
                            HouseNumber = UnescapeCsvField(parts[7]),
                            ZipCode = UnescapeCsvField(parts[8]),
                            City = UnescapeCsvField(parts[9]),
                            VatId = UnescapeCsvField(parts[10]),
                            FolderPath = GetCustomerFolderPath(int.Parse(parts[0]), UnescapeCsvField(parts[2]), UnescapeCsvField(parts[1]))
                        };
                        customers.Add(customer);
                    }
                }
            }

            return customers;
        }

        private string UnescapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field)) return string.Empty;

            if (field.StartsWith("\"") && field.EndsWith("\""))
            {
                field = field.Substring(1, field.Length - 2);
                field = field.Replace("\"\"", "\"");
            }
            return field;
        }

        private string EscapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field)) return "";
            if (field.Contains(",") || field.Contains("\"") || field.Contains("\n"))
            {
                return $"\"{field.Replace("\"", "\"\"")}\"";
            }
            return field;
        }

        private string GetCustomerFolderPath(Customer customer)
        {
            string folderName = $"Kunde_{customer.CustomerNumber}_{customer.LastName}_{customer.FirstName}";
            foreach (char invalidChar in Path.GetInvalidFileNameChars())
            {
                folderName = folderName.Replace(invalidChar, '_');
            }
            return Path.Combine(_customersBasePath, folderName);
        }

        private void CreateSubfolders(string customerFolderPath)
        {
            var subfolders = new[]
            {
                "01_Projects",      // Hier werden die Projektordner angelegt
                "02_Miscellaneous", // Allgemeine Dateien zum Kunden
                "03_Finance"        // Finanzdokumente (nicht projektgebunden)
            };

            foreach (var folder in subfolders)
            {
                string fullPath = Path.Combine(customerFolderPath, folder);
                Directory.CreateDirectory(fullPath);
            }
        }

        private void CreateCustomerInfoFile(string customerFolderPath, Customer customer)
        {
            string infoFilePath = Path.Combine(customerFolderPath, "Kundeninfo.txt");
            string infoContent = $"KUNDENINFORMATION\n" +
                               $"================\n" +
                               $"Kundennummer: {customer.CustomerNumber}\n" +
                               $"Name: {customer.FirstName} {customer.LastName}\n" +
                               $"Firma: {(string.IsNullOrEmpty(customer.Company) ? "n/a" : customer.Company)}\n" +
                               $"E-Mail: {customer.Email}\n" +
                               $"Telefon: {customer.Phone}\n" +
                               $"Adresse: {customer.Street} {customer.HouseNumber}, {customer.ZipCode} {customer.City}\n" +
                               $"USt-ID: {(string.IsNullOrEmpty(customer.VatId) ? "n/a" : customer.VatId)}\n" +
                               $"Nachträglich erstellt am: {DateTime.Now:dd.MM.yyyy HH:mm}\n\n" +
                               $"ORDNERSTRUKTUR:\n" +
                               $"01_Projekte/     - Alle Projektdateien\n" +
                               $"02_Rechnungen/   - Rechnungen (Eingang/Ausgang)\n" +
                               $"03_Vertraege/    - Verträge und Vereinbarungen\n" +
                               $"04_Korrespondenz/- E-Mails, Briefe, Kommunikation\n" +
                               $"05_Medien/       - Fotos, Videos, Grafiken, Präsentationen\n" +
                               $"06_Sonstiges/    - Diverse Dateien\n" +
                               $"07_Dokumente/    - Wichtige Dokumente\n" +
                               $"08_Angebote/     - Angebote und Kostenvoranschläge";

            File.WriteAllText(infoFilePath, infoContent, Encoding.UTF8);
        }

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
                        AffinityPhotoCheckBox.IsChecked = toolsConfig.GetValueOrDefault("AffinityPhoto", false);
                        DavinciResolveCheckBox.IsChecked = toolsConfig.GetValueOrDefault("DaVinciResolve", false);
                        IMovieCheckBox.IsChecked = toolsConfig.GetValueOrDefault("iMovie", false);
                        PremiereProCheckBox.IsChecked = toolsConfig.GetValueOrDefault("PremierePro", false);
                        FinalCutProCheckBox.IsChecked = toolsConfig.GetValueOrDefault("FinalCutPro", false);
                        CaptureOneCheckBox.IsChecked = toolsConfig.GetValueOrDefault("CaptureOne", false);
                        CamerabagCheckBox.IsChecked = toolsConfig.GetValueOrDefault("Camerabag", false);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Laden der Tools-Konfiguration: {ex.Message}");
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
                    ["AffinityPhoto"] = AffinityPhotoCheckBox.IsChecked,
                    ["DaVinciResolve"] = DavinciResolveCheckBox.IsChecked,
                    ["iMovie"] = IMovieCheckBox.IsChecked,
                    ["PremierePro"] = PremiereProCheckBox.IsChecked,
                    ["FinalCutPro"] = FinalCutProCheckBox.IsChecked,
                    ["CaptureOne"] = CaptureOneCheckBox.IsChecked,
                    ["Camerabag"] = CamerabagCheckBox.IsChecked
                };

                var json = JsonSerializer.Serialize(toolsConfig, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_toolsConfigPath, json, Encoding.UTF8);

                await DisplayAlert("Erfolg", "Tool-Konfiguration wurde gespeichert!", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Speichern fehlgeschlagen: {ex.Message}", "OK");
            }
        }

        // JSON EXPORT
        private async void OnExportJsonButtonClicked(object sender, EventArgs e)
        {
            try
            {
                var customers = LoadCustomersFromCsv();
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

                // Export-Pfad im Dokumente-Ordner
                string exportPath = Path.Combine(_customersBasePath, $"kunden_export_{DateTime.Now:yyyyMMdd_HHmmss}.json");
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

        // JSON IMPORT
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

                // CSV-Header falls Datei nicht existiert
                if (!File.Exists(_dataFilePath))
                {
                    File.WriteAllText(_dataFilePath, "Kundennummer,Vorname,Nachname,Firma,Email,Telefon,Straße,Hausnummer,PLZ,Ort,UStID\n", Encoding.UTF8);
                }

                // Kunden zur CSV hinzufügen
                foreach (var customer in customers)
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
                                 $"{EscapeCsvField(customer.VatId)}";

                    File.AppendAllText(_dataFilePath, csvLine + "\n", Encoding.UTF8);
                }

                await DisplayAlert("Import erfolgreich",
                    $"{customers.Count} Kunden wurden importiert.", "OK");

                LoadStatistics();
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Import fehlgeschlagen: {ex.Message}", "OK");
            }
        }

        // DATEN BEREINIGEN
        private async void OnCleanDataButtonClicked(object sender, EventArgs e)
        {
            try
            {
                bool answer = await DisplayAlert("Daten bereinigen",
                    "Möchten Sie die Kundendaten bereinigen?\n\n" +
                    "Dies wird:\n" +
                    "• Doppelte Kunden entfernen\n" +
                    "• Ungültige E-Mails prüfen\n" +
                    "• Leere Datensätze entfernen",
                    "Ja, bereinigen", "Abbrechen");

                if (!answer) return;

                var customers = LoadCustomersFromCsv();
                if (customers.Count == 0)
                {
                    await DisplayAlert("Bereinigen", "Keine Kundendaten zum Bereinigen vorhanden.", "OK");
                    return;
                }

                // Doppelte Kunden entfernen (basierend auf Kundennummer)
                var uniqueCustomers = customers
                    .GroupBy(c => c.CustomerNumber)
                    .Select(g => g.First())
                    .ToList();

                // Ungültige E-Mails markieren
                var invalidEmails = uniqueCustomers
                    .Where(c => !IsValidEmail(c.Email))
                    .ToList();

                if (invalidEmails.Count > 0)
                {
                    await DisplayAlert("Ungültige E-Mails",
                        $"{invalidEmails.Count} Kunden haben ungültige E-Mail-Adressen:\n\n" +
                        string.Join("\n", invalidEmails.Select(c => $"{c.CustomerNumber}: {c.Email}")),
                        "OK");
                }

                // Bereinigte Daten speichern
                if (uniqueCustomers.Count < customers.Count || invalidEmails.Count > 0)
                {
                    // Neue CSV erstellen
                    var lines = new List<string>
                    {
                        "Kundennummer,Vorname,Nachname,Firma,Email,Telefon,Straße,Hausnummer,PLZ,Ort,UStID"
                    };

                    foreach (var customer in uniqueCustomers)
                    {
                        var line = $"{customer.CustomerNumber}," +
                                  $"{EscapeCsvField(customer.FirstName)}," +
                                  $"{EscapeCsvField(customer.LastName)}," +
                                  $"{EscapeCsvField(customer.Company)}," +
                                  $"{EscapeCsvField(customer.Email)}," +
                                  $"{EscapeCsvField(customer.Phone)}," +
                                  $"{EscapeCsvField(customer.Street)}," +
                                  $"{EscapeCsvField(customer.HouseNumber)}," +
                                  $"{EscapeCsvField(customer.ZipCode)}," +
                                  $"{EscapeCsvField(customer.City)}," +
                                  $"{EscapeCsvField(customer.VatId)}";
                        lines.Add(line);
                    }

                    // Backup der alten Datei
                    string backupPath = _dataFilePath + $".backup_{DateTime.Now:yyyyMMdd_HHmmss}";
                    File.Copy(_dataFilePath, backupPath, true);

                    // Neue Datei schreiben
                    File.WriteAllLines(_dataFilePath, lines, Encoding.UTF8);

                    int removedCount = customers.Count - uniqueCustomers.Count;
                    await DisplayAlert("Bereinigung abgeschlossen",
                        $"Daten wurden bereinigt:\n" +
                        $"{removedCount} doppelte Kunden entfernt\n" +
                        $"{invalidEmails.Count} ungültige E-Mails gefunden\n" +
                        $"Backup erstellt: {Path.GetFileName(backupPath)}",
                        "OK");
                }
                else
                {
                    await DisplayAlert("Bereinigung", "Keine Bereinigung notwendig - Daten sind bereits in Ordnung.", "OK");
                }

                LoadStatistics();
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Bereinigung fehlgeschlagen: {ex.Message}", "OK");
            }
        }

        // HILFSMETHODEN
        private bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        // Migrations-Button Handler
        private async void OnMigrationButtonClicked(object sender, EventArgs e)
        {
            bool answer = await DisplayAlert("Daten migrieren",
                "Möchten Sie vorhandene Daten auf die neue Ordnerstruktur migrieren?\n\n" +
                "Dies kopiert:\n" +
                "• Kundendaten (Customer.csv)\n" +
                "• Tools-Konfiguration (tools_config.json)\n\n" +
                "Existierende Daten werden nicht überschrieben.",
                "Ja, migrieren", "Abbrechen");

            if (!answer) return;

            try
            {
                int migratedFiles = await MigrateOldDataIfNeeded();

                if (migratedFiles > 0)
                {
                    await DisplayAlert("Migration erfolgreich",
                        $"{migratedFiles} Dateien wurden migriert.\n\n" +
                        "Die App wird jetzt neu gestartet, um die migrierten Daten zu laden.", "OK");

                    // App neu starten bzw. Daten neu laden
                    LoadStatistics();
                    LoadToolsConfiguration();

                    // Optional: MainPage neu laden
                    // await Navigation.PopAsync();
                    // await Navigation.PushAsync(new MainPage());
                }
                else
                {
                    await DisplayAlert("Migration",
                        "Keine Migration notwendig - Daten sind bereits in der neuen Struktur vorhanden.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Migration fehlgeschlagen: {ex.Message}", "OK");
            }
        }

        // Migrations-Methode (gibt Anzahl migrierter Dateien zurück)
        private async Task<int> MigrateOldDataIfNeeded()
        {
            int migratedCount = 0;

            try
            {
                string oldDataPath = Path.Combine(FileSystem.AppDataDirectory, "Customer.csv");
                string oldConfigPath = Path.Combine(FileSystem.AppDataDirectory, "tools_config.json");

                // Migriere Kundendaten, falls vorhanden
                if (File.Exists(oldDataPath) && !File.Exists(_dataFilePath))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(_dataFilePath));
                    File.Copy(oldDataPath, _dataFilePath);
                    migratedCount++;
                    Console.WriteLine("Kundendaten migriert von: " + oldDataPath);
                }

                // Migriere Tools-Konfiguration, falls vorhanden
                if (File.Exists(oldConfigPath) && !File.Exists(_toolsConfigPath))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(_toolsConfigPath));
                    File.Copy(oldConfigPath, _toolsConfigPath);
                    migratedCount++;
                    Console.WriteLine("Tools-Konfiguration migriert von: " + oldConfigPath);
                }

                return migratedCount;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Migration fehlgeschlagen: " + ex.Message);
                throw; // Wir werfen die Exception weiter, damit der Button-Handler sie abfangen kann
            }
        }

        // In der SettingsPage - prüfe beim Laden, ob alte Daten existieren
        protected override void OnAppearing()
        {
            base.OnAppearing();
            CheckForOldData();
        }

        private async void CheckForOldData()
        {
            string oldDataPath = Path.Combine(FileSystem.AppDataDirectory, "Customer.csv");
            string oldConfigPath = Path.Combine(FileSystem.AppDataDirectory, "tools_config.json");

            if (File.Exists(oldDataPath) || File.Exists(oldConfigPath))
            {
                // Alte Daten gefunden - zeige Hinweis an
                await DisplayAlert("Alte Daten gefunden",
                    "Es wurden Daten in der alten Ordnerstruktur gefunden.\n\n" +
                    "Sie können diese über 'Daten migrieren' in die neue Struktur übertragen.", "OK");
            }
        }
    }
}