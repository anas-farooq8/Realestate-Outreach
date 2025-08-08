import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireRootUser,
  generateSecurePassword,
} from "@/lib/server-utils/invite-server-utils";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    // Verify the requester is the root user
    await requireRootUser();

    const { email, message } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if we have already sent an invitation to this email
    const { data: existingInvite, error: inviteCheckError } = await supabase
      .from("invites")
      .select("id, created_at, user_id")
      .eq("email", email)
      .single();

    // If we found an existing invite, we can't invite the same email again
    if (existingInvite) {
      return NextResponse.json(
        {
          error: "An invitation has already been sent to this email address",
        },
        { status: 409 }
      );
    }

    // Generate secure temporary password
    const temporaryPassword = generateSecurePassword(16);

    // Create user using Supabase Admin API
    const { data: newUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          invited_by: process.env.ROOT_USER_EMAIL,
          invited_at: new Date().toUTCString(),
        },
      });

    if (createUserError) {
      console.error("Error creating user:", createUserError);

      // Handle specific Supabase auth errors
      if (createUserError.message?.includes("email")) {
        return NextResponse.json(
          { error: "A user with this email already exists in the system" },
          { status: 409 }
        );
      }

      if (createUserError.message?.includes("password")) {
        return NextResponse.json(
          { error: "Password requirements not met" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create user account. Please try again later." },
        { status: 500 }
      );
    }

    // Create a new invite record with the user_id
    const { error: inviteCreateError } = await supabase.from("invites").insert({
      email,
      invited_by: process.env.ROOT_USER_EMAIL!,
      user_id: newUser.user?.id,
      message: message || null,
      created_at: new Date().toUTCString(),
    });

    if (inviteCreateError) {
      console.error("Error creating invite record:", inviteCreateError);
      // Continue anyway, user was created successfully
    }

    // Send invitation email
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL!}/login`;
    const inviteEmailHtml = createInviteEmailTemplate({
      email,
      temporaryPassword,
      loginUrl,
      message,
      invitedBy: process.env.ROOT_USER_EMAIL!,
    });

    const emailResult = await sendEmail(
      email,
      "Welcome to Real Estate Outreach - Your Account is Ready",
      inviteEmailHtml
    );

    if (!emailResult.success) {
      console.error("Failed to send invitation email:", emailResult.error);
      return NextResponse.json(
        {
          success: true,
          warning:
            "User created but invitation email failed to send. Please contact the user manually.",
          user: { id: newUser.user?.id, email },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User invited successfully",
      user: { id: newUser.user?.id, email },
    });
  } catch (error) {
    console.error("Invite user error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function createInviteEmailTemplate({
  email,
  temporaryPassword,
  loginUrl,
  message,
  invitedBy,
}: {
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  message?: string;
  invitedBy: string;
}) {
  return `
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
        <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: 600;">Hello!</h2>
        
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
          <p style="margin-bottom: 15px; color: #374151;"><strong>Temporary Password:</strong> <code style="background: #dbeafe; color: #1e40af; padding: 6px 10px; border-radius: 6px; font-family: monospace; border: 1px solid #bfdbfe;">${temporaryPassword}</code></p>
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
}
