using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PixFrameWorkspace
{
    public class Customer
    {
        public int CustomerNumber { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Street { get; set; } = string.Empty;
        public string HouseNumber { get; set; } = string.Empty;
        public string ZipCode { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string VatId { get; set; } = string.Empty;

        // NEU: Pfad zum Kundenordner
        public string FolderPath { get; set; } = string.Empty;

        public string DisplayName => $"{CustomerNumber} - {FirstName} {LastName} {Company}";
        public string FullAddress => $"{Street} {HouseNumber}, {ZipCode} {City}";
    }
}
