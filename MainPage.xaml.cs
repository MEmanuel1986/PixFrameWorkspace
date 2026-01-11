using Microsoft.Maui.Controls;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace PixFrameWorkspace
{
    public partial class MainPage : ContentPage
    {
        private Customer _selectedCustomer;
        private CustomerManager _customerManager;
        private bool _isLoadingCustomers = false;

        public ObservableCollection<Customer> Customers { get; set; } = new ObservableCollection<Customer>();

        public MainPage()
        {
            InitializeComponent();
            BindingContext = this;

            _customerManager = new CustomerManager();

            _ = InitializeAsync();
        }

        private async Task InitializeAsync()
        {
            try
            {
                await LoadCustomersAsync().ConfigureAwait(false);
                var next = await _customerManager.GetNextCustomerNumberAsync().ConfigureAwait(false);
                Dispatcher.Dispatch(() => CustomerNumberLabel.Text = next.ToString());
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Initialisierung fehlgeschlagen: {ex.Message}", "OK");
            }
        }

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
                var page = new ProjectsPage();
                page.SelectedCustomer = _selectedCustomer;
                await Navigation.PushAsync(page);
                StatusLabel.Text = $"Projekte für {_selectedCustomer.DisplayName} geöffnet";
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Öffnen der Projekte: {ex.Message}", "OK");
                StatusLabel.Text = "Fehler beim Öffnen der Projekte";
            }
        }

        private void OnCustomerSelected(object sender, SelectedItemChangedEventArgs e)
        {
            if (e.SelectedItem is Customer customer)
            {
                _selectedCustomer = customer;
                DisplayCustomerDetails(customer);
                StatusLabel.Text = $"Kunde {customer.DisplayName} ausgewählt";
                OpenFolderButton.IsEnabled = true;
            }
        }

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

        private async Task LoadCustomersAsync()
        {
            if (_isLoadingCustomers) return;
            _isLoadingCustomers = true;
            try
            {
                Customers.Clear();
                var allCustomers = await _customerManager.GetAllCustomersAsync().ConfigureAwait(false);
                Dispatcher.Dispatch(() =>
                {
                    foreach (var customer in allCustomers)
                    {
                        Customers.Add(customer);
                    }
                    CustomerCountLabel.Text = $"{Customers.Count} Kunden gefunden";
                    StatusLabel.Text = $"{Customers.Count} Kunden geladen";
                });
            }
            catch (Exception ex)
            {
                StatusLabel.Text = "Fehler beim Laden der Kunden";
                await DisplayAlert("Fehler", $"Fehler beim Laden der Kunden: {ex.Message}", "OK");
            }
            finally
            {
                _isLoadingCustomers = false;
            }
        }

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

        private void OnClearSearchClicked(object sender, EventArgs e)
        {
            SearchEntry.Text = string.Empty;
            CustomersListView.ItemsSource = Customers;
            CustomerCountLabel.Text = $"{Customers.Count} Kunden gefunden";
        }

        private async void OnSaveButtonClicked(object sender, EventArgs e)
        {
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

                    await _customerManager.SaveCustomerAsync(newCustomer).ConfigureAwait(false);

                    Dispatcher.Dispatch(() =>
                    {
                        Customers.Add(newCustomer);
                        _selectedCustomer = newCustomer;
                        StatusLabel.Text = $"Kunde {newCustomer.DisplayName} gespeichert";
                    });

                    await DisplayAlert("Erfolg", "Kunde erfolgreich gespeichert", "OK");

                    var next = await _customerManager.GetNextCustomerNumberAsync().ConfigureAwait(false);
                    Dispatcher.Dispatch(() => CustomerNumberLabel.Text = next.ToString());
                }
                else
                {
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

                    await _customerManager.SaveCustomerAsync(_selectedCustomer).ConfigureAwait(false);

                    Dispatcher.Dispatch(() =>
                    {
                        var index = Customers.IndexOf(_selectedCustomer);
                        if (index != -1)
                        {
                            Customers[index] = _selectedCustomer;
                        }
                        StatusLabel.Text = $"Kunde {_selectedCustomer.DisplayName} aktualisiert";
                    });

                    await DisplayAlert("Erfolg", "Kunde erfolgreich aktualisiert", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Speichern: {ex.Message}", "OK");
            }
        }

        private void OnClearButtonClicked(object sender, EventArgs e)
        {
            _selectedCustomer = null;
            _ = Dispatcher.DispatchAsync(async () =>
            {
                var next = await _customerManager.GetNextCustomerNumberAsync();
                CustomerNumberLabel.Text = next.ToString();
            });
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
            CustomersListView.SelectedItem = null;
            StatusLabel.Text = "Bereit für neuen Kunden";
        }

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
                var success = await _customerManager.OpenCustomerFolderAsync(_selectedCustomer).ConfigureAwait(false);
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

        private async void OnSettingsButtonClicked(object sender, EventArgs e)
        {
            try
            {
                StatusLabel.Text = "Öffne Einstellungen...";
                await Navigation.PushAsync(new SettingsPage());
                StatusLabel.Text = "Einstellungen geöffnet";
            }
            catch (Exception ex)
            {
                await DisplayAlert("Fehler", $"Fehler beim Öffnen der Einstellungen: {ex.Message}", "OK");
                StatusLabel.Text = "Fehler beim Öffnen der Einstellungen";
            }
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            _ = LoadCustomersAsync();
        }
    }
}