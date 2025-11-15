using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PixFrameWorkspace
{
    public class Project
    {
        public int ProjectId { get; set; }
        public int CustomerNumber { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public DateTime? Deadline { get; set; }
        public string Status { get; set; } = "Aktiv"; // Aktiv, Abgeschlossen, Pausiert
        public string ProjectFolderPath { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;

        public string DisplayInfo => $"{ProjectName} - {Status}";
    }
}