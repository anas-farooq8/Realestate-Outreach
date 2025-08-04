import * as XLSX from "xlsx"
import type { Property } from "./types"

export function exportToExcel(properties: Property[], filename: string) {
  // Prepare data for Excel export
  const excelData = properties.map((property) => ({
    "Property Address": property.property_address || "",
    Street: property.street || "",
    City: property.city || "",
    County: property.county || "",
    State: property.state || "",
    "Zip Code": property.zip_code || "",
    "HOA/Management Company": property.hoa_or_management_company || "",
    "Decision Maker": property.decision_maker_name || "",
    Email:
      property.decision_maker_email && !property.decision_maker_email.includes("noemail")
        ? property.decision_maker_email
        : "",
    Phone: property.decision_maker_phone || "",
    "Suspend Until": property.suspend_until || "",
    "Opt Out Code": property.opt_out_code || "",
    "Created Date": new Date(property.created_at).toLocaleDateString(),
    "Updated Date": new Date(property.updated_at).toLocaleDateString(),
  }))

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Auto-size columns
  const columnWidths = Object.keys(excelData[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }))
  worksheet["!cols"] = columnWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Properties")

  // Save file
  XLSX.writeFile(workbook, filename)
}
