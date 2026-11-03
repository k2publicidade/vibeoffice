import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import worker from './worker.mjs';

test('request routing, privacy, validation and one-time decision', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('./migrations/0001_requests.sql', import.meta.url), 'utf8'));
    const tokens = Object.fromEntries(['requester','phonograms','marketing'].map(id => [id, randomBytes(32).toString('base64url')]));
    const env = {
      STAGING_TOKEN_HASHES: JSON.stringify(Object.fromEntries(Object.entries(tokens).map(([id, token]) => [id, createHash('sha256').update(token).digest('hex')]))),
      DB: { prepare: sql => ({ bind: (...args) => ({
        first: async () => db.prepare(sql).get(...args),
        all: async () => ({ results: db.prepare(sql).all(...args) }),
      }) }) },
    };
    const call = (actor, path, payload) => worker.fetch(new Request('https://staging.invalid' + path, {
      method: payload ? 'POST' : 'GET',
      headers: actor ? { Authorization: 'Bearer ' + tokens[actor] } : {},
      body: payload ? JSON.stringify(payload) : undefined,
    }), env);
    const request = { type: 'phonogram-review', sector: 'Marketing', requester: 'marketing', reason: 'Analisar gravação sintética', startDate: '2026-11-03', endDate: '2026-11-04' };
    assert.equal((await call(null, '/requests')).status, 401);
    assert.equal((await call('requester', '/requests', { ...request, startDate: '2026-02-30' })).status, 400);
    const created = await call('requester', '/requests', request);
    assert.equal(created.status, 201);
    const item = await created.json();
    assert.equal(item.requester, 'requester');
    assert.equal(item.sector, 'Análise de fonogramas');
    assert.ok(item.created_at);
    assert.deepEqual(await (await call('marketing', '/requests')).json(), []);
    const decision = '/requests/' + item.id + '/decision';
    assert.equal((await call('marketing', decision, { decision: 'accepted' })).status, 404);
    assert.equal((await call('requester', decision, { decision: 'accepted' })).status, 404);
    assert.equal((await (await call('phonograms', '/requests')).json())[0].id, item.id);
    const outcomes = await Promise.all(['accepted','rejected'].map(value => call('phonograms', decision, { decision: value })));
    assert.deepEqual(outcomes.map(r => r.status).sort(), [200,409]);
    const winner = await outcomes.find(r => r.status === 200).json();
    assert.equal(winner.responded_by, 'phonograms');
    assert.ok(winner.responded_at);
    assert.equal((await (await call('requester', '/requests')).json())[0].decision, winner.decision);
    const second = await (await call('requester', '/requests', request)).json();
    const rejected = await call('phonograms', '/requests/' + second.id + '/decision', { decision: 'rejected' });
    assert.equal((await rejected.json()).decision, 'rejected');
  } finally { db.close(); }
});
