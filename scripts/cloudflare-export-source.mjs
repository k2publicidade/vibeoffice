import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { config } from 'dotenv'

export const quoteIdentifier = value => '"' + value.replaceAll('"', '""') + '"'
const fileName = (schema, table) => `${encodeURIComponent(schema)}-${encodeURIComponent(table)}.ndjson`

function saveJson(directory, name, value) {
  const bytes = JSON.stringify(value, null, 2) + '\n'
  fs.writeFileSync(path.join(directory, name), bytes, { flag: 'wx', mode: 0o600 })
  return { file: name, format: 'json', bytes: Buffer.byteLength(bytes), sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
}

// Client must already be connected. The source is queried inside one read-only,
// repeatable-read transaction. No fixture, schema or user is created or changed.
export async function exportSnapshot(client, directory, { includeAuth = false } = {}) {
  fs.mkdirSync(directory, { mode: 0o700 }) // Existing snapshots must never be overwritten.
  const manifest = {
    version: 1, complete: false, capturedAt: new Date().toISOString(),
    scope: { publicTables: true, authAccounts: includeAuth, authSessions: false, storageMetadata: true, storageBlobs: false },
    files: [],
    limitations: [
      'Storage object bytes must be exported and verified separately before cutover.',
      'Auth sessions and recovery/confirmation tokens are intentionally not migrated.',
      'MFA enrollment must be preserved or replaced by an explicit enrollment workflow; never disable it silently.',
      'This snapshot is not a PostgreSQL physical backup or a runnable D1 schema.',
      'Freeze source writes for the final export; this snapshot does not capture later changes.',
    ],
  }
  const manifestPath = path.join(directory, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 })
  let transaction = false
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    transaction = true
    // PostgreSQL does not bypass RLS with this setting: it raises an error if
    // the export role would see filtered rows. A partial backup must not pass.
    await client.query('SET LOCAL row_security = off')
    const metadata = {}
    const queries = {
      columns: `SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default,
        character_maximum_length,numeric_precision,numeric_scale,datetime_precision,domain_schema,domain_name,
        is_identity,identity_generation,is_generated,generation_expression
        FROM information_schema.columns WHERE table_schema IN ('public','storage','auth') ORDER BY table_schema,table_name,ordinal_position`,
      constraints: `SELECT n.nspname AS schema,t.relname AS table_name,c.conname,c.contype,c.convalidated,pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        WHERE n.nspname='public' ORDER BY t.relname,c.conname`,
      indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`,
      views: `SELECT schemaname,viewname,definition FROM pg_views WHERE schemaname='public' ORDER BY viewname`,
      sequences: `SELECT schemaname,sequencename,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size
        FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`,
      grants: `SELECT * FROM information_schema.role_table_grants WHERE table_schema IN ('public','storage') ORDER BY table_schema,table_name,grantee,privilege_type`,
      policies: `SELECT * FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname`,
      functions: `SELECT p.proname,p.proacl::text AS privileges,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY p.proname,p.oid`,
      triggers: `SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid) AS definition
        FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
      tables: `SELECT n.nspname AS schema,c.relname AS name,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition ORDER BY c.relname`,
      enums: `SELECT n.nspname AS schema,t.typname,e.enumlabel,e.enumsortorder FROM pg_enum e
        JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace
        WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`,
    }
    for (const [name, sql] of Object.entries(queries)) metadata[name] = (await client.query(sql)).rows
    manifest.files.push(saveJson(directory, 'schema.json', metadata))

    const tables = metadata.tables.map(table => ({ schema: table.schema, name: table.name }))
    // Supabase Storage inventory is needed even when an application table contains
    // only a path/reference. Missing access aborts the export instead of skipping it.
    tables.push({ schema: 'storage', name: 'buckets' }, { schema: 'storage', name: 'objects' })
    if (includeAuth) {
      tables.push({ schema: 'auth', name: 'users',
        fields: ['id','email','encrypted_password','created_at','updated_at','email_confirmed_at','phone','phone_confirmed_at','banned_until','deleted_at','raw_app_meta_data','raw_user_meta_data','is_sso_user'] })
      tables.push({ schema: 'auth', name: 'mfa_factors', fields: ['id','user_id','factor_type','status','created_at','updated_at'] })
    }
    for (const table of tables) {
      const qualified = `${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`
      const selected = table.fields ? table.fields.map(quoteIdentifier).join(',') : '*'
      await client.query(`DECLARE migration_rows NO SCROLL CURSOR FOR SELECT row_to_json(export_row)::text AS raw_json FROM (SELECT ${selected} FROM ${qualified}) export_row`)
      const name = fileName(table.schema, table.name)
      const descriptor = fs.openSync(path.join(directory, name), 'wx', 0o600)
      const digest = crypto.createHash('sha256')
      let rows = 0, bytes = 0
      try {
        while (true) {
          const batch = (await client.query('FETCH FORWARD 250 FROM migration_rows')).rows
          if (!batch.length) break
          for (const row of batch) {
            // Do not parse/re-serialize database JSON: doing so can round BIGINT
            // and NUMERIC values before they ever reach the destination.
            const line = row.raw_json + '\n'
            fs.writeFileSync(descriptor, line)
            digest.update(line); bytes += Buffer.byteLength(line); rows += 1
          }
        }
      } finally { fs.closeSync(descriptor) }
      await client.query('CLOSE migration_rows')
      manifest.files.push({ file: name, format: 'ndjson', schema: table.schema, table: table.name, rows, bytes, sha256: digest.digest('hex') })
    }
    await client.query('COMMIT')
    transaction = false
    manifest.complete = true
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 })
    return manifest
  } catch (error) {
    if (transaction) await client.query('ROLLBACK').catch(() => {})
    // Keep the initial complete:false manifest and any partial data for diagnosis.
    // Do not log query values or connection errors that may contain sensitive data.
    throw error
  }
}

