using System;

namespace PixFrameWorkspace
{
    public class Project
    {
        public int ProjectId { get; set; }
        public int CustomerNumber { get; set; }
        public string ProjectName { get; set; }
        public string Category { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? Booking { get; set; }
        public string Status { get; set; }
        public string ProjectFolderPath { get; set; }
        public string Notes { get; set; }
        public string Location { get; set; }
        public TimeSpan BookingTime { get; set; }

        // DIENSTLEISTUNGEN
        public bool Fotografie { get; set; }
        public bool Videografie { get; set; }
        public bool Glueckwunschkarten { get; set; }
        public bool GettingReady { get; set; }
        public bool GettingReadyEr { get; set; }
        public bool GettingReadySie { get; set; }
        public bool GettingReadyBeide { get; set; }

        public string BookingInfo
        {
            get
            {
                var date = Booking?.ToString("dd.MM.yyyy") ?? "Kein Datum";
                var time = BookingTime.ToString(@"hh\:mm");
                var location = string.IsNullOrEmpty(Location) ? "Kein Ort" : Location;
                return $"{date} {time} - {location}";
            }
        }
    }
}