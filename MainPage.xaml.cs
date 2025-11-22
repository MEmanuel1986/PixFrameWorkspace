using Microsoft.Maui.Controls;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using System.Collections.Generic;
using System.Text;

namespace PixFrameWorkspace
{
    public partial class MainPage : ContentPage
    {
        private Customer _selectedCustomer;
        private CustomerManager _customerManager;

        // ObservableCollection für Datenbindung
        public ObservableCollection<Customer> Customers { get; set; } = new ObservableCollection<Customer>();

        public MainPage()
        {
            InitializeComponent();
            BindingContext = this;

            // Manager initialisieren
            _customerManager = new CustomerManager();

            // Initialisiere die Kundenliste
            LoadCustomers();

            // Setze die nächste Kundennummer
            CustomerNumberLabel.Text = _customerManager.GetNextCustomerNumber().ToString();
        }

        // Event Handler für den Projekte-Button - MIT NAVIGATION ZUR PROJEKTSEITE
        private async void OnProjectsButtonClicked(object sender, EventArgs e)
        {
            if (_selectedCustomer == null)
            {
                await DisplayAlert("Info", "Bitte wählen Sie erst einen Kunden aus der Liste aus.", "OK");
                return;
            }

            try
            {
                StatusLabel.Text = "Öffne Projekte...";

                // Zur Projektseite navigieren und den ausgewählten Kunden übergeben
                await Navigation.PushAsync(new ProjectsPage(_selectedCustomer));

                StatusLabel.Text = $"Projekte für {_selectedCustomer.DisplayName} geöffnet";
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Öffnen der Projekte: {ex.Message}", "OK");
                StatusLabel.Text = "Fehler beim Öffnen der Projekte";
            }
        }

        // Kunden aus Liste auswählen
        private void OnCustomerSelected(object sender, SelectedItemChangedEventArgs e)
        {
            if (e.SelectedItem is Customer customer)
            {
                _selectedCustomer = customer;
                DisplayCustomerDetails(customer);

                StatusLabel.Text = $"Kunde {customer.DisplayName} ausgewählt";

                // Kunden-Ordner Button aktivieren, wenn Kunde ausgewählt ist
                OpenFolderButton.IsEnabled = true;
            }
        }

        // Kundendetails in Formular anzeigen
        private void DisplayCustomerDetails(Customer customer)
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

        // Kunden laden - MIT CSV-FUNKTIONALITÄT
        private void LoadCustomers()
        {
            try
            {
                Customers.Clear();
                var allCustomers = _customerManager.GetAllCustomers();

                foreach (var customer in allCustomers)
                {
                    Customers.Add(customer);
                }

                CustomerCountLabel.Text = $"{Customers.Count} Kunden gefunden";
                StatusLabel.Text = $"{Customers.Count} Kunden geladen";
            }
            catch (Exception ex)
            {
                StatusLabel.Text = "Fehler beim Laden der Kunden";
                DisplayAlert("Fehler", $"Fehler beim Laden der Kunden: {ex.Message}", "OK");
            }
        }

        // Suchtext geändert - KORRIGIERT
        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            var searchText = e.NewTextValue?.ToLower() ?? "";

            if (string.IsNullOrWhiteSpace(searchText))
            {
                CustomersListView.ItemsSource = Customers;
            }
            else
            {
                var filteredCustomers = Customers.Where(c =>
                    (c.FirstName?.ToLower().Contains(searchText) ?? false) ||
                    (c.LastName?.ToLower().Contains(searchText) ?? false) ||
                    (c.Company?.ToLower().Contains(searchText) ?? false) ||
                    (c.City?.ToLower().Contains(searchText) ?? false) ||
                    (c.Email?.ToLower().Contains(searchText) ?? false)
                ).ToList();

                CustomersListView.ItemsSource = filteredCustomers;
            }

            CustomerCountLabel.Text = $"{((System.Collections.IList)CustomersListView.ItemsSource).Count} Kunden gefunden";
        }

        // Suche löschen
        private void OnClearSearchClicked(object sender, EventArgs e)
        {
            SearchEntry.Text = string.Empty;
            CustomersListView.ItemsSource = Customers;
            CustomerCountLabel.Text = $"{Customers.Count} Kunden gefunden";
        }

