# PixFrameWorkspace

PixFrameWorkspace ist eine kleine Verwaltungsanwendung für Kunden und Projekte (Fotografie/Video), geschrieben mit .NET MAUI. Die Anwendung verwaltet Kundendaten (CSV), Projektdaten (CSV) und bietet Funktionen zum Export/Import (JSON), zur Ordnerstrukturverwaltung und zum Starten externer Tools.

## Features
- Kundenverwaltung (Anlegen, Bearbeiten, Listenansicht)
- Projektverwaltung (Projekte an Kunden binden, Dienste markieren, Notizen)
- Persistenz in einfachen CSV-Dateien
- JSON-Export / -Import von Kundendaten
- Statistiken (Anzahl Kunden/Projekte, Dateigrößen)
- Konfigurierbare Workspace-Ordnerstruktur (über `AppConfig`)
- Einstellungen: Auswahl externer Tools, Export/Import

## Voraussetzungen
- .NET 9 SDK mit MAUI-Workloads installiert
  - Anleitung: https://learn.microsoft.com/dotnet/maui/get-started/installation
- Unterstützte Plattformen (laut Projektdatei):
  - Android, iOS, MacCatalyst, Windows (Windows-Target ist konfiguriert)

## Build & Start (lokal)
1. Repository klonen:
   ```
   git clone https://github.com/MEmanuel1986/PixFrameWorkspace.git
   ```
2. Build:
   ```
   dotnet build
   ```
3. App starten (z. B. Windows):
   ```
   dotnet run -f net9.0-windows10.0.19041.0
   ```
   Oder nutze Visual Studio / Visual Studio for Mac mit MAUI-Unterstützung.

## Projektstruktur (Wichtigste Dateien)
- App.xaml / App.xaml.cs — Einstieg & Ressourcen
- AppShell.xaml — Shell / Navigation
- MainPage.xaml(.cs) — Kundenverwaltung (UI + Logic)
- ProjectsPage.xaml(.cs) — Projektverwaltung
- SettingsPage.xaml(.cs) — Export/Import, Statistiken, Tools
- ProjectRepository.cs — Verwaltung/Serialisierung der Projekte (CSV)
- Project.cs, Customer.cs — Model-Klassen
- AppConfig.cs — zentrale Konfiguration für Workspace und Pfade

## Workspace & Dateiformat
Standard-Workspace (falls nicht konfiguriert):
- Windows: `Documents\PixFrameWorkspace\`

Wichtige Dateien/Ordner (unter Workspace):
- Data/
  - Customers.csv — Kunden-Datenbank
  - projects.csv — Projektliste
  - tools_config.json — konfigurierte Tools
  - pixframe_config.json — App-Konfiguration
- Customers/ — Kundenordner (Bilder, Videos, Dokumente)
- Backup/ — Backups

Customers.csv — erwarteter Header (erste Zeile)
```
CustomerNumber,FirstName,LastName,Company,Email,Phone,Street,HouseNumber,ZipCode,City,VatId,FolderPath
```
- Kundendaten werden als CSV gespeichert; es ist wichtig, dass Felder mit Kommata oder Zeilenumbrüchen korrekt escaped sind (aktuell wird ein einfaches Escaping verwendet).

projects.csv — Struktur
- Enthält Felder für ProjectId, CustomerNumber, ProjectName, Category, CreatedDate, Booking, Status, ProjectFolderPath, Notes, Location, BookingTime, Fotografie, Videografie, Glueckwunschkarten, GettingReady, GettingReadyEr, GettingReadySie, GettingReadyBeide
- Header wird beim Speichern erzeugt (siehe ProjectRepository).

## Bekannte Probleme & Hinweise
- Aktuell werden viele Dateizugriffe synchron ausgeführt. Bei größeren Dateien oder vielen Medien kann die UI einfrieren.
- CSV-Verarbeitung in einigen Methoden (z. B. SimpleLoadCustomers) nutzt String.Split(',') — das ist fehleranfällig bei eingebetteten Kommata/Quotes/Zeilenumbrüchen.
- Parsing von Datums-/Zeitfeldern und bool/int verwendet teils Parse statt TryParse — kann zu Ausnahmen bei fehlerhaften Eingaben führen.
- ProjectRepository ist als static implementiert und führt I/O synchron aus; Race-Conditions möglich.
- Empfehlungen: Verwende CsvHelper (im Projekt vorhanden) für robustes CSV-Handling; mache File I/O asynchron; refactor zu MVVM.

## Empfehlungen & Roadmap
Kurzfristig:
- CSV-Parsing mit CsvHelper ersetzen.
- Asynchrone Datei-Operationen (async/await) einführen.
- TryParse statt Parse verwenden und Eingabefehler dem Benutzer anzeigen.

Mittelfristig:
- MVVM-Refactor für Testbarkeit und Trennung von UI/Business-Logic.
- Repositories als Instanzen mit DI (z.B. über Microsoft DI).
- Unit-Tests für Parsing und Repository-Funktionen.

Langfristig (optional):
- Migration auf SQLite (bessere Konsistenz, Abfragen, Transaktionen).
- Cloud-Sync oder Backup-Strategie.

## Entwicklung & Mitwirkung
- Wenn du möchtest, kann ich:
  - Die SimpleLoadCustomers-Methode gegen CsvHelper austauschen (PR).
  - Asynchrone Varianten von Load/Save implementieren.
  - MVVM-Starter-Refactor für eine Seite (z. B. SettingsPage) anlegen.
- Vorschlag: Erstelle zuerst kleinere PRs (CSV-Handling, Async I/O), danach Architektur-Refactors.

## Lizenz
- Derzeit liegt keine Lizenzdatei bei. Wenn du möchtest, kann ich eine MIT- oder andere Lizenzdatei vorschlagen / hinzufügen.
