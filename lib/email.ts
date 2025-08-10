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
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e40af; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #eff6ff;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Welcome to Real Estate Outreach!</h1>
        <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">Your account has been created</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); border: 1px solid #dbeafe;">
        <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: 600;">Hello! ${email}</h2>
        
        <p style="margin-bottom: 20px; color: #374151;">You've been invited to join our Real Estate Outreach platform by <strong style="color: #1d4ed8;">${invitedBy}</strong>.</p>
        
        ${
          message
            ? `
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; border: 1px solid #bfdbfe;">
          <p style="margin: 0; font-style: italic; color: #1e40af;">"${message}"</p>
        </div>
        `
            : ""
        }
        
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 10px; margin-bottom: 25px; border: 1px solid #bae6fd;">
          <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px; font-weight: 600;">Your Login Credentials:</h3>
          <p style="margin-bottom: 10px; color: #374151;"><strong>Email:</strong> <code style="background: #dbeafe; color: #1e40af; padding: 6px 10px; border-radius: 6px; font-family: monospace; border: 1px solid #bfdbfe;">${email}</code></p>
          <p style="margin-bottom: 15px; color: #374151;"><strong>Password:</strong> <code style="background: #dbeafe; color: #1e40af; padding: 6px 10px; border-radius: 6px; font-family: monospace; border: 1px solid #bfdbfe;">${temporaryPassword}</code></p>
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 15px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Important:</strong> Please change your password after your first login for security.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.2s ease;">
            Login to Your Account →
          </a>
        </div>
        
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 15px; border-radius: 8px; margin-top: 25px; border: 1px solid #bae6fd;">
          <p style="margin: 0; font-size: 14px; color: #0369a1; text-align: center; font-weight: 500;">
            If you have any questions or need help getting started, please don't hesitate to reach out to your administrator.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #bfdbfe;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            <strong style="color: #1e40af;">Real Estate Outreach Platform</strong><br>
            This invitation was sent by <span style="color: #3b82f6; font-weight: 500;">${invitedBy}</span>
          </p>
        </div>
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
