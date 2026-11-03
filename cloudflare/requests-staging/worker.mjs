import { requestTypes } from '../../src/lib/request-types.ts';

const actors = {
  requester: 'Administrativo',
  phonograms: 'Análise de fonogramas',
  marketing: 'Marketing',
};
const response = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
const encoder = new TextEncoder();
async function authenticate(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token) return null;
  let credentials;
  try { credentials = JSON.parse(env.STAGING_TOKEN_HASHES); } catch { return null; }
  if (!credentials || typeof credentials !== 'object') return null;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
  const hash = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  for (const [id, sector] of Object.entries(actors)) {
    const expected = credentials[id];
    if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) continue;
    let difference = 0;
    for (let i = 0; i < 64; i++) difference |= expected.charCodeAt(i) ^ hash.charCodeAt(i);
    if (difference === 0) return { id, sector };
  }
  return null;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const method = request.method;
    const actor = await authenticate(request, env);
    if (!actor) return response({ error: 'Credencial de homologação necessária' }, 401);
    try {
      if (method === 'GET' && path === '/catalog') return response(requestTypes);
      if (method === 'GET' && path === '/requests') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM staging_requests WHERE requester = ? OR sector = ? ORDER BY created_at DESC, id LIMIT 100'
        ).bind(actor.id, actor.sector).all();
        return response(results);
      }
      if (method === 'POST' && path === '/requests') {
        const input = await request.json().catch(() => null);
        const type = requestTypes.find(item => item.id === input?.type);
        const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
        if (!type || reason.length < 10 || reason.length > 5000
          || !validDate(input.startDate) || !validDate(input.endDate) || input.endDate < input.startDate) {
          return response({ error: 'Informe tipo, motivo (10 a 5000 caracteres) e período válido' }, 400);
        }
        const row = await env.DB.prepare(
          'INSERT INTO staging_requests (id, requester, type, sector, reason, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *'
        ).bind(crypto.randomUUID(), actor.id, type.id, type.sector, reason, input.startDate, input.endDate).first();
        return response(row, 201);
      }
      const id = path.match(/^\/requests\/([a-f0-9-]{36})\/decision$/)?.[1];
      if (method === 'POST' && id) {
        const { decision } = await request.json().catch(() => null) ?? {};
        if (!['accepted', 'rejected'].includes(decision)) return response({ error: 'Resposta inválida' }, 400);
        const row = await env.DB.prepare(
          `UPDATE staging_requests SET decision = ?, responded_by = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE id = ? AND sector = ? AND decision = 'pending' RETURNING *`
        ).bind(decision, actor.id, id, actor.sector).first();
        if (row) return response(row);
        const visible = await env.DB.prepare('SELECT id FROM staging_requests WHERE id = ? AND sector = ?').bind(id, actor.sector).first();
        return visible ? response({ error: 'Solicitação já respondida' }, 409) : response({ error: 'Solicitação indisponível' }, 404);
      }
      return response({ error: 'Rota inexistente' }, 404);
    } catch {
      return response({ error: 'Erro no banco de homologação' }, 500);
    }
  },
};
