"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useLoginController } from "@/hooks/use-login-controller";

export default function LoginPage() {
  const {
    formData,
    showPassword,
    isLoading,
    pageContent,
    updateFormField,
    togglePasswordVisibility,
    handleLogin,
  } = useLoginController();

  // Show full-page loading during login process
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600 absolute top-0"></div>
          </div>
          <p className="text-sm text-gray-600 font-medium">Signing In...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4">
        {/* Header Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {pageContent.title}
          </h2>
          <p className="text-gray-600">{pageContent.subtitle} </p>
        </div>

        {/* Login Card */}
        <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0 ring-1 ring-gray-200/50">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-semibold text-gray-900">
              {pageContent.card.title}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {pageContent.card.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  {pageContent.form.emailLabel}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateFormField("email", e.target.value)}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  disabled={isLoading}
                  placeholder="Enter your email address"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  {pageContent.form.passwordLabel}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      updateFormField("password", e.target.value)
                    }
                    className="h-11 pr-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                    disabled={isLoading}
                    minLength={6}
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 w-11 hover:bg-gray-100 transition-colors duration-200"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {pageContent.form.submitButton.idle}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
