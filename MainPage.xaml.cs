using Microsoft.Maui.Controls;
using Microsoft.Maui.Storage;

using System.Collections.ObjectModel;
using System.Text;
using System.Text.Json;

namespace PixFrameWorkspace
{
    public partial class MainPage : ContentPage
    {
        private string _dataFilePath => AppConfig.GetCustomerDatabasePath();
        private string _toolsConfigPath => AppConfig.GetToolsConfigPath();
        private string _backupFilePath => AppConfig.GetBackupFilePath();
        private string _customersBasePath => AppConfig.Settings.FullCustomersPath;
        private int _currentCustomerNumber = 1000;
        private string _lastCreatedFolderPath = string.Empty;
        private Customer _selectedCustomer;
        private bool _isEditing = false;
        
        public ObservableCollection<AppTool> ActiveTools { get; } = new ObservableCollection<AppTool>();

        public ObservableCollection<Customer> Customers { get; } = new ObservableCollection<Customer>();
        public ObservableCollection<Customer> FilteredCustomers { get; } = new ObservableCollection<Customer>();

        public MainPage()
        {
            InitializeComponent();
            BindingContext = this;

            // Daten laden
            LoadCustomers();
            UpdateCustomerNumberDisplay();
            CreateBackup();

            // Initialen Button-Status setzen
            UpdateSaveButtonState();

            // Tools laden
            LoadActiveTools();
        }

        public class AppTool
        {
            public string Name { get; set; } = string.Empty;
            public string ProcessName { get; set; } = string.Empty;
            public string WindowsPath { get; set; } = string.Empty;
            public string MacPath { get; set; } = string.Empty;
        }

        private void LoadCustomers()
        {
            Customers.Clear();
            FilteredCustomers.Clear();

            try
            {
                if (File.Exists(_dataFilePath))
                {
                    var lines = File.ReadAllLines(_dataFilePath);

                    // Header überspringen (erste Zeile)
                    for (int i = 1; i < lines.Length; i++)
                    {
                        var line = lines[i];
                        var parts = line.Split(',');

                        // Jetzt 12 Spalten (11 Daten + FolderPath)
                        if (parts.Length >= 12)
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

                            Customers.Add(customer);
                            FilteredCustomers.Add(customer);

                            // Höchste Kundennummer aktualisieren
                            if (customer.CustomerNumber >= _currentCustomerNumber)
                            {
                                _currentCustomerNumber = customer.CustomerNumber + 1;
                            }
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

                            Customers.Add(customer);
                            FilteredCustomers.Add(customer);

                            if (customer.CustomerNumber >= _currentCustomerNumber)
                            {
                                _currentCustomerNumber = customer.CustomerNumber + 1;
                            }
                        }
                    }
                }

                UpdateCustomerCount();
                CustomersListView.ItemsSource = FilteredCustomers;
            }
            catch (Exception ex)
            {
                StatusLabel.Text = $"Fehler beim Laden: {ex.Message}";
            }
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

        private void UpdateCustomerCount()
        {
            CustomerCountLabel.Text = $"{FilteredCustomers.Count} von {Customers.Count} Kunden";
        }

        // SUCHFUNKTIONALITÄT
        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            FilterCustomers(e.NewTextValue);
        }

        private void OnClearSearchClicked(object sender, EventArgs e)
        {
            SearchEntry.Text = string.Empty;
            FilterCustomers(string.Empty);
        }

        private void FilterCustomers(string searchText)
        {
            FilteredCustomers.Clear();

            if (string.IsNullOrWhiteSpace(searchText))
            {
                // Alle Kunden anzeigen
                foreach (var customer in Customers)
                {
                    FilteredCustomers.Add(customer);
                }
            }
            else
            {
                // Gefilterte Kunden anzeigen
                var searchLower = searchText.ToLower();
                foreach (var customer in Customers)
                {
                    if (customer.FirstName.ToLower().Contains(searchLower) ||
                        customer.LastName.ToLower().Contains(searchLower) ||
                        customer.Company.ToLower().Contains(searchLower) ||
                        customer.Email.ToLower().Contains(searchLower) ||
                        customer.City.ToLower().Contains(searchLower) ||
                        customer.CustomerNumber.ToString().Contains(searchText))
                    {
                        FilteredCustomers.Add(customer);
                    }
                }
            }

            UpdateCustomerCount();
        }