        // Kunden speichern - MIT CSV-FUNKTIONALITÄT UND AUTOMATISCHER ORDNERERSTELLUNG
        private async void OnSaveButtonClicked(object sender, EventArgs e)
        {
            // Validiere Pflichtfelder
            if (string.IsNullOrWhiteSpace(FirstNameEntry.Text) || string.IsNullOrWhiteSpace(LastNameEntry.Text))
            {
                await DisplayAlert("Fehler", "Vorname und Nachname sind Pflichtfelder.", "OK");
                return;
            }

            if (string.IsNullOrWhiteSpace(EmailEntry.Text))
            {
                await DisplayAlert("Fehler", "E-Mail ist ein Pflichtfeld.", "OK");
                return;
            }

            try
            {
                if (_selectedCustomer == null)
                {
                    // Neuen Kunden erstellen
                    var newCustomer = new Customer
                    {
                        CustomerNumber = int.Parse(CustomerNumberLabel.Text),
                        FirstName = FirstNameEntry.Text.Trim(),
                        LastName = LastNameEntry.Text.Trim(),
                        Company = CompanyEntry.Text?.Trim() ?? "",
                        Email = EmailEntry.Text.Trim(),
                        Phone = PhoneEntry.Text?.Trim() ?? "",
                        Street = StreetEntry.Text?.Trim() ?? "",
                        HouseNumber = HouseNumberEntry.Text?.Trim() ?? "",
                        ZipCode = ZipCodeEntry.Text?.Trim() ?? "",
                        City = CityEntry.Text?.Trim() ?? "",
                        VatId = VatIdEntry.Text?.Trim() ?? ""
                    };

                    // Kunden speichern (inkl. Ordnererstellung)
                    _customerManager.SaveCustomer(newCustomer);
                    Customers.Add(newCustomer);
                    _selectedCustomer = newCustomer;

                    StatusLabel.Text = $"Kunde {newCustomer.DisplayName} gespeichert";
                    await DisplayAlert("Erfolg", "Kunde erfolgreich gespeichert", "OK");

                    // Nächste Kundennummer vorbereiten
                    CustomerNumberLabel.Text = _customerManager.GetNextCustomerNumber().ToString();
                }
                else
                {
                    // Existierenden Kunden aktualisieren
                    _selectedCustomer.FirstName = FirstNameEntry.Text.Trim();
                    _selectedCustomer.LastName = LastNameEntry.Text.Trim();
                    _selectedCustomer.Company = CompanyEntry.Text?.Trim() ?? "";
                    _selectedCustomer.Email = EmailEntry.Text.Trim();
                    _selectedCustomer.Phone = PhoneEntry.Text?.Trim() ?? "";
                    _selectedCustomer.Street = StreetEntry.Text?.Trim() ?? "";
                    _selectedCustomer.HouseNumber = HouseNumberEntry.Text?.Trim() ?? "";
                    _selectedCustomer.ZipCode = ZipCodeEntry.Text?.Trim() ?? "";
                    _selectedCustomer.City = CityEntry.Text?.Trim() ?? "";
                    _selectedCustomer.VatId = VatIdEntry.Text?.Trim() ?? "";

                    _customerManager.SaveCustomer(_selectedCustomer);

                    // ListView aktualisieren
                    var index = Customers.IndexOf(_selectedCustomer);
                    if (index != -1)
                    {
                        Customers[index] = _selectedCustomer;
                    }

                    StatusLabel.Text = $"Kunde {_selectedCustomer.DisplayName} aktualisiert";
                    await DisplayAlert("Erfolg", "Kunde erfolgreich aktualisiert", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Speichern: {ex.Message}", "OK");
            }
        }

        // Formular zurücksetzen für neuen Kunden
        private void OnClearButtonClicked(object sender, EventArgs e)
        {
            _selectedCustomer = null;

            // Formular leeren
            CustomerNumberLabel.Text = _customerManager.GetNextCustomerNumber().ToString();
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

            // Selection in ListView zurücksetzen
            CustomersListView.SelectedItem = null;
            OpenFolderButton.IsEnabled = false;

            StatusLabel.Text = "Bereit für neuen Kunden";
        }

        // Kunden-Ordner öffnen - MIT ORDNER-ERSTELLUNG
        private async void OnOpenFolderButtonClicked(object sender, EventArgs e)
        {
            if (_selectedCustomer == null)
            {
                await DisplayAlert("Info", "Bitte wählen Sie erst einen Kunden aus.", "OK");
                return;
            }

            try
            {
                StatusLabel.Text = "Öffne Kunden-Ordner...";
                var success = _customerManager.OpenCustomerFolder(_selectedCustomer);

                if (success)
                {
                    StatusLabel.Text = $"Ordner für {_selectedCustomer.DisplayName} geöffnet";
                }
                else
                {
                    StatusLabel.Text = "Fehler beim Öffnen des Ordners";
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Öffnen des Ordners: {ex.Message}", "OK");
                StatusLabel.Text = "Fehler beim Öffnen des Ordners";
            }
        }

        // Einstellungen öffnen - MIT NAVIGATION ZUR SETTINGSPAGE
        private async void OnSettingsButtonClicked(object sender, EventArgs e)
        {
            try
            {
                StatusLabel.Text = "Öffne Einstellungen...";

                // Zur SettingsPage navigieren
                await Navigation.PushAsync(new SettingsPage());

                StatusLabel.Text = "Einstellungen geöffnet";
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Öffnen der Einstellungen: {ex.Message}", "OK");
                StatusLabel.Text = "Fehler beim Öffnen der Einstellungen";
            }
        }

        // Wird aufgerufen wenn die Seite erscheint
        protected override void OnAppearing()
        {
            base.OnAppearing();
            // Stelle sicher, dass die Daten aktuell sind
            LoadCustomers();
        }
    }

    // CustomerManager MIT CSV-FUNKTIONALITÄT (OHNE CSVHELPER) - PFAD KORRIGIERT
    // UND VOLLSTÄNDIGER ORDNERERSTELLUNG FÜR KUNDEN UND PROJEKTE
    public class CustomerManager
    {
        private string _dataFolder;
        private string _csvFilePath;

        public CustomerManager()
        {
            // KORREKTUR: Geändert von "Daten" zu "Data"
            _dataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "PixFrameWorkspace", "Data");
            _csvFilePath = Path.Combine(_dataFolder, "customers.csv");

            // Stelle sicher, dass der Datenordner existiert
            Directory.CreateDirectory(_dataFolder);

            // Stelle sicher, dass die CSV-Datei existiert und einen Header hat
            EnsureCsvFileExists();
        }

        private void EnsureCsvFileExists()
        {
            if (!File.Exists(_csvFilePath))
            {
                // Erstelle die CSV-Datei mit Header
                var header = "CustomerNumber,FirstName,LastName,Company,Email,Phone,Street,HouseNumber,ZipCode,City,VatId,FolderPath";
                File.WriteAllText(_csvFilePath, header, Encoding.UTF8);
            }
        }

        public List<Customer> GetAllCustomers()
        {
            var customers = new List<Customer>();

            if (!File.Exists(_csvFilePath))
            {
                return customers;
            }

            try
            {
                var lines = File.ReadAllLines(_csvFilePath, Encoding.UTF8);
                if (lines.Length <= 1) return customers; // Nur Header oder leer

                for (int i = 1; i < lines.Length; i++) // Überspringe Header
                {
                    var fields = ParseCsvLine(lines[i]);
                    if (fields.Length >= 12) // Stelle sicher, dass alle Felder vorhanden sind
                    {
                        var customer = new Customer
                        {
                            CustomerNumber = int.TryParse(fields[0], out int cn) ? cn : 0,
                            FirstName = fields[1],
                            LastName = fields[2],
                            Company = fields[3],
                            Email = fields[4],
                            Phone = fields[5],
                            Street = fields[6],
                            HouseNumber = fields[7],
                            ZipCode = fields[8],
                            City = fields[9],
                            VatId = fields[10],
                            FolderPath = fields[11]
                        };

                        // Nur gültige Kunden hinzufügen
                        if (customer.CustomerNumber > 0 && !string.IsNullOrEmpty(customer.FirstName) && !string.IsNullOrEmpty(customer.LastName))
                        {
                            customers.Add(customer);
                        }
                    }
                    else if (fields.Length >= 11)
                    {
                        // Fallback für alte CSV ohne FolderPath
                        var customer = new Customer
                        {
                            CustomerNumber = int.TryParse(fields[0], out int cn) ? cn : 0,
                            FirstName = fields[1],
                            LastName = fields[2],
                            Company = fields[3],
                            Email = fields[4],
                            Phone = fields[5],
                            Street = fields[6],
                            HouseNumber = fields[7],
                            ZipCode = fields[8],
                            City = fields[9],
                            VatId = fields[10],
                            FolderPath = GetCustomerFolderPath(int.Parse(fields[0]), fields[2], fields[1])
                        };
                        customers.Add(customer);
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Fehler beim Lesen der Kunden: {ex.Message}");
            }

            return customers;
        }

        private string[] ParseCsvLine(string line)
        {
            var result = new List<string>();
            var current = "";
            var inQuotes = false;

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];

                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        // Doppelte Anführungszeichen (Escaped)
                        current += '"';
                        i++; // Überspringe das nächste Zeichen
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    result.Add(current);
                    current = "";
                }
                else
                {
                    current += c;
                }
            }

            result.Add(current);
            return result.ToArray();
        }

        public void SaveCustomer(Customer customer)
        {
            var allCustomers = GetAllCustomers();

            // Erstelle Kundenordner, falls noch nicht vorhanden
            if (string.IsNullOrEmpty(customer.FolderPath) || !Directory.Exists(customer.FolderPath))
            {
                customer.FolderPath = CreateCustomerFolder(customer);
            }

            // Prüfe ob Kunde bereits existiert
            var existingCustomer = allCustomers.FirstOrDefault(c => c.CustomerNumber == customer.CustomerNumber);
            if (existingCustomer != null)
            {
                // Aktualisiere existierenden Kunden
                var index = allCustomers.IndexOf(existingCustomer);
                allCustomers[index] = customer;
            }
            else
            {
                // Füge neuen Kunden hinzu
                allCustomers.Add(customer);
            }

            // Speichere alle Kunden zurück in CSV
            SaveAllCustomers(allCustomers);
        }

        public void SaveAllCustomers(List<Customer> customers)
        {
            try
            {
                var lines = new List<string>
                {
                    "CustomerNumber,FirstName,LastName,Company,Email,Phone,Street,HouseNumber,ZipCode,City,VatId,FolderPath"
                };

                foreach (var customer in customers.OrderBy(c => c.CustomerNumber))
                {
                    var line = $"{customer.CustomerNumber}," +
                              $"\"{EscapeCsvField(customer.FirstName)}\"," +
                              $"\"{EscapeCsvField(customer.LastName)}\"," +
                              $"\"{EscapeCsvField(customer.Company)}\"," +
                              $"\"{EscapeCsvField(customer.Email)}\"," +
                              $"\"{EscapeCsvField(customer.Phone)}\"," +
                              $"\"{EscapeCsvField(customer.Street)}\"," +
                              $"\"{EscapeCsvField(customer.HouseNumber)}\"," +
                              $"\"{EscapeCsvField(customer.ZipCode)}\"," +
                              $"\"{EscapeCsvField(customer.City)}\"," +
                              $"\"{EscapeCsvField(customer.VatId)}\"," +
                              $"\"{EscapeCsvField(customer.FolderPath)}\"";
                    lines.Add(line);
                }

                File.WriteAllLines(_csvFilePath, lines, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                throw new Exception($"Fehler beim Speichern der Kunden: {ex.Message}");
            }
        }

        private string EscapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field))
                return "";

