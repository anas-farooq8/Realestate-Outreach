"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Mail, Globe } from "lucide-react";
import { useHomeController } from "@/hooks/use-home-controller";

export default function HomePage() {
  const { features, heroContent, featuresContent, ctaContent } =
    useHomeController();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-32 right-10 w-32 h-32 bg-indigo-200/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-blue-300/25 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <div className="text-center">
            {/* Mobile-optimized hero title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
              <span className="block mb-2">{heroContent.title.main}</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                {heroContent.title.accent}
              </span>
            </h1>

            {/* Mobile-optimized description */}
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed mb-4 px-4 sm:px-0">
              {heroContent.description}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {featuresContent.title}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              {featuresContent.description}
            </p>
          </div>

          {/* Mobile-first grid layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-blue-300 cursor-pointer bg-white"
              >
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-blue-200 transition-shadow">
                        <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
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
      <section className="py-8 sm:py-10 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            {ctaContent.title}
          </h2>
          <p className="text-base sm:text-lg text-blue-100 mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
            {ctaContent.description}
          </p>

          {/* Mobile-optimized CTA buttons */}
          <div className="flex justify-center">
            <Link href={ctaContent.cta.href} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto px-8 py-4 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-white text-blue-700 hover:bg-gray-50"
              >
                {ctaContent.cta.text}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Section - Mobile optimized */}
      <footer className="bg-gray-50 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                Total Body Mobile Massage
              </h3>
              <p className="text-gray-600 mb-3 text-sm sm:text-base">
                Professional Outreach Team
              </p>

              {/* Contact Information with Icons - Mobile Optimized */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-center sm:items-center sm:gap-8">
                <a
                  href="mailto:tbmoutreach@gmail.com"
                  className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm sm:text-base">
                    tbmoutreach@gmail.com
                  </span>
                </a>
                <a
                  href="https://totalbodymobilemassage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50"
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm sm:text-base">
                    totalbodymobilemassage.com
                  </span>
                </a>
              </div>
            </div>
            <div className="pt-6 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-500">
                © 2025 RealEstate OutReach. Built for professional outreach
                teams.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
