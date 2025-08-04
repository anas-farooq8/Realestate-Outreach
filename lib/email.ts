import nodemailer from "nodemailer"

const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function sendCompletionEmail(
  userEmail: string,
  totalCommunities: number,
  processedCommunities: number,
): Promise<void> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "HOA Data Enrichment Complete",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">HOA Data Enrichment Complete</h2>
          <p>Your real estate outreach data processing has been completed.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Processing Summary:</h3>
            <ul>
              <li><strong>Total Communities:</strong> ${totalCommunities}</li>
              <li><strong>Successfully Processed:</strong> ${processedCommunities}</li>
              <li><strong>Success Rate:</strong> ${Math.round((processedCommunities / totalCommunities) * 100)}%</li>
            </ul>
          </div>
          <p>You can now view and manage your enriched data on the dashboard.</p>
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message from your Real Estate Outreach Automation system.
          </p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Completion email sent successfully")
  } catch (error) {
    console.error("Error sending completion email:", error)
    throw new Error("Failed to send completion email")
  }
}
