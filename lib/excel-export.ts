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

  // Auto-size columns
  const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }))
  worksheet["!cols"] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Properties")

  // Save file
  XLSX.writeFile(workbook, filename)
}
