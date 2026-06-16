// Cloudflare Pages Function: GET/PUT the shared workspace, stored in D1.
// Bound D1 database is available as env.DB (see wrangler.toml).
//
// The whole workspace ({ logs, workflows }) is stored as one JSON document in a
// single row. This mirrors the app's in-memory shape, gives the team a shared,
// persistent store, and can be normalized into per-entity tables later.

interface Env {
  DB: D1Database;
}

const WORKSPACE_ID = "default";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Cloudflare Access puts the signed-in user's email in this header.
const userEmail = (request: Request) =>
  request.headers.get("cf-access-authenticated-user-email") || null;

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare(
    "SELECT data, version, updated_at, updated_by FROM workspace WHERE id = ?"
  ).bind(WORKSPACE_ID).first<{ data: string; version: number; updated_at: string; updated_by: string | null }>();

  if (!row) return json({ logs: null, workflows: null, version: 0 });

  let parsed: { logs?: unknown; workflows?: unknown } = {};
  try { parsed = JSON.parse(row.data); } catch { parsed = {}; }
  return json({
    logs: parsed.logs ?? null,
    workflows: parsed.workflows ?? null,
    version: row.version,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  let body: { logs?: unknown; workflows?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const data = JSON.stringify({ logs: body.logs ?? [], workflows: body.workflows ?? [] });
  const now = new Date().toISOString();
  const email = userEmail(request);

  await env.DB.prepare(
    `INSERT INTO workspace (id, data, version, updated_at, updated_by)
       VALUES (?1, ?2, 1, ?3, ?4)
     ON CONFLICT(id) DO UPDATE SET
       data = ?2, version = version + 1, updated_at = ?3, updated_by = ?4`
  ).bind(WORKSPACE_ID, data, now, email).run();

  const row = await env.DB.prepare("SELECT version FROM workspace WHERE id = ?")
    .bind(WORKSPACE_ID).first<{ version: number }>();

  return json({ ok: true, version: row?.version ?? 1, updatedAt: now, updatedBy: email });
};
