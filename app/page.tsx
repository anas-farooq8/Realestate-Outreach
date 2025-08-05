"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
              <span className="block">Real Estate</span>
              <span className="block text-blue-600">Outreach Made Simple</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-xl">
              Upload property PDFs, extract contact information automatically,
              and manage outreach campaigns with AI-powered tools.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="hidden lg:flex justify-center">
            <div className="h-96 w-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center relative">
              <Building2 className="h-32 w-32 text-white opacity-20" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
