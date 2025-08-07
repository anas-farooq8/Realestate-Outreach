"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Mail, FileText, BarChart3, ArrowRight } from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: Upload,
      title: "Extract Property Names",
      description:
        "Upload property photos and extract names using Gemini AI to find property information automatically.",
    },
    {
      icon: Mail,
      title: "CRUD Email Templates",
      description:
        "Create, edit, and manage email templates that can be sent to all property managers.",
    },
    {
      icon: FileText,
      title: "Amenity Proposals",
      description:
        "Select and send amenity proposals to property managers who reply to your outreach emails.",
    },
    {
      icon: BarChart3,
      title: "Dashboard & Email Logs",
      description:
        "View comprehensive dashboard with analytics and monitor all email activities and logs.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
              <span className="block mb-1">Real Estate</span>
              <span className="block text-blue-600">Outreach Automation</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Automate your property manager outreach with AI-powered tools.
              Extract data, manage templates, send proposals, and track results.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Powerful Automation Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to streamline your real estate outreach
              process with n8n workflows
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200"
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-blue-600 rounded-lg">
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start?
          </h2>
          <p className="text-lg text-blue-100 mb-6">
            Automated email sending powered by n8n workflows. Join now and
            streamline your outreach process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto px-8 py-3"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
