import * as ExcelJS from "exceljs";
import type { Property } from "./types";

export async function exportToExcel(properties: Property[], filename: string) {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Properties");

  // Define columns with headers
  worksheet.columns = [
    { header: "Property Name", key: "propertyName", width: 25 },
    { header: "Street", key: "street", width: 25 },
    { header: "City", key: "city", width: 15 },
    { header: "County", key: "county", width: 15 },
    { header: "State", key: "state", width: 10 },
    { header: "Zip Code", key: "zipCode", width: 12 },
    { header: "Decision Maker", key: "decisionMaker", width: 20 },
    { header: "Email", key: "email", width: 25 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "HOA/Management Company", key: "hoaManagement", width: 25 },
    { header: "Created At", key: "createdAt", width: 15 },
    { header: "Updated At", key: "updatedAt", width: 15 },
  ];

  // Add data rows
  properties.forEach((property) => {
    worksheet.addRow({
      propertyName: property.property_address || "",
      street: property.street || "",
      city: property.city || "",
      county: property.county || "",
      state: property.state || "",
      zipCode: property.zip_code || "",
      decisionMaker: property.decision_maker_name || "",
      email: property.decision_maker_email || "",
      phone: property.decision_maker_phone || "",
      hoaManagement: property.hoa_or_management_company || "",
      createdAt: new Date(property.created_at).toLocaleDateString(),
      updatedAt: new Date(property.updated_at).toLocaleDateString(),
    });
  });

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Write file
  await workbook.xlsx.writeFile(filename);
}
