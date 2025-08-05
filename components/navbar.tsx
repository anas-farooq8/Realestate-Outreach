"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { dataCache } from "@/lib/cache";
import {
  Home,
  Upload,
  BarChart3,
  Mail,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface NavbarProps {
  children: React.ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { toast } = useToast();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get saved sidebar state
        const saved = localStorage.getItem("sidebarCollapsed");
        if (saved) {
          setSidebarCollapsed(JSON.parse(saved));
        }

        // Get initial user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        // Silently handle errors during initialization
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "Auth event:",
        event,
        "User:",
        session?.user?.email,
        "Pathname:",
        pathname
      );

      if (event === "SIGNED_OUT") {
        setIsSigningOut(true);
        setUser(null);
        setHasRedirected(false);
        // Clear cache safely when signing out
        dataCache.clearAllSafe();
        // Force redirect to home page
        window.location.href = "/";
      } else if (event === "SIGNED_IN" && !hasRedirected) {
        setUser(session?.user ?? null);
        setIsLoading(false);
        setIsSigningOut(false);
        // Handle redirects for authenticated users only on initial sign in
        if (session?.user) {
          const currentPath = window.location.pathname;
          const searchParams = new URLSearchParams(window.location.search);
          const redirectTo = searchParams.get("redirectTo");

          if (
            currentPath === "/login" ||
            currentPath === "/signup" ||
            currentPath === "/"
          ) {
            setHasRedirected(true);
            setIsRedirecting(true);
            const targetPath = redirectTo || "/dashboard";
            router.replace(targetPath);
            // Reset redirecting state after a short delay
            setTimeout(() => setIsRedirecting(false), 1000);
          }
        }
      } else if (event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
        setIsLoading(false);
        setIsSigningOut(false);
        // Don't redirect on token refresh
      } else {
        setUser(session?.user ?? null);
        setIsLoading(false);
        setIsSigningOut(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]); // Removed router and pathname from dependencies

  // Reset redirect flag when user navigates away from auth pages
  useEffect(() => {
    if (pathname !== "/login" && pathname !== "/signup" && pathname !== "/") {
      setHasRedirected(false);
    }
  }, [pathname]);

  // Save sidebar state to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        "sidebarCollapsed",
        JSON.stringify(sidebarCollapsed)
      );
    }
  }, [sidebarCollapsed, isLoading]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      setHasRedirected(false);
      // Clear cache before signing out to prevent errors
      dataCache.clearAllSafe();
      await supabase.auth.signOut();
      // Don't show toast during transition as it might cause flash
      // The auth state change will handle the redirect
    } catch (error) {
      setIsSigningOut(false);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/upload", label: "Upload Data", icon: Upload },
    { href: "/email-templates", label: "Email Templates", icon: Mail },
  ];

  const getUserInitials = (email: string) => {
    return email?.split("@")[0]?.substring(0, 2)?.toUpperCase() || "U";
  };

  const getUserDisplayName = (email: string) => {
    return email?.split("@")[0] || "User";
  };

  // Show loading spinner during initial load, sign out, or redirecting
  if (isLoading || isSigningOut || isRedirecting) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">
            {isSigningOut
              ? "Signing out..."
              : isRedirecting
              ? "Redirecting to dashboard..."
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Public navbar for non-authenticated users or during sign-out
  if (!user || isSigningOut) {
    // Safety check: if user is authenticated but we're on auth pages, show loading
    if (user && (pathname === "/login" || pathname === "/signup")) {
      return (
        <div className="flex h-screen bg-gray-50 items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">Redirecting...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    RealEstate Outreach
                  </span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Authenticated user layout with sidebar
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex lg:flex-col ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        } transition-all duration-300`}
      >
        <div className="flex flex-col flex-1 bg-white shadow-lg">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-700">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">
                  RealEstate Pro
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-white hover:bg-white/20 p-1.5"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-4 border-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">
                  RealEstate Pro
                </span>
              </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="flex items-center justify-between h-full px-6">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-gray-900">
                {navItems.find((item) => item.href === pathname)?.label ||
                  "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {getUserDisplayName(user?.email || "")}
                </p>
                <p className="text-xs text-gray-500">{user?.email || ""}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full border-2 border-gray-200 hover:border-blue-300"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                        {getUserInitials(user?.email || "")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                        {getUserInitials(user?.email || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">
                        {getUserDisplayName(user?.email || "")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-red-600"
                    disabled={isSigningOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>{" "}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
