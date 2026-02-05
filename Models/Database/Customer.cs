using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace PixFrameWorkspace.Models.Database
{
    public class Customer
    {
        [Key]
        public int CustomerNumber { get; set; }

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; }

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; }

        [MaxLength(150)]
        public string Company { get; set; }

        [Required]
        [MaxLength(150)]
        [EmailAddress]
        public string Email { get; set; }

        [MaxLength(20)]
        public string Phone { get; set; }

        [MaxLength(100)]
        public string Street { get; set; }

        [MaxLength(10)]
        public string HouseNumber { get; set; }

        [MaxLength(10)]
        public string ZipCode { get; set; }

        [MaxLength(100)]
        public string City { get; set; }

        [MaxLength(50)]
        public string VatId { get; set; }

        [MaxLength(500)]
        public string FolderPath { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public DateTime? ModifiedDate { get; set; }

        // Navigation Properties
        public ICollection<Project> Projects { get; set; } = new List<Project>();

        // Convenience Property (wie in deinem alten Code)
        public string DisplayName => $"{FirstName} {LastName}";
    }
}