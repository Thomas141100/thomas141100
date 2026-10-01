import { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "crypto";
import { stringify } from "querystring";
import { SCOPES } from "../utils/spotify";
import { STATE_COOKIE, getRedirectUri, stateCookie } from "../utils/auth";

export default async function (req: VercelRequest, res: VercelResponse) {
  const state = randomBytes(16).toString("hex");
  const params = stringify({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: getRedirectUri(req),
    scope: SCOPES.join(" "),
    state,
  });

  res.setHeader("Set-Cookie", stateCookie(req, state, 600));
  res.writeHead(302, {
    Location: `https://accounts.spotify.com/authorize?${params}`,
  });
  return res.end();
}
