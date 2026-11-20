import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

const localAuthBypassEnabled =
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";

function isLocalAuthBypassRequest(req: NextRequest) {
  return (
    localAuthBypassEnabled &&
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(req.nextUrl.hostname)
  );
}

export default withAuth(
  function middleware(req) {
    // Keep the temporary bypass limited to a local development server.
    if (isLocalAuthBypassRequest(req)) {
      return NextResponse.next();
    }

    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = (token?.role as string)?.toUpperCase();

    // Role-based route authorization
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (path.startsWith("/hod") && role !== "HOD" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (
      path.startsWith("/teacher") &&
      !["TEACHER", "FACULTY", "STAFF", "HOD", "ADMIN"].includes(role)
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/",
    },
    callbacks: {
      authorized: ({ req, token }) => {
        return isLocalAuthBypassRequest(req) || !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/hod/:path*",
    "/teacher/:path*",
    "/student/:path*",
  ],
};