        // KUNDENAUSWAHL
        private async void OnCustomerSelected(object sender, SelectedItemChangedEventArgs e)
        {
            if (e.SelectedItem is Customer selectedCustomer)
            {
                _selectedCustomer = selectedCustomer;
                _isEditing = true;

                // Zur Projekte-Seite navigieren statt Formular zu füllen
                await Navigation.PushAsync(new ProjectsPage(selectedCustomer));

                StatusLabel.Text = $"Kunde {selectedCustomer.CustomerNumber} ausgewählt";
                StatusLabel.TextColor = Colors.Blue;
            }
        }

        private void LoadCustomerIntoForm(Customer customer)
        {
            CustomerNumberLabel.Text = customer.CustomerNumber.ToString();
            FirstNameEntry.Text = customer.FirstName;
            LastNameEntry.Text = customer.LastName;
            CompanyEntry.Text = customer.Company;
            EmailEntry.Text = customer.Email;
            PhoneEntry.Text = customer.Phone;
            StreetEntry.Text = customer.Street;
            HouseNumberEntry.Text = customer.HouseNumber;
            ZipCodeEntry.Text = customer.ZipCode;
            CityEntry.Text = customer.City;
            VatIdEntry.Text = customer.VatId;
        }

        private string GetCustomerFolderPath(Customer customer)
        {
            return GetCustomerFolderPath(customer.CustomerNumber, customer.LastName, customer.FirstName);
        }

        private string GetCustomerFolderPath(int customerNumber, string lastName, string firstName)
        {
            // NEUE STRUKTUR: C_1001 statt Kunde_1001_Nachname_Vorname
            string folderName = $"C_{customerNumber}";
            return Path.Combine(_customersBasePath, folderName);
        }

        private void UpdateCustomerNumberDisplay()
        {
            CustomerNumberLabel.Text = _currentCustomerNumber.ToString();
        }

        // NEUE METHODE: Aktualisiert den Zustand des Speichern-Buttons
        private void UpdateSaveButtonState()
        {
            if (_isEditing && _selectedCustomer != null)
            {
                // Bearbeitungsmodus - Button zeigt "Aktualisieren"
                SaveButton.Text = "Aktualisieren";
                SaveButton.BackgroundColor = Colors.Orange;
            }
            else
            {
                // Neuer Kunde - Button zeigt "Speichern"
                SaveButton.Text = "Speichern";
                SaveButton.BackgroundColor = Colors.Green;
            }
        }

        private async void OnSaveButtonClicked(object sender, EventArgs e)
        {
            if (!ValidateInputs()) return;

            try
            {
                if (_isEditing && _selectedCustomer != null)
                {
                    // UPDATE EXISTING CUSTOMER
                    UpdateExistingCustomer();
                }
                else
                {
                    // CREATE NEW CUSTOMER
                    CreateNewCustomer();
                }
            }
            catch (Exception ex)
            {
                StatusLabel.Text = $"Fehler: {ex.Message}";
                StatusLabel.TextColor = Colors.Red;
            }
        }

        private void RewriteCompleteCsvFile()
        {
            var lines = new List<string>
            {
            // NEUER HEADER MIT ORDNERPFAAD
            "Kundennummer,Vorname,Nachname,Firma,Email,Telefon,Straße,Hausnummer,PLZ,Ort,UStID,OrdnerPfad"
            };

            foreach (var customer in Customers)
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
                          $"{EscapeCsvField(customer.VatId)}," +
                          $"{EscapeCsvField(customer.FolderPath)}"; // NEUE SPALTE
                lines.Add(line);
            }

