// Read deployment evidence using the official CLI's existing authenticated session.
// Never read or print cached authentication tokens.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const target = process.argv[2] || 'office.vibedistro.com';
const expectedSha = process.argv[3];
if (!/^(dpl_[a-zA-Z0-9]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.test(target)) throw new Error('Use a deployment ID or hostname');
if (expectedSha && !/^[a-f0-9]{40}$/.test(expectedSha)) throw new Error('Expected SHA must be a full Git commit hash');
const cli = process.env.VERCEL_CLI_ENTRY || (process.env.APPDATA && path.join(process.env.APPDATA, 'npm/node_modules/vercel/dist/vc.js'));
if (!cli) throw new Error('Set VERCEL_CLI_ENTRY to the official vercel/dist/vc.js file');
const packageInfo = JSON.parse(fs.readFileSync(path.join(path.dirname(cli), '../package.json'), 'utf8'));
if (packageInfo.name !== 'vercel') throw new Error('Expected the official Vercel CLI package');
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const scope = process.env.VERCEL_SCOPE || project.orgId;
function command(args) {
  try {
    return JSON.parse(execFileSync(process.execPath, [cli, ...args, '--scope', scope], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch {
    throw new Error('Official CLI lookup failed; verify its existing login, scope and target');
  }
}
const summary = command(['inspect', target, '--format=json']);
if (!/^dpl_[a-zA-Z0-9]+$/.test(summary.id)) throw new Error('CLI did not return a deployment ID');
const deployment = command(['api', '/v13/deployments/' + summary.id, '--raw']);
const sha = deployment.gitSource?.sha || deployment.meta?.githubCommitSha;
console.log(JSON.stringify({ id: deployment.id, state: deployment.readyState, target: deployment.target, aliases: deployment.alias, sha }));
if (deployment.name !== project.projectName) throw new Error('Deployment belongs to another project');
if (expectedSha && sha !== expectedSha) throw new Error('Deployment does not contain the expected commit');
if (deployment.target !== 'production' || deployment.readyState !== 'READY') process.exitCode = 1;
