"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  signupController,
  SignupFormData,
} from "@/lib/controllers/signup-controller";

export function useSignupController() {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const pageContent = signupController.getPageContent();

  const updateFormField = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationError = signupController.validateForm(formData);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await signupController.signUp(formData);

      if (error) {
        const message = signupController.getErrorMessage(error);
        toast({
          title: "Signup Failed",
          description: message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // If we get here without error, treat as successful signup
      toast({
        title: "Account Created!",
        description:
          "Please check your email to verify your account, then sign in.",
      });

      // Navigate to login
      router.push("/login");
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return {
    formData,
    showPassword,
    showConfirmPassword,
    isLoading,
    pageContent,
    updateFormField,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
    handleSignup,
  };
}