            // Wenn das Feld Kommas, Zeilenumbrüche oder Anführungszeichen enthält, in Anführungszeichen setzen
            if (field.Contains(",") || field.Contains("\"") || field.Contains("\n") || field.Contains("\r"))
            {
                // Verdopple die Anführungszeichen für Escape
                field = field.Replace("\"", "\"\"");
                return field;
            }

            return field;
        }

        public int GetNextCustomerNumber()
        {
            var customers = GetAllCustomers();
            return customers.Any() ? customers.Max(c => c.CustomerNumber) + 1 : 1001;
        }

        public string GetCustomerFolderPath(int customerNumber, string lastName, string firstName)
        {
            // NEUE STRUKTUR: C_1001_Mustermann_Max
            string folderName = $"C_{customerNumber}_{RemoveInvalidFileNameChars(lastName)}_{RemoveInvalidFileNameChars(firstName)}";
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                               "PixFrameWorkspace",
                               "Customers",
                               folderName);
        }

        public string GetCustomerFolderPath(Customer customer)
        {
            return GetCustomerFolderPath(customer.CustomerNumber, customer.LastName, customer.FirstName);
        }

        public string CreateCustomerFolder(Customer customer)
        {
            try
            {
                string customerFolderPath = GetCustomerFolderPath(customer);

                // Hauptordner erstellen
                Directory.CreateDirectory(customerFolderPath);

                // Standard-Unterordner erstellen
                CreateCustomerSubfolders(customerFolderPath);

                // Kundeninfo-Datei erstellen
                CreateCustomerInfoFile(customerFolderPath, customer);

                return customerFolderPath;
            }
            catch (Exception ex)
            {
                throw new Exception($"Fehler beim Erstellen des Kundenordners: {ex.Message}");
            }
        }

        private void CreateCustomerSubfolders(string customerFolderPath)
        {
            var subfolders = new[]
            {
                "01_Projekte",
                "02_Vertraege",
                "03_Rechnungen",
                "04_Korrespondenz",
                "05_Medien",
                "06_Sonstiges",
                "07_Dokumente",
                "08_Angebote"
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
                               $"Erstellt am: {DateTime.Now:dd.MM.yyyy HH:mm}\n\n" +
                               $"ORDNERSTRUKTUR:\n" +
                               $"01_Projekte/     - Alle Projektordner\n" +
                               $"02_Vertraege/    - Verträge und Vereinbarungen\n" +
                               $"03_Rechnungen/   - Rechnungen (Eingang/Ausgang)\n" +
                               $"04_Korrespondenz/- E-Mails, Briefe, Kommunikation\n" +
                               $"05_Medien/       - Fotos, Videos, Grafiken\n" +
                               $"06_Sonstiges/    - Diverse Dateien\n" +
                               $"07_Dokumente/    - Wichtige Dokumente\n" +
                               $"08_Angebote/     - Angebote und Kostenvoranschläge";

            File.WriteAllText(infoFilePath, infoContent, Encoding.UTF8);
        }

        public string CreateProjectFolder(Customer customer, Project project)
        {
            try
            {
                string customerFolderPath = GetCustomerFolderPath(customer);
                string projectsFolderPath = Path.Combine(customerFolderPath, "01_Projekte");

                // Stelle sicher, dass der Projekte-Ordner existiert
                Directory.CreateDirectory(projectsFolderPath);

                // Projektordnername: P_1_Hochzeit_15.07.2024
                string projectFolderName = $"P_{project.ProjectId}_{RemoveInvalidFileNameChars(project.ProjectName)}";
                string projectFolderPath = Path.Combine(projectsFolderPath, projectFolderName);

                // Projektordner erstellen
                Directory.CreateDirectory(projectFolderPath);

                // Projekt-Unterordner erstellen
                CreateProjectSubfolders(projectFolderPath);

                // Projektinfo-Datei erstellen
                CreateProjectInfoFile(projectFolderPath, customer, project);

                return projectFolderPath;
            }
            catch (Exception ex)
            {
                throw new Exception($"Fehler beim Erstellen des Projektordners: {ex.Message}");
            }
        }

        private void CreateProjectSubfolders(string projectFolderPath)
        {
            var subfolders = new[]
            {
                "01_Fotos",
                "02_Videos",
                "03_Rohdaten",
                "04_Bearbeitet",
                "05_Export",
                "06_Dokumente",
                "07_Rechnungen",
                "08_Vertraege",
                "09_Notizen"
            };

            foreach (var folder in subfolders)
            {
                string fullPath = Path.Combine(projectFolderPath, folder);
                Directory.CreateDirectory(fullPath);
            }
        }

        private void CreateProjectInfoFile(string projectFolderPath, Customer customer, Project project)
        {
            string infoFilePath = Path.Combine(projectFolderPath, "Projektinfo.txt");

            string gettingReadyText = "n/a";
            if (project.GettingReady)
            {
                var parts = new List<string>();
                if (project.GettingReadyEr) parts.Add("Er");
                if (project.GettingReadySie) parts.Add("Sie");
                if (project.GettingReadyBeide) parts.Add("Beide");
                gettingReadyText = parts.Any() ? string.Join(", ", parts) : "n/a";
            }

            string infoContent = $"PROJEKTINFORMATION\n" +
                               $"=================\n" +
                               $"Projekt-ID: {project.ProjectId}\n" +
                               $"Projektname: {project.ProjectName}\n" +
                               $"Kunde: {customer.FirstName} {customer.LastName}\n" +
                               $"Kundennummer: {customer.CustomerNumber}\n" +
                               $"Kategorie: {project.Category}\n" +
                               $"Status: {project.Status}\n" +
                               $"Buchungsdatum: {project.Booking?.ToString("dd.MM.yyyy") ?? "n/a"}\n" +
                               $"Uhrzeit: {project.BookingTime:hh\\:mm}\n" +
                               $"Ort: {project.Location ?? "n/a"}\n" +
                               $"Erstellt am: {project.CreatedDate:dd.MM.yyyy HH:mm}\n\n" +
                               $"DIENSTLEISTUNGEN:\n" +
                               $"Fotografie: {(project.Fotografie ? "Ja" : "Nein")}\n" +
                               $"Videografie: {(project.Videografie ? "Ja" : "Nein")}\n" +
                               $"Danksagungskarten: {(project.Glueckwunschkarten ? "Ja" : "Nein")}\n" +
                               $"Getting Ready: {(project.GettingReady ? "Ja" : "Nein")}\n" +
                               $"Getting Ready für: {gettingReadyText}\n\n" +
                               $"ORDNERSTRUKTUR:\n" +
                               $"01_Fotos/        - Alle Fotos des Projekts\n" +
                               $"02_Videos/       - Alle Videos des Projekts\n" +
                               $"03_Rohdaten/     - Unbearbeitete Originaldateien\n" +
                               $"04_Bearbeitet/   - Bearbeitete Dateien\n" +
                               $"05_Export/       - Exportierte Dateien für Kunden\n" +
                               $"06_Dokumente/    - Projektbezogene Dokumente\n" +
                               $"07_Rechnungen/   - Rechnungen für dieses Projekt\n" +
                               $"08_Vertraege/    - Verträge für dieses Projekt\n" +
                               $"09_Notizen/      - Notizen und Planungen";

            File.WriteAllText(infoFilePath, infoContent, Encoding.UTF8);
        }

        private string RemoveInvalidFileNameChars(string filename)
        {
            if (string.IsNullOrEmpty(filename))
                return "Unknown";

            var invalidChars = Path.GetInvalidFileNameChars();
            return new string(filename.Where(ch => !invalidChars.Contains(ch)).ToArray());
        }

        public bool OpenCustomerFolder(Customer customer)
        {
            try
            {
                var folderPath = GetCustomerFolderPath(customer);

                // Stelle sicher, dass der Ordner existiert
                if (!Directory.Exists(folderPath))
                {
                    CreateCustomerFolder(customer);
                }

                // Öffne den Ordner im Datei-Explorer
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo()
                {
                    FileName = folderPath,
                    UseShellExecute = true,
                    Verb = "open"
                });

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public bool OpenProjectFolder(Customer customer, Project project)
        {
            try
            {
                var projectFolderPath = CreateProjectFolder(customer, project);

                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo()
                {
                    FileName = projectFolderPath,
                    UseShellExecute = true,
                    Verb = "open"
                });

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}