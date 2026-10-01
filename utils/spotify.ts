import fetch from "isomorphic-unfetch";
import { stringify } from "querystring";
import { URLSearchParams } from 'url';
import {
  getCachedAccessToken,
  getRefreshToken,
  setCachedAccessToken,
  setRefreshToken,
} from "./tokenStore";

const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
} = process.env;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
const Authorization = `Basic ${basic}`;
const BASE_URL = `https://api.spotify.com/v1`;

export const SCOPES = [
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-top-read",
];

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  error?: string;
};

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const url = new URL("https://accounts.spotify.com/api/token");
  const response = await fetch(`${url}`, {
    method: "POST",
    headers: {
      Authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: stringify(params),
  }).then((r) => r.json());

  if (response.error) {
    throw new Error(`Spotify token request failed: ${response.error}, visit /login`);
  }
  return response;
}

export async function getTokenFromCode(code: string, redirect_uri: string) {
  return requestToken({ grant_type: "authorization_code", code, redirect_uri });
}

async function getAuthorizationToken() {
  const cached = await getCachedAccessToken();
  if (cached) {
    return `Bearer ${cached}`;
  }

  const refresh_token = await getRefreshToken();
  if (!refresh_token) {
    throw new Error("No Spotify refresh token stored, visit /login");
  }

  const response = await requestToken({ grant_type: "refresh_token", refresh_token });
  if (response.refresh_token) {
    await setRefreshToken(response.refresh_token);
  }
  await setCachedAccessToken(response.access_token, response.expires_in);

  return `Bearer ${response.access_token}`;
}

const NOW_PLAYING_ENDPOINT = `/me/player/currently-playing`;
export async function nowPlaying(): Promise<Partial<SpotifyApi.CurrentlyPlayingResponse>> {
  let Authorization: string;
  try {
    Authorization = await getAuthorizationToken();
  } catch (err) {
    console.error(err);
    return {};
  }
  const response = await fetch(`${BASE_URL}${NOW_PLAYING_ENDPOINT}`, {
    headers: {
      Authorization,
    },
  });
  const { status } = response;
  if (status === 200) {
    return response.json();
  }
  if (status !== 204) {
    console.error(`Spotify now-playing request failed with status ${status}`);
  }
  return {};
}

const TOP_TRACKS_ENDPOINT = `/me/top/tracks`;
export async function topTrack({ index, timeRange = 'short_term' }: { index: number, timeRange?: 'long_term'|'medium_term'|'short_term' }): Promise<SpotifyApi.TrackObjectFull> {
  let Authorization: string;
  try {
    Authorization = await getAuthorizationToken();
  } catch (err) {
    console.error(err);
    return null;
  }
  const params = new URLSearchParams();
  params.set('limit', '1');
  params.set('offset', `${index}`);
  params.set('time_range', `${timeRange}`);
  const response = await fetch(`${BASE_URL}${TOP_TRACKS_ENDPOINT}?${params}`, {
    headers: {
      Authorization
    },
  });
  const { status } = response;
  if (status === 204) {
    return null;
  } else if (status === 200) {
    const data = await response.json() as SpotifyApi.UsersTopTracksResponse;
    return data.items[0];
  }
  console.error(`Spotify top-tracks request failed with status ${status}`);
  return null;
}