            File.WriteAllLines(_dataFilePath, lines, Encoding.UTF8);
        }

        private void CreateNewCustomer()
        {
            // Speichere die Kundennummer für den neuen Kunden
            int newCustomerNumber = _currentCustomerNumber;

            // Kundenordner erstellen
            string customerFolderPath = CreateCustomerFolder();

            var csvLine = $"{newCustomerNumber}," +
                         $"{EscapeCsvField(FirstNameEntry.Text)}," +
                         $"{EscapeCsvField(LastNameEntry.Text)}," +
                         $"{EscapeCsvField(CompanyEntry.Text)}," +
                         $"{EscapeCsvField(EmailEntry.Text)}," +
                         $"{EscapeCsvField(PhoneEntry.Text)}," +
                         $"{EscapeCsvField(StreetEntry.Text)}," +
                         $"{EscapeCsvField(HouseNumberEntry.Text)}," +
                         $"{EscapeCsvField(ZipCodeEntry.Text)}," +
                         $"{EscapeCsvField(CityEntry.Text)}," +
                         $"{EscapeCsvField(VatIdEntry.Text)}," +
                         $"{EscapeCsvField(customerFolderPath)}"; // NEUE SPALTE

            if (!File.Exists(_dataFilePath))
            {
                // Header mit neuer Spalte
                File.WriteAllText(_dataFilePath, "Kundennummer,Vorname,Nachname,Firma,Email,Telefon,Straße,Hausnummer,PLZ,Ort,UStID,OrdnerPfad\n", Encoding.UTF8);
            }

            File.AppendAllText(_dataFilePath, csvLine + "\n", Encoding.UTF8);
            CreateBackup();

            // Kundennummer für nächsten Kunden erhöhen
            _currentCustomerNumber++;

            // Daten neu laden
            LoadCustomers();

            // Den soeben erstellten Kunden in der ListView auswählen
            SelectNewCustomerInListView(newCustomerNumber);

            StatusLabel.Text = $"Kunde {newCustomerNumber} gespeichert und geladen!";
            StatusLabel.TextColor = Colors.Green;

            _lastCreatedFolderPath = customerFolderPath;
            OpenFolderButton.IsEnabled = true;
        }

        // NEUE METHODE: Selektiert den neuen Kunden in der ListView
        private void SelectNewCustomerInListView(int customerNumber)
        {
            var newCustomer = FilteredCustomers.FirstOrDefault(c => c.CustomerNumber == customerNumber);
            if (newCustomer != null)
            {
                // Wähle den neuen Kunden in der ListView aus
                CustomersListView.SelectedItem = newCustomer;

                // Stelle sicher, dass der ausgewählte Kunden sichtbar ist
                CustomersListView.ScrollTo(newCustomer, ScrollToPosition.MakeVisible, false);
            }
        }

        private void UpdateExistingCustomer()
        {
            // Aktualisiere den ausgewählten Kunden
            _selectedCustomer.FirstName = FirstNameEntry.Text;
            _selectedCustomer.LastName = LastNameEntry.Text;
            _selectedCustomer.Company = CompanyEntry.Text;
            _selectedCustomer.Email = EmailEntry.Text;
            _selectedCustomer.Phone = PhoneEntry.Text;
            _selectedCustomer.Street = StreetEntry.Text;
            _selectedCustomer.HouseNumber = HouseNumberEntry.Text;
            _selectedCustomer.ZipCode = ZipCodeEntry.Text;
            _selectedCustomer.City = CityEntry.Text;
            _selectedCustomer.VatId = VatIdEntry.Text;

            // NEU: Ordnerpfad aktualisieren (falls sich Name geändert hat)
            string newFolderPath = GetCustomerFolderPath(_selectedCustomer);
            if (_selectedCustomer.FolderPath != newFolderPath)
            {
                // Ordner umbenennen, falls Pfad sich geändert hat
                if (Directory.Exists(_selectedCustomer.FolderPath) && !Directory.Exists(newFolderPath))
                {
                    Directory.Move(_selectedCustomer.FolderPath, newFolderPath);
                }
                _selectedCustomer.FolderPath = newFolderPath;
            }

            // Schreibe komplette CSV neu
            RewriteCompleteCsvFile();

            // Aktualisiere Kundeninfo im Ordner
            UpdateCustomerInfoFile(_selectedCustomer);

            // Backup erstellen
            CreateBackup();

            // UI aktualisieren
            LoadCustomers();

            // Den aktualisierten Kunden wieder auswählen
            var updatedCustomer = FilteredCustomers.FirstOrDefault(c => c.CustomerNumber == _selectedCustomer.CustomerNumber);
            if (updatedCustomer != null)
            {
                CustomersListView.SelectedItem = updatedCustomer;
                _lastCreatedFolderPath = updatedCustomer.FolderPath;
                OpenFolderButton.IsEnabled = Directory.Exists(_lastCreatedFolderPath);
            }

            StatusLabel.Text = $"Kunde {_selectedCustomer.CustomerNumber} aktualisiert!";
            StatusLabel.TextColor = Colors.Green;
        }

        private void UpdateCustomerInfoFile(Customer customer)
        {
            string customerFolderPath = GetCustomerFolderPath(customer);
            if (Directory.Exists(customerFolderPath))
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
                                   $"Aktualisiert am: {DateTime.Now:dd.MM.yyyy HH:mm}\n\n" +
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
        }

        private bool ValidateInputs()
        {
            if (string.IsNullOrWhiteSpace(FirstNameEntry.Text) ||
                string.IsNullOrWhiteSpace(LastNameEntry.Text) ||
                string.IsNullOrWhiteSpace(EmailEntry.Text) ||
                string.IsNullOrWhiteSpace(PhoneEntry.Text) ||
                string.IsNullOrWhiteSpace(StreetEntry.Text) ||
                string.IsNullOrWhiteSpace(HouseNumberEntry.Text) ||
                string.IsNullOrWhiteSpace(ZipCodeEntry.Text) ||
                string.IsNullOrWhiteSpace(CityEntry.Text))
            {
                StatusLabel.Text = "Bitte alle Pflichtfelder (*) ausfüllen!";
                StatusLabel.TextColor = Colors.Red;
                return false;
            }

            if (!EmailEntry.Text.Contains("@") || !EmailEntry.Text.Contains("."))
            {
                StatusLabel.Text = "Bitte gültige E-Mail eingeben!";
                StatusLabel.TextColor = Colors.Red;
                return false;
            }

            return true;
        }

        private void CreateBackup()
        {
            try
            {
                if (File.Exists(_dataFilePath))
                {
                    File.Copy(_dataFilePath, _backupFilePath, overwrite: true);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Backup-Fehler: {ex.Message}");
            }
        }

        private void OnClearButtonClicked(object sender, EventArgs e)
        {
            ClearEntries();
            ResetEditMode();
            StatusLabel.Text = "Bereit für neuen Kunden";
            StatusLabel.TextColor = Colors.Blue;
        }

        private void ResetEditMode()
        {
            _isEditing = false;
            _selectedCustomer = null;
            CustomersListView.SelectedItem = null;
            OpenFolderButton.IsEnabled = false; // Button deaktivieren

            // Button-Status zurücksetzen
            UpdateSaveButtonState();

            // Kundennummer für neuen Kunden anzeigen
            UpdateCustomerNumberDisplay();
        }

        private async void OnOpenFolderButtonClicked(object sender, EventArgs e)
        {
            if (!string.IsNullOrEmpty(_lastCreatedFolderPath) && Directory.Exists(_lastCreatedFolderPath))
            {
                try
                {
                    // Warte auf das Öffnen des Ordners
                    bool success = await Launcher.Default.OpenAsync(new OpenFileRequest
                    {
                        File = new ReadOnlyFile(_lastCreatedFolderPath)
                    });

                    if (!success)
                    {
                        // Fallback mit await
                        await OpenFolderPlatformSpecific(_lastCreatedFolderPath);
                    }
                }
                catch (Exception ex)
                {
                    // Fallback mit await
                    await OpenFolderPlatformSpecific(_lastCreatedFolderPath);
                }
            }
            else
            {
                await DisplayAlert("Ordner nicht gefunden",
                                  "Der Kundenordner existiert nicht oder wurde gelöscht.", "OK");
            }
        }

        // Hilfsmethode für plattformspezifisches Öffnen
        private async Task OpenFolderPlatformSpecific(string folderPath)
        {
            try
            {
                if (DeviceInfo.Platform == DevicePlatform.WinUI)
                {
                    // Windows - kein await nötig da synchron
                    System.Diagnostics.Process.Start("explorer", $"\"{folderPath}\"");
                }
                else if (DeviceInfo.Platform == DevicePlatform.MacCatalyst)
                {
                    // macOS - kein await nötig da synchron
                    System.Diagnostics.Process.Start("open", $"\"{folderPath}\"");
                }
                else
                {
                    // Andere Plattformen - zeige den Pfad an (mit await)
                    await DisplayAlert("Kunden-Ordner",
                                      $"Ordner-Pfad:\n{folderPath}", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler",
                                  $"Ordner konnte nicht geöffnet werden:\n{ex.Message}", "OK");
            }
        }
        
        private async void OnSettingsButtonClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new SettingsPage());
        }

        private string CreateCustomerFolder()
        {
            string customerFolderName = $"C_{_currentCustomerNumber}";
            string customerFolderPath = Path.Combine(_customersBasePath, customerFolderName);

            try
            {
                Directory.CreateDirectory(customerFolderPath);
                CreateSubfolders(customerFolderPath);
                CreateCustomerInfoFile(customerFolderPath);
                return customerFolderPath;
            }
            catch (Exception ex)
            {
                throw new Exception($"Ordner-Erstellung fehlgeschlagen: {ex.Message}");
            }
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

        private void CreateMediaSubfolderReadme(string folderPath, string mediaType)
        {
            string readmePath = Path.Combine(folderPath, "README.txt");

            string readmeContent = mediaType switch
            {
                "Bilder" => "Bilder und Grafiken\n- Fotos\n- Logos\n- Icons\n- Screenshots\n- Formate: JPG, PNG, GIF, SVG",
                "Videos" => "Video-Projekte und Clips\n- Rohmaterial\n- Fertige Videos\n- Animationen\n- Formate: MP4, MOV, AVI",
                "Audio" => "Audio-Dateien\n- Sprachaufnahmen\n- Musik\n- Soundeffekte\n- Formate: MP3, WAV, WMA",
                "Präsentationen" => "Präsentationen\n- PowerPoint Dateien\n- PDF-Präsentationen\n- Keynote Dateien",
                _ => $"Medien-Unterordner: {mediaType}"
            };

            File.WriteAllText(readmePath, readmeContent, Encoding.UTF8);
        }

        private void CreateFolderReadme(string folderPath, string folderName)
        {
            string readmePath = Path.Combine(folderPath, "README.txt");

            string readmeContent = folderName switch
            {
                "01_Projekte" => "In diesem Ordner werden alle Projektdateien gespeichert.\n- Projektpläne\n- Zeitpläne\n- Projektberichte\n- Arbeitsdateien",
                "02_Rechnungen" => "Rechnungen-Verwaltung\n- 'Eingang/' für erhaltene Rechnungen\n- 'Ausgang/' für gestellte Rechnungen",
                "03_Vertraege" => "Verträge und rechtliche Dokumente\n- Dienstleistungsverträge\n- NDAs\n- Rahmenvereinbarungen",
                "04_Korrespondenz" => "Kommunikation mit dem Kunden\n- E-Mail Exporte\n- Briefe\n- Gesprächsprotokolle",
                "05_Medien" => "Medien aller Art\n- Fotos und Bilder\n- Videos und Animationen\n- Audiodateien\n- Logos und Grafiken\n- Präsentationen",
                "06_Sonstiges" => "Diverse Dateien\n- Notizen\n- Temporäre Dateien\n- Verschiedenes",
                "07_Dokumente" => "Wichtige Dokumente\n- Formulare\n- Zertifikate\n- Nachweise",
                "08_Angebote" => "Angebote und Kostenvoranschläge\n- Angebots-PDFs\n- Kalkulationen\n- Preislisten",
                _ => $"Ordner: {folderName}\nHier können Sie relevante Dateien speichern."
            };

            File.WriteAllText(readmePath, readmeContent, Encoding.UTF8);
        }

        private void CreateCustomerInfoFile(string customerFolderPath)
        {
            string infoFilePath = Path.Combine(customerFolderPath, "Kundeninfo.txt");
            string infoContent = $"KUNDENINFORMATION\n" +
                               $"================\n" +
                               $"Kundennummer: {_currentCustomerNumber}\n" +
                               $"Name: {FirstNameEntry.Text} {LastNameEntry.Text}\n" +
                               $"Firma: {(string.IsNullOrEmpty(CompanyEntry.Text) ? "n/a" : CompanyEntry.Text)}\n" +
                               $"E-Mail: {EmailEntry.Text}\n" +
                               $"Telefon: {PhoneEntry.Text}\n" +
                               $"Adresse: {StreetEntry.Text} {HouseNumberEntry.Text}, {ZipCodeEntry.Text} {CityEntry.Text}\n" +
                               $"USt-ID: {(string.IsNullOrEmpty(VatIdEntry.Text) ? "n/a" : VatIdEntry.Text)}\n" +
                               $"Erstellt am: {DateTime.Now:dd.MM.yyyy HH:mm}\n\n" +
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

        private string EscapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field)) return "";
            if (field.Contains(",") || field.Contains("\"") || field.Contains("\n"))
            {
                return $"\"{field.Replace("\"", "\"\"")}\"";
            }
            return field;
        }

        private void ClearEntries()
        {
            UpdateCustomerNumberDisplay();
            FirstNameEntry.Text = string.Empty;
            LastNameEntry.Text = string.Empty;
            CompanyEntry.Text = string.Empty;
            EmailEntry.Text = string.Empty;
            PhoneEntry.Text = string.Empty;
            StreetEntry.Text = string.Empty;
            HouseNumberEntry.Text = string.Empty;
            ZipCodeEntry.Text = string.Empty;
            CityEntry.Text = string.Empty;
            VatIdEntry.Text = string.Empty;
            FirstNameEntry.Focus();
        }
        private void LoadActiveTools()
        {
            ActiveTools.Clear();

            try
            {
                if (File.Exists(_toolsConfigPath))
                {
                    var json = File.ReadAllText(_toolsConfigPath);
                    var toolsConfig = JsonSerializer.Deserialize<Dictionary<string, bool>>(json);

                    if (toolsConfig != null)
                    {
                        var allTools = GetAllAvailableTools();

                        foreach (var tool in allTools)
                        {
                            if (toolsConfig.GetValueOrDefault(tool.Name, false))
                            {
                                ActiveTools.Add(tool);
                            }
                        }
                    }
                }

                // UI anpassen basierend auf vorhandenen Tools
                NoToolsLabel.IsVisible = ActiveTools.Count == 0;
                ToolsFlexLayout.IsVisible = ActiveTools.Count > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Laden der Tools: {ex.Message}");
            }
        }

        private List<AppTool> GetAllAvailableTools()
        {
            return new List<AppTool>
        {
            new AppTool {
                Name = "Photoshop",
                ProcessName = "photoshop",
                WindowsPath = @"C:\Program Files\Adobe\Adobe Photoshop 2023\Photoshop.exe",
                MacPath = "/Applications/Adobe Photoshop 2023/Adobe Photoshop 2023.app"
            },
            new AppTool {
                Name = "Lightroom",
                ProcessName = "lightroom",
                WindowsPath = @"C:\Program Files\Adobe\Adobe Lightroom Classic\Lightroom.exe",
                MacPath = "/Applications/Adobe Lightroom Classic/Adobe Lightroom Classic.app"
            },
            new AppTool {
                Name = "GIMP",
                ProcessName = "gimp",
                WindowsPath = @"C:\Program Files\GIMP 2\bin\gimp-2.10.exe",
                MacPath = "/Applications/GIMP-2.10.app/Contents/MacOS/gimp"
            },
            new AppTool {
                Name = "DaVinci Resolve",
                ProcessName = "resolve",
                WindowsPath = @"C:\Program Files\Blackmagic Design\DaVinci Resolve\Resolve.exe",
                MacPath = "/Applications/DaVinci Resolve/DaVinci Resolve.app"
            },
            new AppTool {
                Name = "iMovie",
                ProcessName = "iMovie",
                WindowsPath = "", // iMovie ist nur auf Mac
                MacPath = "/Applications/iMovie.app"
            },
            new AppTool {
                Name = "Premiere Pro",
                ProcessName = "adobe premiere pro",
                WindowsPath = @"C:\Program Files\Adobe\Adobe Premiere Pro 2023\Adobe Premiere Pro.exe",
                MacPath = "/Applications/Adobe Premiere Pro 2023/Adobe Premiere Pro 2023.app"
            },
            new AppTool {
                Name = "Final Cut Pro",
                ProcessName = "final cut pro",
                WindowsPath = "", // Final Cut Pro ist nur auf Mac
                MacPath = "/Applications/Final Cut Pro.app"
            },
            new AppTool {
                Name = "Affinity Photo",
                ProcessName = "affinity photo",
                WindowsPath = @"C:\Program Files\Affinity\Affinity Photo 2\Photo.exe",
                MacPath = "/Applications/Affinity Photo 2.app"
            },
            new AppTool {
                Name = "Capture One",
                ProcessName = "capture one",
                WindowsPath = @"C:\Program Files\Capture One\Capture One.exe",
                MacPath = "/Applications/Capture One/Capture One.app"
            },
            new AppTool {
                Name = "Camerabag",
                ProcessName = "camerabag photo",
                WindowsPath = @"C:\Program Files\Camerabag Photo\Camerabag Photo.exe",
                MacPath = "/Applications/Camerabag Photo.app"
            }
        };
        }

        private async void OnToolButtonClicked(object sender, EventArgs e)
        {
            if (sender is Button button && button.BindingContext is AppTool tool)
            {
                try
                {
                    bool success = await StartApplication(tool);

                    if (success)
                    {
                        StatusLabel.Text = $"{tool.Name} wird gestartet...";
                        StatusLabel.TextColor = Colors.Green;
                    }
                    else
                    {
                        StatusLabel.Text = $"{tool.Name} konnte nicht gestartet werden";
                        StatusLabel.TextColor = Colors.Orange;
                    }
                }
                catch (Exception ex)
                {
                    await DisplayAlert("Fehler", $"{tool.Name} starten fehlgeschlagen:\n{ex.Message}", "OK");
                }
            }
        }

        private async Task<bool> StartApplication(AppTool tool)
        {
            try
            {
                string processPath = "";

                if (DeviceInfo.Platform == DevicePlatform.WinUI)
                {
                    processPath = tool.WindowsPath;

                    // Fallback: Versuche über Process Name
                    if (string.IsNullOrEmpty(processPath) || !File.Exists(processPath))
                    {
                        return await TryStartByProcessName(tool.ProcessName);
                    }
                }
                else if (DeviceInfo.Platform == DevicePlatform.MacCatalyst)
                {
                    processPath = tool.MacPath;

                    // Fallback: Versuche über Process Name
                    if (string.IsNullOrEmpty(processPath) || !File.Exists(processPath))
                    {
                        return await TryStartByProcessName(tool.ProcessName);
                    }
                }

                // Versuche direkt mit dem Pfad zu starten
                if (!string.IsNullOrEmpty(processPath) && File.Exists(processPath))
                {
                    System.Diagnostics.Process.Start(processPath);
                    return true;
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> TryStartByProcessName(string processName)
        {
            try
            {
                if (DeviceInfo.Platform == DevicePlatform.WinUI)
                {
                    System.Diagnostics.Process.Start(processName);
                    return true;
                }
                else if (DeviceInfo.Platform == DevicePlatform.MacCatalyst)
                {
                    // Auf macOS verwenden wir 'open -a' für Applications
                    System.Diagnostics.Process.Start("open", $"-a \"{processName}\"");
                    return true;
                }

                return false;
            }
            catch
            {
                // Letzter Versuch: Benutzer nach Pfad fragen
                return await AskUserForApplicationPath(processName);
            }
        }

        private async Task<bool> AskUserForApplicationPath(string appName)
        {
            bool answer = await DisplayAlert("Tool nicht gefunden",
                $"{appName} wurde nicht automatisch gefunden. Möchten Sie den Pfad manuell auswählen?",
                "Ja", "Nein");

            if (answer)
            {
                var fileResult = await FilePicker.Default.PickAsync(new PickOptions
                {
                    PickerTitle = $"Wählen Sie {appName} aus",
                    FileTypes = new FilePickerFileType(
                        new Dictionary<DevicePlatform, IEnumerable<string>>
                        {
                        { DevicePlatform.WinUI, new[] { ".exe" } },
                        { DevicePlatform.MacCatalyst, new[] { ".app" } }
                        })
                });

                if (fileResult != null)
                {
                    // Hier könntest du den Pfad speichern für zukünftige Verwendung
                    System.Diagnostics.Process.Start(fileResult.FullPath);
                    return true;
                }
            }

            return false;
        }

        // Beim Zurückkommen von der Einstellungsseite Tools neu laden
        protected override void OnAppearing()
        {
            base.OnAppearing();
            LoadActiveTools();
        }

       
    }

}