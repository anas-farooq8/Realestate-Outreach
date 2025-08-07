import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendCompletionEmail(
  userEmail: string,
  totalProperties: number,
  processedCount: number,
  skippedCount: number = 0,
  skippedProperties: string[] = []
) {
  try {
    const subject = "Property Processing Complete";
    const failedCount = totalProperties - processedCount - skippedCount;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Property Processing Complete</h2>
        <p>Your property processing job has been completed!</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #2563eb;">Processing Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p style="margin: 5px 0;"><strong>Total Properties:</strong> ${totalProperties}</p>
            <p style="margin: 5px 0;"><strong>Successfully Processed:</strong> <span style="color: #059669;">${processedCount}</span></p>
            ${
              skippedCount > 0
                ? `<p style="margin: 5px 0;"><strong>Skipped (Already Exist):</strong> <span style="color: #d97706;">${skippedCount}</span></p>`
                : ""
            }
            ${
              failedCount > 0
                ? `<p style="margin: 5px 0;"><strong>Failed:</strong> <span style="color: #dc2626;">${failedCount}</span></p>`
                : ""
            }
          </div>
          <p style="margin: 15px 0 5px 0;"><strong>Success Rate:</strong> ${
            totalProperties > 0
              ? Math.round((processedCount / totalProperties) * 100)
              : 0
          }%</p>
        </div>
        
        <p>You can now view your processed properties in your dashboard.</p>
      </div>
    `;

    const result = await sendEmail(userEmail, subject, html);

    if (result.success) {
      console.log("Completion email sent successfully to:", userEmail);
    } else {
      console.error("Failed to send completion email:", result.error);
    }

    return result;
  } catch (error) {
    console.error("Error sending completion email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
