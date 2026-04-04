import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

/**
 * Phase 42: Industrial Security & Rate Limiting Middleware
 * Enforces CSP/HSTS headers and Redis-backed volumetric protection.
 */
export async function proxy(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const path = request.nextUrl.pathname;
  
  // 1. Redis Rate Limiting
  // Skip rate limiting for static assets and internal next requests
  if (!path.startsWith("/_next") && !path.startsWith("/api/notifications")) {
    const rateLimitKey = `hokeos:ratelimit:${ip}`;
    const limit = 100; // 100 requests per 10 minutes
    const window = 600; // 10 minutes
    
    try {
      // Basic sliding window / counter in Redis
      // Note: In strict sovereign mode (no Redis), this effectively skips.
      const current = await redis.get<number>(rateLimitKey) || 0;
      
      if (current >= limit) {
        return new NextResponse("Too Many Requests (Industrial Rate Limit Exceeded)", { 
          status: 429,
          headers: { "Retry-After": "600" }
        });
      }
      
      await redis.set(rateLimitKey, current + 1, window);
    } catch (err) {
      // Fail open to ensure platform availability if Redis is degraded
      console.warn("[MIDDLEWARE-RATELIMIT-ERROR]", err);
    }
  }

  // 2. Security Headers
  const response = NextResponse.next();
  
  // Strict CSP
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, " ").trim();

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all paths except static files and public folder
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
