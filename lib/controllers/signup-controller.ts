import { createClient } from "@/lib/supabase/client";

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupPageContent {
  title: string;
  subtitle: string;
  loginLink: {
    text: string;
    href: string;
  };
  card: {
    title: string;
    description: string;
  };
  form: {
    emailLabel: string;
    passwordLabel: string;
    confirmPasswordLabel: string;
    submitButton: {
      idle: string;
      loading: string;
    };
  };
}

export class SignupController {
  private supabase = createClient();

  private readonly pageContent: SignupPageContent = {
    title: "Create your account",
    subtitle: "Already have an account?",
    loginLink: {
      text: "Sign in",
      href: "/login",
    },
    card: {
      title: "Sign Up",
      description: "Create an account to get started with property outreach",
    },
    form: {
      emailLabel: "Email address",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm Password",
      submitButton: {
        idle: "Sign Up",
        loading: "Creating account...",
      },
    },
  };

  public getPageContent(): SignupPageContent {
    return this.pageContent;
  }

  public validateForm(formData: SignupFormData): string | null {
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }

    if (formData.password.length < 6) {
      return "Password must be at least 6 characters long";
    }

    return null; // No validation errors
  }

  public async signUp(formData: SignupFormData) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      console.log("Signup response:", { data, error });

      // Handle explicit errors first
      if (error) {
        return { data, error };
      }

      // If we have user data, check if metadata exists
      if (data?.user) {
        const user = data.user;

        // Check if user_metadata exists and has content
        const hasMetadata =
          user.user_metadata && Object.keys(user.user_metadata).length > 0;

        if (!hasMetadata) {
          // No metadata = existing user
          return {
            data: null,
            error: {
              message:
                "An account with this email already exists. Please sign in instead.",
            },
          };
        }

        // Has metadata = treat as new signup (includes repeat signups for unconfirmed users)
      }

      return { data, error };
    } catch (error) {
      return {
        data: null,
        error: {
          message: "Network error. Please check your connection and try again.",
        },
      };
    }
  }

  public getErrorMessage(error: any): string {
    // Return the actual error message from Supabase, or a fallback
    return error?.message || "Failed to create account. Please try again.";
  }

  /**
   * Get information about email confirmation expiry
   * Supabase email confirmations typically expire after 24 hours by default
   * This can be configured in your Supabase Auth settings
   */
  public getEmailExpiryInfo(): {
    expiryHours: number;
    message: string;
    canResendAfterMinutes: number;
  } {
    return {
      expiryHours: 24, // Default Supabase setting
      message:
        "Confirmation emails expire after 24 hours. If your email has expired, you can sign up again to receive a new confirmation email.",
      canResendAfterMinutes: 1, // Wait at least 1 minute before allowing resend
    };
  }

  /**
   * Check if enough time has passed to allow resending confirmation email
   */
  public canResendConfirmation(lastSentAt: string): boolean {
    const lastSent = new Date(lastSentAt);
    const now = new Date();
    const timeDiff = now.getTime() - lastSent.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    return minutesDiff >= this.getEmailExpiryInfo().canResendAfterMinutes;
  }
}

export const signupController = new SignupController();
