import * as ExcelJS from "exceljs";
import type { Property, EmailLog } from "./types";

export async function exportToExcel(
  data: Property[] | EmailLog[],
  filename: string
) {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    data.length > 0 && "sent_at" in data[0] ? "Email Logs" : "Properties"
  );

  // Determine if we're dealing with properties or email logs
  const isEmailLogs = data.length > 0 && "sent_at" in data[0];
  console.log("isEmailLogs:", isEmailLogs);

  // print data of email logs or properties
  console.log("Data to export:", data);

  if (isEmailLogs) {
    // Define columns for email logs
    worksheet.columns = [
      { header: "Property Address", key: "propertyAddress", width: 30 },
      { header: "Decision Maker", key: "decisionMaker", width: 25 },
      { header: "Email", key: "email", width: 25 },
      { header: "Template Name", key: "templateName", width: 20 },
      { header: "Campaign Week", key: "campaignWeek", width: 15 },
      { header: "Sent At", key: "sentAt", width: 20 },
      { header: "Replied At", key: "repliedAt", width: 20 },
      { header: "Reply Status", key: "replied", width: 15 },
    ];

    // Add data rows for email logs
    (data as EmailLog[]).forEach((log) => {
      worksheet.addRow({
        propertyAddress: log.properties?.property_address || "",
        decisionMaker: log.properties?.decision_maker_name || "",
        email: log.properties?.decision_maker_email || "",
        templateName: log.email_templates?.template_name || "",
        campaignWeek: log.campaign_week || "",
        sentAt: new Date(log.sent_at).toLocaleString(),
        repliedAt: log.replied_at
          ? new Date(log.replied_at).toLocaleString()
          : "",
        replied: log.replied ? "Yes" : "No",
      });
    });
  } else {
    // Define columns for properties
    worksheet.columns = [
      { header: "Property Name", key: "propertyName", width: 25 },
      { header: "HOA/Management Company", key: "hoaManagement", width: 25 },
      { header: "Decision Maker", key: "decisionMaker", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "State", key: "state", width: 10 },
      { header: "County", key: "county", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "Zip Code", key: "zipCode", width: 12 },
      { header: "Status", key: "status", width: 15 },
      { header: "Created At", key: "createdAt", width: 15 },
    ];

    // Add data rows for properties
    (data as Property[]).forEach((property) => {
      worksheet.addRow({
        propertyName: property.property_address || "",
        hoaManagement: property.hoa_or_management_company || "",
        decisionMaker: property.decision_maker_name || "",
        email: property.decision_maker_email || "",
        phone: property.decision_maker_phone || "",
        state: property.state || "",
        county: property.county || "",
        city: property.city || "",
        zipCode: property.zip_code || "",
        status:
          new Date(property.suspend_until) <= new Date()
            ? "Unsubscribed"
            : "Subscribed",
        createdAt: new Date(property.created_at).toLocaleDateString(),
      });
    });
  }

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Generate buffer and download file (browser-compatible)
  const buffer = await workbook.xlsx.writeBuffer();

  // Create blob and download link
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
