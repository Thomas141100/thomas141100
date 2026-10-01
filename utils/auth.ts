import { VercelRequest } from "@vercel/node";

export const STATE_COOKIE = "spotify_auth_state";

export function getRedirectUri(req: VercelRequest) {
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${req.headers.host}/callback`;
}

export function stateCookie(req: VercelRequest, value: string, maxAge: number) {
  const secure = getRedirectUri(req).startsWith("https://") ? "; Secure" : "";
  return `${STATE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
