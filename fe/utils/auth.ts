import { APP_CONFIG } from "@/constants/config";

/**
 * Check if user is authenticated
 */
export function isAuthenticated(request?: Request): boolean {
  if (typeof window !== "undefined") {
    // Client-side: check if cookie exists
    return document.cookie.includes(`${APP_CONFIG.COOKIES.REFRESH_TOKEN}=`);
  }

  // Server-side: check request cookies
  if (request) {
    const cookies = request.headers.get("cookie") || "";
    return cookies.includes(`${APP_CONFIG.COOKIES.REFRESH_TOKEN}=`);
  }

  return false;
}

/**
 * Parse cookies from cookie string
 */
export function parseCookies(cookieString: string): Record<string, string> {
  return cookieString
    .split(";")
    .map((cookie) => cookie.trim().split("="))
    .reduce((acc, [key, value]) => {
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<string, string>);
}

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;

  const cookies = parseCookies(document.cookie);
  return cookies[name] || null;
}
