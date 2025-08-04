import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, BarChart3, Mail, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Real Estate Outreach
            <span className="text-blue-600"> Automation</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Upload images of property lists, extract community names with AI, and automatically enrich them with HOA and
            property management contact information.
          </p>
          <div className="space-x-4">
            <Link href="/signup">
              <Button size="lg" className="px-8 py-3">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8 py-3 bg-transparent">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Upload className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Image Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload images containing property or community names and let AI extract them automatically.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>AI Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Powered by Gemini AI to find HOA and property management contact information for each community.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get notified via email when your property data enrichment process is complete.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <CardTitle>Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your data is secure with authentication, encryption, and privacy protection built-in.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                1
              </div>
              <h3 className="text-xl font-semibold">Upload Image</h3>
              <p className="text-gray-600">Upload an image containing property or community names from your device.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                2
              </div>
              <h3 className="text-xl font-semibold">Review & Edit</h3>
              <p className="text-gray-600">
                AI extracts property names which you can review, edit, and verify before processing.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                3
              </div>
              <h3 className="text-xl font-semibold">Get Results</h3>
              <p className="text-gray-600">
                Receive enriched contact data with management companies, emails, and phone numbers.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
              <CardDescription>
                Join thousands of real estate professionals who are automating their outreach process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/signup">
                <Button size="lg" className="w-full">
                  Create Free Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
