using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Diagnostics;

namespace PixFrameWorkspace
{
    /// <summary>
    /// Asynchrones Repository für Projekte (CSV-basiert).
    /// Thread-safe über SemaphoreSlim; atomisches Schreiben mittels Temp-File.
    /// </summary>
    public class ProjectRepository
    {
        private readonly string _projectsFilePath;
        private readonly SemaphoreSlim _lock = new SemaphoreSlim(1, 1);
        private ObservableCollection<Project> _projects = new ObservableCollection<Project>();

        public ProjectRepository()
        {
            _projectsFilePath = Path.Combine(AppConfig.Settings.FullDataPath, "projects.csv");
            Directory.CreateDirectory(AppConfig.Settings.FullDataPath);

            Debug.WriteLine($"[ProjectRepository] ctor: projectsFilePath = {_projectsFilePath}");
        }

        // öffentliches readonly-Property, um zur Laufzeit den Pfad zu sehen
        public string ProjectsFilePath => _projectsFilePath;

        public async Task InitializeAsync()
        {
            await LoadProjectsAsync().ConfigureAwait(false);
        }

        public async Task<List<Project>> GetAllProjectsAsync()
        {
            await _lock.WaitAsync().ConfigureAwait(false);
            try
            {
                return _projects.ToList();
            }
            finally
            {
                _lock.Release();
            }
        }

        public async Task LoadProjectsAsync()
        {
            await _lock.WaitAsync().ConfigureAwait(false);
            try
            {
                Debug.WriteLine($"[ProjectRepository] LoadProjectsAsync: reading from {_projectsFilePath}");

                _projects.Clear();

                if (!File.Exists(_projectsFilePath))
                {
                    // Ensure directory and header
                    Directory.CreateDirectory(Path.GetDirectoryName(_projectsFilePath));
                    var config = new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = true };
                    using (var writer = new StreamWriter(_projectsFilePath, false, Encoding.UTF8))
                    using (var csv = new CsvWriter(writer, config))
                    {
                        csv.WriteHeader<Project>();
                        csv.NextRecord();
                    }
                    Debug.WriteLine($"[ProjectRepository] LoadProjectsAsync: created new csv with header at {_projectsFilePath}");
                    return;
                }

                using (var stream = File.Open(_projectsFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
                using (var reader = new StreamReader(stream, Encoding.UTF8))
                {
                    var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                    {
                        HasHeaderRecord = true,
                        MissingFieldFound = null,
                        BadDataFound = context => { Debug.WriteLine($"[ProjectRepository] Bad CSV data: {context.RawRecord}"); },
                        IgnoreBlankLines = true,
                        TrimOptions = TrimOptions.Trim
                    };

                    using var csv = new CsvReader(reader, config);
                    try
                    {
                        await foreach (var p in csv.GetRecordsAsync<Project>())
                        {
                            if (p == null) continue;
                            // Basic cleanup
                            p.ProjectName = p.ProjectName?.Trim() ?? string.Empty;
                            _projects.Add(p);
                        }

                        Debug.WriteLine($"[ProjectRepository] LoadProjectsAsync: loaded {_projects.Count} projects");
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[ProjectRepository] LoadProjectsAsync parse error: {ex}");
                        // ignore parse errors for now (could log)
                    }
                }
            }
            finally
            {
                _lock.Release();
            }
        }

        public async Task SaveAllProjectsAsync(IEnumerable<Project> projects)
        {
            await _lock.WaitAsync().ConfigureAwait(false);
            var tempFile = _projectsFilePath + ".tmp";
            try
            {
                Debug.WriteLine($"[ProjectRepository] SaveAllProjectsAsync: saving to {_projectsFilePath} (temp {tempFile})");

                Directory.CreateDirectory(Path.GetDirectoryName(_projectsFilePath));
                var config = new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = true };

                using (var stream = File.Open(tempFile, FileMode.Create, FileAccess.Write, FileShare.None))
                using (var writer = new StreamWriter(stream, Encoding.UTF8))
                using (var csv = new CsvWriter(writer, config))
                {
                    csv.WriteHeader<Project>();
                    await csv.NextRecordAsync().ConfigureAwait(false);
                    foreach (var p in projects.OrderBy(p => p.ProjectId))
                    {
                        csv.WriteRecord(p);
                        await csv.NextRecordAsync().ConfigureAwait(false);
                    }
                    await writer.FlushAsync().ConfigureAwait(false);
                }

                if (File.Exists(_projectsFilePath))
                    File.Replace(tempFile, _projectsFilePath, null);
                else
                    File.Move(tempFile, _projectsFilePath);

                Debug.WriteLine($"[ProjectRepository] SaveAllProjectsAsync: wrote file {_projectsFilePath}");

                // update in-memory collection
                _projects = new ObservableCollection<Project>(projects.OrderBy(p => p.ProjectId));
            }
            finally
            {
                try { if (File.Exists(tempFile)) File.Delete(tempFile); } catch { }
                _lock.Release();
            }
        }

        public async Task<IEnumerable<Project>> GetProjectsByCustomerAsync(int customerNumber)
        {
            var all = await GetAllProjectsAsync().ConfigureAwait(false);
            return all.Where(p => p.CustomerNumber == customerNumber).ToList();
        }

        public async Task<int> GetNextProjectIdAsync()
        {
            var all = await GetAllProjectsAsync().ConfigureAwait(false);
            return all.Any() ? all.Max(p => p.ProjectId) + 1 : 1;
        }

        public async Task AddOrUpdateProjectAsync(Project project)
        {
            await _lock.WaitAsync().ConfigureAwait(false);
            try
            {
                var list = _projects.ToList();
                var existing = list.FirstOrDefault(p => p.ProjectId == project.ProjectId);
                if (existing != null)
                {
                    var idx = list.IndexOf(existing);
                    list[idx] = project;
                }
                else
                {
                    list.Add(project);
                }

                await SaveAllProjectsAsync(list).ConfigureAwait(false);
            }
            finally
            {
                _lock.Release();
            }
        }

        public async Task DeleteProjectAsync(int projectId)
        {
            await _lock.WaitAsync().ConfigureAwait(false);
            try
            {
                var list = _projects.ToList();
                var existing = list.FirstOrDefault(p => p.ProjectId == projectId);
                if (existing != null)
                {
                    list.Remove(existing);
                    await SaveAllProjectsAsync(list).ConfigureAwait(false);
                }
            }
            finally
            {
                _lock.Release();
            }
        }

        // Optional helper that uses CustomerManager to create project folder for customer
        public string CreateProjectFolder(Customer customer, Project project)
        {
            var cm = new CustomerManager();
            return cm.CreateProjectFolder(customer, project);
        }
    }
}