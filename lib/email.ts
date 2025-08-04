import nodemailer from "nodemailer"

const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "TBMMoutreach@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "#Protect3d",
  },
})

export async function sendCompletionEmail(userEmail: string, totalCommunities: number, processedCommunities: number) {
  try {
    const subject = "HOA Data Enrichment Complete"

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">HOA Data Enrichment Complete</h2>
        
        <p>Hello,</p>
        
        <p>Your real estate outreach data processing has been completed successfully!</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Processing Summary:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;"><strong>Total Communities:</strong> ${totalCommunities}</li>
            <li style="margin: 10px 0;"><strong>Successfully Processed:</strong> ${processedCommunities}</li>
            <li style="margin: 10px 0;"><strong>Success Rate:</strong> ${Math.round((processedCommunities / totalCommunities) * 100)}%</li>
          </ul>
        </div>
        
        <p>You can now view and download your enriched contact data from the dashboard.</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>Real Estate Outreach Team</strong>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `

    const textBody = `
      HOA Data Enrichment Complete
      
      Hello,
      
      Your real estate outreach data processing has been completed successfully!
      
      Processing Summary:
      - Total Communities: ${totalCommunities}
      - Successfully Processed: ${processedCommunities}
      - Success Rate: ${Math.round((processedCommunities / totalCommunities) * 100)}%
      
      You can now view and download your enriched contact data from the dashboard.
      
      Best regards,
      Real Estate Outreach Team
    `

    await transporter.sendMail({
      from: process.env.EMAIL_USER || "TBMMoutreach@gmail.com",
      to: userEmail,
      subject,
      text: textBody,
      html: htmlBody,
    })

    console.log(`Completion email sent to ${userEmail}`)
  } catch (error) {
    console.error("Error sending completion email:", error)
    throw new Error("Failed to send completion email")
  }
}
