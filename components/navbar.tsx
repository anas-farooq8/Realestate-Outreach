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
import { useCachedAuth } from "@/hooks/use-cached-data";
import {
  Home,
  Upload,
  BarChart3,
  Mail,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  FileText,
  UserPlus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavbarProps {
  children: React.ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  const { user, isRootUser, isLoading, isAuthInitialized } = useCachedAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { toast } = useToast();

  // Check if we're on protected routes
  const protectedRoutes = [
    "/dashboard",
    "/upload",
    "/email-templates",
    "/proposals",
    "/invite",
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Initialize sidebar state only
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Handle sign out and clear cache on auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setIsSigningOut(true);
        // Clear cache safely when signing out
        dataCache.clearAllSafe();
        // Force redirect to home page
        window.location.href = "/";
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Save sidebar state to localStorage
  useEffect(() => {
    if (!isLoading && typeof window !== "undefined") {
      localStorage.setItem(
        "sidebarCollapsed",
        JSON.stringify(sidebarCollapsed)
      );
    }
  }, [sidebarCollapsed, isLoading]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      // Clear cache and invalidate user ID cache before signing out to prevent errors
      dataCache.invalidateUserIdCache();
      dataCache.clearAllSafe();
      await supabase.auth.signOut();

      // Use window.location.replace to clear browser history
      // This prevents users from navigating back to protected pages
      window.location.replace("/");
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
    { href: "/proposals", label: "PDF Proposals", icon: FileText },
  ];

  const getUserInitials = (email: string) => {
    return email?.split("@")[0]?.substring(0, 2)?.toUpperCase() || "U";
  };

  const getUserDisplayName = (email: string) => {
    return email?.split("@")[0] || "User";
  };

  /* 
  // Show loading spinner during initial load, sign out, or when auth not initialized
  if (isLoading || isSigningOut || !isAuthInitialized) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">
            {isSigningOut ? "Signing out..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }
  */

  // For protected routes, only show authenticated layout

  if (isProtectedRoute) {
    // If user is not authenticated on protected route, show loading
    // (middleware should redirect, but this prevents flashing)

    /*
    if (!user) {
      return (
        <div className="flex h-screen bg-gray-50 items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }
    */

    // Show authenticated layout for protected routes
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
                    RealEstate OutReach
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

            {/* Admin Section - Only visible to root user */}
            {isRootUser && (
              <>
                <div className="px-4">
                  <hr className="border-gray-200" />
                </div>
                <div className="px-4 py-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-4">
                    {sidebarCollapsed ? "Admin" : "Administration"}
                  </p>
                  <Link
                    href="/invite"
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === "/invite"
                        ? "bg-green-50 text-green-700 border-r-4 border-green-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    title={sidebarCollapsed ? "Invite User" : undefined}
                  >
                    <UserPlus className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>Invite User</span>}
                  </Link>
                </div>
              </>
            )}

            {/* Company Information */}
            {!sidebarCollapsed && (
              <div className="px-4 pb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div className="text-center space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">
                      Total Body Mobile Massage
                    </h4>
                    <p className="text-xs text-gray-600 font-medium">
                      Outreach Team
                    </p>
                    <div className="space-y-1">
                      <a
                        href="mailto:tbmmoutreach@gmail.com"
                        className="block text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        tbmmoutreach@gmail.com
                      </a>
                      <a
                        href="https://www.totalbodymobilemassage.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        www.totalbodymobilemassage.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full bg-white">
              <div className="flex items-center h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white">
                    RealEstate OutReach
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

              {/* Admin Section - Mobile */}
              {isRootUser && (
                <>
                  <div className="px-4">
                    <hr className="border-gray-200" />
                  </div>
                  <div className="px-4 py-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-4">
                      Administration
                    </p>
                    <Link
                      href="/invite"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        pathname === "/invite"
                          ? "bg-green-50 text-green-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <UserPlus className="h-5 w-5" />
                      <span>Invite User</span>
                    </Link>
                  </div>
                </>
              )}

              {/* Company Information */}
              <div className="px-4 pb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div className="text-center space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">
                      Total Body Mobile Massage
                    </h4>
                    <p className="text-xs text-gray-600 font-medium">
                      Outreach Team
                    </p>
                    <div className="space-y-1">
                      <a
                        href="mailto:tbmmoutreach@gmail.com"
                        className="block text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        tbmmoutreach@gmail.com
                      </a>
                      <a
                        href="https://www.totalbodymobilemassage.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        www.totalbodymobilemassage.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
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
                  {(() => {
                    // Handle special admin routes
                    if (pathname === "/invite") return "Invite User";

                    // Handle regular nav items
                    const navItem = navItems.find(
                      (item) => item.href === pathname
                    );
                    return navItem?.label || "Dashboard";
                  })()}
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
                      <span>
                        {isSigningOut ? "Signing out..." : "Sign out"}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    );
  }

  // For non-protected routes, show public layout only if user is not authenticated
  if (!user) {
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
                    RealEstate OutReach
                  </span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Log In
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

  // If user is authenticated but on non-protected route, show loading
  // (middleware should redirect them)
  /*
  return (
    <div className="flex h-screen bg-gray-50 items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
  */
}
