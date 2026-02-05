using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PixFrameWorkspace.Models.Database
{
    public class Project
    {
        [Key]
        public int ProjectId { get; set; }

        [Required]
        [ForeignKey(nameof(Customer))]
        public int CustomerNumber { get; set; }

        [Required]
        [MaxLength(200)]
        public string ProjectName { get; set; }

        [MaxLength(50)]
        public string Category { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Aktiv";

        public DateTime? Booking { get; set; }
        public TimeSpan BookingTime { get; set; } = TimeSpan.Zero;

        [MaxLength(150)]
        public string Location { get; set; }

        public bool Fotografie { get; set; }
        public bool Videografie { get; set; }
        public bool Glueckwunschkarten { get; set; }

        public bool GettingReady { get; set; }
        public bool GettingReadyEr { get; set; }
        public bool GettingReadySie { get; set; }
        public bool GettingReadyBeide { get; set; }

        [MaxLength(1000)]
        public string Notes { get; set; }

        [MaxLength(500)]
        public string ProjectFolderPath { get; set; }

        [MaxLength(500)]
        public string BookingInfo { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public DateTime? ModifiedDate { get; set; }

        // Navigation Properties
        public Customer Customer { get; set; }
    }
}