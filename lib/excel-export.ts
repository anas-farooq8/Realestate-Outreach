import * as XLSX from "xlsx"
import type { Property } from "./types"

export function exportToExcel(properties: Property[], filename = "properties.xlsx"): void {
  // Prepare data for Excel export
  const excelData = properties.map((property) => ({
    "Community Name": property.community_name,
    "Management Company": property.management_company || "",
    "Decision Maker": property.decision_maker_name || "",
    Email: property.email || "",
    Phone: property.phone || "",
    "Street Address": property.street_address || "",
    City: property.city || "",
    County: property.county || "",
    State: property.state || "",
    "Zip Code": property.zip_code || "",
    "Parent Address": property.parent_address || "",
    "Created Date": new Date(property.created_at).toLocaleDateString(),
  }))

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Community Name
    { wch: 25 }, // Management Company
    { wch: 20 }, // Decision Maker
    { wch: 30 }, // Email
    { wch: 15 }, // Phone
    { wch: 30 }, // Street Address
    { wch: 15 }, // City
    { wch: 15 }, // County
    { wch: 10 }, // State
    { wch: 10 }, // Zip Code
    { wch: 25 }, // Parent Address
    { wch: 12 }, // Created Date
  ]
  worksheet["!cols"] = columnWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Properties")

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, filename)
}
