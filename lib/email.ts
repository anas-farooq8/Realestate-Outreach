import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
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

export async function sendInviteEmail({
  email,
  temporaryPassword,
  message,
  invitedBy,
}: {
  email: string;
  temporaryPassword: string;
  message?: string;
  invitedBy: string;
}) {
  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    const subject = "Welcome to Real Estate Outreach - Your Account is Ready";

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Real Estate Outreach</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Real Estate Outreach</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p>Hello,</p>
        
        <p>You've been invited to join our Real Estate Outreach platform by <strong>${invitedBy}</strong>.</p>
        
        ${
          message
            ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #2563eb;">
          <p style="margin: 0; font-style: italic;">"${message}"</p>
        </div>`
            : ""
        }
        
        <h3 style="color: #2563eb; margin-top: 25px;">Your Login Details:</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code></p>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>Important:</strong> Please change your password after your first login.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Login to Your Account
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          If you have any questions, please contact your administrator.<br>
          <strong>Real Estate Outreach Platform</strong>
        </p>
      </div>
    </body>
    </html>
    `;

    const result = await sendEmail(email, subject, html);

    if (result.success) {
      console.log("📧 Invite email sent successfully to:", email);
    } else {
      console.error("Failed to send invite email:", result.error);
    }

    return result;
  } catch (error) {
    console.error("Error sending invite email:", error);
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
  skippedCount: number = 0
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
      console.log("📧 Completion email sent successfully to:", userEmail);
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
