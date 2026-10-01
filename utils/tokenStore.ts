import { getClient } from "./redis";

const REFRESH_TOKEN_KEY = "spotify:refresh_token";
const ACCESS_TOKEN_KEY = "spotify:access_token";

export async function getRefreshToken() {
  const redis = await getClient();
  const token = (await redis.get(REFRESH_TOKEN_KEY)) as string;
  return token ?? process.env.SPOTIFY_REFRESH_TOKEN;
}

export async function setRefreshToken(token: string) {
  const redis = await getClient();
  await redis.set(REFRESH_TOKEN_KEY, token);
  await redis.del(ACCESS_TOKEN_KEY);
}

export async function getCachedAccessToken() {
  const redis = await getClient();
  return (await redis.get(ACCESS_TOKEN_KEY)) as string;
}

export async function setCachedAccessToken(token: string, expiresIn: number) {
  const redis = await getClient();
  await redis.set(ACCESS_TOKEN_KEY, token, { EX: expiresIn - 60 });
}
