import { VercelRequest, VercelResponse } from "@vercel/node";
import { getTokenFromCode } from "../utils/spotify";
import { setCachedAccessToken, setRefreshToken } from "../utils/tokenStore";
import { STATE_COOKIE, getRedirectUri, stateCookie } from "../utils/auth";

export default async function (req: VercelRequest, res: VercelResponse) {
  const { code, state, error } = req.query;
  const expectedState = req.cookies[STATE_COOKIE];
  res.setHeader("Set-Cookie", stateCookie(req, "", 0));

  if (error) {
    return res.status(400).send(`Spotify authorization failed: ${error}`);
  }
  if (typeof code !== "string" || !state || state !== expectedState) {
    return res.status(400).send("Invalid request, start again from /login");
  }

  let tokens: Awaited<ReturnType<typeof getTokenFromCode>>;
  try {
    tokens = await getTokenFromCode(code, getRedirectUri(req));
  } catch (err) {
    console.error(err);
    return res.status(502).send("Could not get a token from Spotify");
  }

  const me = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then((r) => r.json());

  const { SPOTIFY_ACCOUNT_ID } = process.env;
  if (!SPOTIFY_ACCOUNT_ID) {
    return res.status(500).send(`SPOTIFY_ACCOUNT_ID is not set (yours is "${me.account_id}")`);
  }
  if (!me.account_id || me.account_id !== SPOTIFY_ACCOUNT_ID) {
    return res.status(403).send("This Spotify account is not allowed");
  }

  await setRefreshToken(tokens.refresh_token);
  await setCachedAccessToken(tokens.access_token, tokens.expires_in);
  return res.status(200).send("Spotify authorized");
}