export async function verifySnapshot(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'))
  if (manifest.version !== 1 || manifest.complete !== true || !Array.isArray(manifest.files) || manifest.files.length === 0) throw Error('Snapshot incompleto ou inválido')
  const seen = new Set()
  for (const entry of manifest.files) {
    if (typeof entry.file !== 'string' || !/^[a-zA-Z0-9_.%\-]+$/.test(entry.file) || seen.has(entry.file)) throw Error('Nome de arquivo inválido no manifesto')
    seen.add(entry.file)
    const file = path.join(directory, entry.file)
    if (fs.lstatSync(file).isSymbolicLink()) throw Error('Snapshot não aceita links simbólicos')
    const digest = crypto.createHash('sha256')
    let bytes = 0
    for await (const chunk of fs.createReadStream(file)) { digest.update(chunk); bytes += chunk.length }
    if (bytes !== entry.bytes || digest.digest('hex') !== entry.sha256) throw Error('Checksum ou tamanho divergente: ' + entry.file)
    if (entry.format === 'ndjson') {
      let rows = 0
      for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
        JSON.parse(line); rows += 1
      }
      if (rows !== entry.rows) throw Error('Contagem divergente: ' + entry.file)
    } else if (entry.format === 'json') JSON.parse(fs.readFileSync(file, 'utf8'))
    else throw Error('Formato desconhecido no manifesto')
  }
  if (!seen.has('schema.json')) throw Error('Estrutura ausente no snapshot')
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'schema.json'), 'utf8'))
  if (!Array.isArray(metadata.tables) || manifest.scope?.publicTables !== true || manifest.scope?.storageMetadata !== true || typeof manifest.scope?.authAccounts !== 'boolean') throw Error('Escopo ou estrutura inválidos no snapshot')
  const expectedTables = metadata.tables.map(table => {
    if (table.schema !== 'public' || typeof table.name !== 'string') throw Error('Tabela inválida na estrutura')
    return fileName(table.schema, table.name)
  })
  expectedTables.push(fileName('storage', 'buckets'), fileName('storage', 'objects'))
  if (manifest.scope.authAccounts) expectedTables.push(fileName('auth', 'users'), fileName('auth', 'mfa_factors'))
  const actualTables = manifest.files.filter(entry => entry.format === 'ndjson').map(entry => entry.file)
  if (expectedTables.length !== actualTables.length || expectedTables.some(name => !actualTables.includes(name))) throw Error('Snapshot não contém todas as tabelas declaradas')
  return manifest
}

async function main() {
  config({ path: '.env.local', quiet: true })
  const [mode, suppliedDirectory, ...flags] = process.argv.slice(2)
  if (!['export','verify'].includes(mode) || !suppliedDirectory || flags.some(flag => flag !== '--include-auth')) throw Error('Uso: node scripts/cloudflare-export-source.mjs export|verify .migration-private/NOME [--include-auth]')
  const privateRoot = path.resolve('.migration-private')
  const directory = path.resolve(suppliedDirectory)
  const relative = path.relative(privateRoot, directory)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Salve snapshots dentro de .migration-private/NOME (ignorado pelo Git)')
  if (mode === 'verify') {
    const manifest = await verifySnapshot(directory)
    console.log(`Snapshot verificado: ${manifest.files.length} arquivos. Bytes de Storage não estão incluídos.`)
    return
  }
  if (!process.env.DATABASE_URL) throw Error('Configure DATABASE_URL localmente para o banco de origem. Não envie a credencial pelo chat.')
  fs.mkdirSync(privateRoot, { recursive: true, mode: 0o700 })
  // Reject connection URL SSL query parameters which can override pg's explicit
  // TLS verification options. Supply the official CA as DATABASE_SSL_CA if needed.
  const url = new URL(process.env.DATABASE_URL)
  if (['sslmode','sslcert','sslkey','sslrootcert'].some(key => url.searchParams.has(key))) throw Error('Remova parâmetros SSL da URL e configure DATABASE_SSL_CA para verificar o certificado')
  const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: true, ...(process.env.DATABASE_SSL_CA ? { ca: fs.readFileSync(process.env.DATABASE_SSL_CA, 'utf8') } : {}) } })
  try {
    await client.connect()
    const manifest = await exportSnapshot(client, directory, { includeAuth: flags.includes('--include-auth') })
    await verifySnapshot(directory)
    console.log(`Snapshot consistente exportado e verificado: ${manifest.files.length} arquivos. Bytes de Storage ainda precisam ser copiados.`)
  } finally { await client.end() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Exportação/verificação não concluída. Confira configuração local, permissões de leitura e manifesto; nenhum dado deve ser publicado a partir de um snapshot incompleto.'); process.exitCode = 1 })
}
