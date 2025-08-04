import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "TBMMoutreach@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function sendCompletionEmail(userEmail: string, totalProperties: number, processedProperties: number) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "TBMMoutreach@gmail.com",
      to: userEmail,
      subject: "Property Processing Complete",
      html: `
        <h2>Property Processing Complete</h2>
        <p>Your property processing has been completed.</p>
        <p><strong>Total Properties:</strong> ${totalProperties}</p>
        <p><strong>Successfully Processed:</strong> ${processedProperties}</p>
        <p>You can now view your properties in the dashboard.</p>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Completion email sent successfully")
  } catch (error) {
    console.error("Error sending completion email:", error)
  }
}
