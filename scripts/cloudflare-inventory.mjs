import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Static inventory only: this script never connects to either provider.
export function inspectSource(source, file = 'input.ts') {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const calls = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const { expression: receiver, name } = node.expression
      const method = name.text
      const receiverText = receiver.getText(tree)
      let kind
      if (method === 'from' && /\.storage$/.test(receiverText)) kind = 'storage'
      else if (method === 'from' && receiverText !== 'Array' && receiverText !== 'Buffer') kind = 'table'
      else if (method === 'rpc') kind = 'rpc'
      else if (method === 'channel' || method === 'removeChannel') kind = 'realtime'
      else if (/\.auth(?:\.[a-zA-Z]+)*$/.test(receiverText)) kind = 'auth'
      if (kind) {
        const arg = node.arguments[0]
        const literal = arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))
        calls.push({ kind, method, target: literal ? arg.text : null,
          dynamic: !literal && ['table', 'storage', 'rpc'].includes(kind),
          file, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return calls
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : filesUnder(file)
      return /\.(?:[cm]?[jt]sx?|sql)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name) ? [file] : []
    })
}

export function buildInventory(root) {
  const calls = filesUnder(path.join(root, 'src')).filter(file => !file.endsWith('.sql'))
    .flatMap(file => inspectSource(fs.readFileSync(file, 'utf8'), path.relative(root, file).replaceAll('\\', '/')))
  const migrations = filesUnder(path.join(root, 'supabase', 'migrations')).filter(file => file.endsWith('.sql'))
  const sql = migrations.map(file => fs.readFileSync(file, 'utf8')).join('\n')
  // This is discovery, not a SQL converter. Live schema/ACL export remains required.
  const names = pattern => [...new Set([...sql.matchAll(pattern)].map(match => match[1]))].sort()
  const uniqueTargets = kind => [...new Set(calls.filter(call => call.kind === kind && call.target).map(call => call.target))].sort()
  return {
    version: 1,
    source: 'repository-only; not a live database audit',
    summary: {
      sourceFiles: new Set(calls.map(call => call.file)).size,
      calls: calls.length,
      callsByKind: Object.fromEntries(['table', 'rpc', 'storage', 'auth', 'realtime'].map(kind => [kind, calls.filter(call => call.kind === kind).length])),
      dynamicCallsRequiringReview: calls.filter(call => call.dynamic).length,
    },
    tablesInMigrations: names(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z_0-9]*)/gi),
    functionsInMigrations: names(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z_0-9]*)/gi),
    tablesUsedByApplication: uniqueTargets('table'),
    rpcsUsedByApplication: uniqueTargets('rpc'),
    storageBucketsUsedByApplication: uniqueTargets('storage'),
    migrationFiles: migrations.map(file => path.relative(root, file).replaceAll('\\', '/')),
    calls,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const report = buildInventory(root)
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
}
