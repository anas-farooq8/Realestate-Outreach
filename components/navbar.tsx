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
import { Home, Upload, BarChart3, Mail, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear all cache on logout
      dataCache.clearAll();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/email-templates", label: "Templates", icon: Mail },
  ];

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            } ${mobile ? "w-full" : ""}`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href={user ? "/dashboard" : "/"}
              className="flex items-center space-x-2"
            >
              <Home className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                RealEstate Outreach
              </span>
            </Link>

            {user && (
              <div className="hidden md:ml-8 md:flex md:space-x-4">
                <NavLinks />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Mobile menu */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-64">
                      <div className="flex flex-col space-y-4 mt-8">
                        <NavLinks mobile />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop user menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium text-sm">{user.email}</p>
                        <p className="text-xs text-muted-foreground">Account</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
