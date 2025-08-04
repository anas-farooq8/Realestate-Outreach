import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "TBMMoutreach@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "#Protect3d",
  },
})

export async function sendCompletionEmail(userEmail: string, totalProperties: number, processedProperties: number) {
  try {
    const subject = "Property Data Processing Complete"
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Property Data Processing Complete</h2>
        <p>Hello,</p>
        <p>Your property data enrichment process has been completed successfully.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Processing Summary:</h3>
          <ul>
            <li><strong>Total Properties:</strong> ${totalProperties}</li>
            <li><strong>Successfully Processed:</strong> ${processedProperties}</li>
            <li><strong>Success Rate:</strong> ${Math.round((processedProperties / totalProperties) * 100)}%</li>
          </ul>
        </div>
        
        <p>You can now view and export your enriched property data from the dashboard.</p>
        
        <p>Best regards,<br>Real Estate Outreach Team</p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_USER || "TBMMoutreach@gmail.com",
      to: userEmail,
      subject,
      html,
    })

    console.log("Completion email sent successfully to:", userEmail)
  } catch (error) {
    console.error("Error sending completion email:", error)
  }
}
