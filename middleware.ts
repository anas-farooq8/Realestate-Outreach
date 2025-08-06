import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // Refresh session if expired
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Define protected routes
    const protectedRoutes = [
      "/dashboard",
      "/upload",
      "/email-templates",
      "/proposals",
    ];
    const authRoutes = ["/login", "/signup", "/"];

    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAuthRoute = authRoutes.includes(pathname);

    // If there's an auth error or no user, and trying to access protected routes
    if ((error || !user) && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      // Removed the redirectTo parameter - no query params added
      return NextResponse.redirect(url);
    }

    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (user && !error && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // For all other cases, let the request continue
    return supabaseResponse;
  } catch (error) {
    // If there's an unexpected error, let the request continue
    // Client-side auth will handle the user state
    console.error("Middleware auth error:", error);
    return supabaseResponse;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
