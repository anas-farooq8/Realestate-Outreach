import * as XLSX from "xlsx"
import type { Property } from "./types"

export function exportToExcel(properties: Property[], filename: string) {
  // Prepare data for export
  const exportData = properties.map((property) => ({
    "Property Name": property.property_address || "",
    Street: property.street || "",
    City: property.city || "",
    County: property.county || "",
    State: property.state || "",
    "Zip Code": property.zip_code || "",
    "Decision Maker": property.decision_maker_name || "",
    Email: property.decision_maker_email || "",
    Phone: property.decision_maker_phone || "",
    "HOA/Management Company": property.hoa_or_management_company || "",
    "Suspend Until": property.suspend_until || "",
    "Opt Out Code": property.opt_out_code || "",
    "Created At": new Date(property.created_at).toLocaleDateString(),
    "Updated At": new Date(property.updated_at).toLocaleDateString(),
  }))

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(exportData)

  // Auto-size columns
  const columnWidths = Object.keys(exportData[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }))
  worksheet["!cols"] = columnWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Properties")

  // Save file
  XLSX.writeFile(workbook, filename)
}
