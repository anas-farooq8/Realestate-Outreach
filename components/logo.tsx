"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark" | "colored";
  showText?: boolean;
  clickable?: boolean;
  href?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
};

export function Logo({
  size = "md",
  variant = "colored",
  showText = true,
  clickable = true,
  href = "/",
  className,
}: LogoProps) {
  const logoElement = (
    <div className={cn("flex items-center space-x-2 md:space-x-3", className)}>
      <div className={cn(
        "relative flex-shrink-0 rounded-lg p-1.5",
        variant === "light" && "bg-white/20",
        variant === "dark" && "bg-gray-900/20",
        variant === "colored" && "bg-gradient-to-br from-blue-500 to-blue-600"
      )}>
        <Home
          className={cn(
            sizeClasses[size],
            variant === "light" && "text-white",
            variant === "dark" && "text-gray-900",
            variant === "colored" && "text-white"
          )}
        />
      </div>
      {showText && (
        <span
          className={cn(
            "font-bold leading-tight",
            textSizeClasses[size],
            variant === "light" && "text-white",
            variant === "dark" && "text-gray-900",
            variant === "colored" && "text-gray-900"
          )}
        >
          RealEstate OutReach
        </span>
      )}
    </div>
  );

  if (clickable) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-80">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}

// Alternative compact version for tight spaces
export function CompactLogo({
  size = "sm",
  variant = "colored",
  className,
}: Omit<LogoProps, "showText" | "clickable" | "href">) {
  return (
    <div className={cn(
      "relative flex-shrink-0 rounded-lg p-1.5",
      variant === "light" && "bg-white/20",
      variant === "dark" && "bg-gray-900/20", 
      variant === "colored" && "bg-gradient-to-br from-blue-500 to-blue-600",
      className
    )}>
      <Home
        className={cn(
          sizeClasses[size],
          variant === "light" && "text-white",
          variant === "dark" && "text-gray-900",
          variant === "colored" && "text-white"
        )}
      />
    </div>
  );
}
