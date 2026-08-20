// Workspace persistence: server (Cloudflare D1 via /api/state) with a
// localStorage fallback so the app also works as a pure static site.

const LS_KEY = "hwk-dl-state-v1";

export function loadLocal() {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt/unavailable storage */ }
  return null;
}

export function saveLocal(state) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

// Resolves with { logs, workflows, version } when the API is reachable
// (even if empty), or throws when there's no backend (e.g. static hosting).
export async function loadRemote() {
  const res = await fetch("/api/state", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("API unavailable (" + res.status + ")");
  return res.json();
}

export async function saveRemote(state) {
  const res = await fetch("/api/state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error("Save failed (" + res.status + ")");
  return res.json();
}
