import { kv } from "@vercel/kv";

const KEY = "noriuchi:sessions";

// Fallback in-memory store for local dev without KV configured.
let memStore = null;
function hasKV() {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

export async function readSessions() {
  if (hasKV()) {
    const data = await kv.get(KEY);
    return Array.isArray(data) ? data : [];
  }
  if (memStore === null) memStore = [];
  return memStore;
}

export async function writeSessions(sessions) {
  if (hasKV()) {
    await kv.set(KEY, sessions);
    return;
  }
  memStore = sessions;
}
