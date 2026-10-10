// Run against an explicitly supplied application using disposable audit accounts.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

config({ path: '.env.local', quiet: true });
const origin = process.argv[2];
if (!origin || !['http:', 'https:'].includes(new URL(origin).protocol)) {
  throw Error('Usage: node scripts/audit-system.mjs <application-origin>');
}
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const directory = mkdtempSync(join(tmpdir(), 'vibeoffice-audit-'));
const accountFile = join(directory, 'accounts.json');
const accounts = [];
function checked(result, label) {
  if (result.error) throw Error(label + ': ' + result.error.message);
  return result.data;
}
function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join('scripts', script), ...args], {
      env: { ...process.env, OFFICE_AUDIT_ACCOUNTS: accountFile }, stdio: 'inherit', windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(Error(script + ' exited ' + code)));
  });
}

try {
  for (const role of ['Admin', 'Gerente']) {
    const email = 'audit-system-' + randomUUID() + '@example.invalid';
    const password = randomUUID() + '!';
    const { user } = checked(await service.auth.admin.createUser({
      email, password, email_confirm: true, app_metadata: { office_enabled: true },
      user_metadata: { name: 'AUDITORIA SISTEMA ' + role },
    }), 'create temporary account');
    accounts.push({ email, password, id: user.id, role });
    checked(await service.from('users').update({ role, active: true }).eq('id', user.id), 'configure temporary role');
  }
  writeFileSync(accountFile, JSON.stringify(accounts), { mode: 0o600 });
  const failed = [];
  for (const [script, args] of [
    ['audit-database.mjs', []], ['audit-http.mjs', [origin]],
    ['audit-access.mjs', [origin]], ['audit-drive.mjs', [origin]], ['audit-mfa.mjs', []],
  ]) {
    try { await run(script, args); }
    catch (error) { failed.push(script); console.error(error.message); }
  }
  if (failed.length) throw Error('Failed suites: ' + failed.join(', '));
  console.log('SYSTEM AUDIT COMPLETE');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  for (const account of accounts.reverse()) {
    const removed = await service.auth.admin.deleteUser(account.id);
    if (removed.error) { console.error('Temporary account cleanup failed: ' + removed.error.message); process.exitCode = 1; }
  }
  rmSync(directory, { recursive: true, force: true });
  console.log('Temporary audit credentials removed');
}
