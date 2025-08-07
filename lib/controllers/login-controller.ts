import { createClient } from "@/lib/supabase/client";

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginPageContent {
  title: string;
  subtitle: string;
  signupLink: {
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
    submitButton: {
      idle: string;
    };
  };
}

export class LoginController {
  private supabase = createClient();

  private readonly pageContent: LoginPageContent = {
    title: "Sign in to your account",
    subtitle: "Or",
    signupLink: {
      text: "create a new account",
      href: "/signup",
    },
    card: {
      title: "Login",
      description: "Enter your email and password to access your account",
    },
    form: {
      emailLabel: "Email address",
      passwordLabel: "Password",
      submitButton: {
        idle: "Sign in",
      },
    },
  };

  public getPageContent(): LoginPageContent {
    return this.pageContent;
  }

  public async signIn(formData: LoginFormData) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

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
    // Handle HTTP status-based errors
    if (error?.status === 400 || error?.message?.includes("400")) {
      return "Invalid email or password. Please check your credentials and try again.";
    }

    switch (error?.message) {
      case "Invalid login credentials":
        return "Invalid email or password. Please check your credentials and try again.";
      case "Email not confirmed":
        return "Please check your email and click the confirmation link before signing in.";
      case "Too many requests":
        return "Too many login attempts. Please wait a moment before trying again.";
      case "User not found":
        return "No account found with this email address.";
      case "Network error":
        return "Network error. Please check your connection and try again.";
      default:
        // For any other error, show a generic message
        if (
          error?.message?.toLowerCase().includes("credential") ||
          error?.message?.toLowerCase().includes("password") ||
          error?.message?.toLowerCase().includes("invalid")
        ) {
          return "Invalid email or password. Please check your credentials and try again.";
        }
        return (
          error?.message || "An unexpected error occurred. Please try again."
        );
    }
  }
}

export const loginController = new LoginController();
