import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });
client.on("error", (err) => console.error("Redis error", err));
let connecting: Promise<unknown> = null;

export async function getClient() {
  if (!client.isOpen) {
    connecting ??= client.connect().finally(() => (connecting = null));
    await connecting;
  }
  return client;
}
