using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;

namespace PixFrameWorkspace
{
    /// <summary>
    /// Asynchroner CustomerManager: liest und schreibt Customers.csv mit CsvHelper.
    /// </summary>
    public class CustomerManager
    {
        private readonly string _dataFolder;
        private readonly string _csvFilePath;

        public CustomerManager()
        {
            _dataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "PixFrameWorkspace", "Data");
            _csvFilePath = Path.Combine(_dataFolder, "customers.csv");

            Directory.CreateDirectory(_dataFolder);
            EnsureCsvFileExists();
        }

        private void EnsureCsvFileExists()
        {
            if (!File.Exists(_csvFilePath))
            {
                var header = "CustomerNumber,FirstName,LastName,Company,Email,Phone,Street,HouseNumber,ZipCode,City,VatId,FolderPath";
                File.WriteAllText(_csvFilePath, header + Environment.NewLine, Encoding.UTF8);
            }
        }

        /// <summary>
        /// Liest alle Kunden asynchron und robust via CsvHelper.
        /// </summary>
        public async Task<List<Customer>> GetAllCustomersAsync()
        {
            var customers = new List<Customer>();

            if (!File.Exists(_csvFilePath))
                return customers;

            try
            {
                using var stream = File.Open(_csvFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
                using var reader = new StreamReader(stream, Encoding.UTF8);

                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    MissingFieldFound = null,
                    BadDataFound = context => { /* optional: log context.RawRecord */ },
                    IgnoreBlankLines = true,
                    TrimOptions = TrimOptions.Trim
                };

                using var csv = new CsvReader(reader, config);

                await foreach (var customer in csv.GetRecordsAsync<Customer>())
                {
                    if (customer == null) continue;
                    if (customer.CustomerNumber <= 0) continue;

                    // Basisbereinigung
                    customer.FirstName = customer.FirstName?.Trim() ?? string.Empty;
                    customer.LastName = customer.LastName?.Trim() ?? string.Empty;
                    customer.Company = customer.Company?.Trim() ?? string.Empty;
                    customer.Email = customer.Email?.Trim() ?? string.Empty;
                    customer.Phone = customer.Phone?.Trim() ?? string.Empty;
                    customer.Street = customer.Street?.Trim() ?? string.Empty;
                    customer.HouseNumber = customer.HouseNumber?.Trim() ?? string.Empty;
                    customer.ZipCode = customer.ZipCode?.Trim() ?? string.Empty;
                    customer.City = customer.City?.Trim() ?? string.Empty;
                    customer.VatId = customer.VatId?.Trim() ?? string.Empty;
                    customer.FolderPath = customer.FolderPath?.Trim() ?? string.Empty;

                    customers.Add(customer);
                }
            }
            catch (Exception)
            {
                // Caller handles/logs errors if needed.
                // Returning partial list if any was parsed.
            }

            return customers;
        }

        /// <summary>
        /// Speichert oder aktualisiert einen Kunden asynchron.
        /// </summary>
        public async Task SaveCustomerAsync(Customer customer)
        {
            var allCustomers = await GetAllCustomersAsync().ConfigureAwait(false);

            if (string.IsNullOrEmpty(customer.FolderPath) || !Directory.Exists(customer.FolderPath))
            {
                customer.FolderPath = CreateCustomerFolder(customer);
            }

            var existing = allCustomers.FirstOrDefault(c => c.CustomerNumber == customer.CustomerNumber);
            if (existing != null)
            {
                var idx = allCustomers.IndexOf(existing);
                allCustomers[idx] = customer;
            }
            else
            {
                allCustomers.Add(customer);
            }

            await SaveAllCustomersAsync(allCustomers).ConfigureAwait(false);
        }

        /// <summary>
        /// Speichert die komplette Kundenliste asynchron via CsvHelper.
        /// </summary>
        public async Task SaveAllCustomersAsync(List<Customer> customers)
        {
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true
            };

            // Create/overwrite atomar
            var tempFile = _csvFilePath + ".tmp";
            try
            {
                using (var stream = File.Open(tempFile, FileMode.Create, FileAccess.Write, FileShare.None))
                using (var writer = new StreamWriter(stream, Encoding.UTF8))
                using (var csv = new CsvWriter(writer, config))
                {
                    csv.WriteHeader<Customer>();
                    await csv.NextRecordAsync().ConfigureAwait(false);

                    foreach (var c in customers.OrderBy(cu => cu.CustomerNumber))
                    {
                        await csv.WriteRecordAsync(c).ConfigureAwait(false);
                        await csv.NextRecordAsync().ConfigureAwait(false);
                    }

                    await writer.FlushAsync().ConfigureAwait(false);
                }

                // Replace original file
                if (File.Exists(_csvFilePath))
                    File.Replace(tempFile, _csvFilePath, null);
                else
                    File.Move(tempFile, _csvFilePath);
            }
            catch (Exception)
            {
                // Aufräumen bei Fehler
                try { if (File.Exists(tempFile)) File.Delete(tempFile); } catch { }
                throw;
            }
        }

        public async Task<int> GetNextCustomerNumberAsync()
        {
            var customers = await GetAllCustomersAsync().ConfigureAwait(false);
            return customers.Any() ? customers.Max(c => c.CustomerNumber) + 1 : 1001;
        }

        public string GetCustomerFolderPath(int customerNumber, string lastName, string firstName)
        {
            string folderName = $"C_{customerNumber}_{RemoveInvalidFileNameChars(lastName)}_{RemoveInvalidFileNameChars(firstName)}";
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                                "PixFrameWorkspace",
                                "Customers",
                                folderName);
        }

        public string GetCustomerFolderPath(Customer customer) => GetCustomerFolderPath(customer.CustomerNumber, customer.LastName, customer.FirstName);

        public string CreateCustomerFolder(Customer customer)
        {
            try
            {
                string customerFolderPath = GetCustomerFolderPath(customer);
                Directory.CreateDirectory(customerFolderPath);
                CreateCustomerSubfolders(customerFolderPath);
                CreateCustomerInfoFile(customerFolderPath, customer);
                return customerFolderPath;
            }
            catch (Exception)
            {
                throw;
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
                Directory.CreateDirectory(Path.Combine(customerFolderPath, folder));
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
            string customerFolderPath = GetCustomerFolderPath(customer);
            string projectsFolderPath = Path.Combine(customerFolderPath, "01_Projekte");
            Directory.CreateDirectory(projectsFolderPath);

            string projectFolderName = $"P_{project.ProjectId}_{RemoveInvalidFileNameChars(project.ProjectName)}";
            string projectFolderPath = Path.Combine(projectsFolderPath, projectFolderName);

            Directory.CreateDirectory(projectFolderPath);
            CreateProjectSubfolders(projectFolderPath);
            CreateProjectInfoFile(projectFolderPath, customer, project);

            return projectFolderPath;
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
                Directory.CreateDirectory(Path.Combine(projectFolderPath, folder));
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

        /// <summary>
        /// Öffnet den Kundenordner (plattformabhängig). Gibt true bei Erfolg zurück.
        /// </summary>
        public async Task<bool> OpenCustomerFolderAsync(Customer customer)
        {
            try
            {
                var folderPath = GetCustomerFolderPath(customer);
                if (!Directory.Exists(folderPath))
                {
                    CreateCustomerFolder(customer);
                }

                // Start des Explorers/Finders (synchroner OS-Aufruf, kept simple)
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo()
                {
                    FileName = folderPath,
                    UseShellExecute = true,
                    Verb = "open"
                });

                return await Task.FromResult(true);
            }
            catch
            {
                return await Task.FromResult(false);
            }
        }
    }
}