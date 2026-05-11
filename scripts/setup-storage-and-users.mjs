import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbPwd = process.env.SUPABASE_DB_PASSWORD

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

// ============================================================
// 1. STORAGE BUCKET: drive-files
// ============================================================
console.log('=== Storage ===')
const { data: existing } = await admin.storage.listBuckets()
if (existing?.find(b => b.name === 'drive-files')) {
  console.log('  drive-files: already exists')
} else {
  const { error } = await admin.storage.createBucket('drive-files', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
  })
  console.log('  drive-files:', error ? 'FAIL ' + error.message : 'CREATED (public, 50MB limit)')
}

// ============================================================
// 2. CREATE 20 TEST USERS
// Matches migration 009_seed_mock_users.sql expectations
// ============================================================
console.log('\n=== Users ===')

const usersToCreate = [
  { email: 'eu@vibedistro.com', name: 'Eu (Admin)', sector: 'TI/Suporte', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eu' },
  { email: 'joao.silva@vibedistro.com', name: 'João Silva', sector: 'A&R', role: 'Gerente', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joao' },
  { email: 'maria.santos@vibedistro.com', name: 'Maria Santos', sector: 'A&R', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria' },
  { email: 'pedro.costa@vibedistro.com', name: 'Pedro Costa', sector: 'Marketing', role: 'Gerente', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pedro' },
  { email: 'ana.oliveira@vibedistro.com', name: 'Ana Oliveira', sector: 'Marketing', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana' },
  { email: 'carlos.ferreira@vibedistro.com', name: 'Carlos Ferreira', sector: 'Financeiro', role: 'Gerente', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos' },
  { email: 'beatriz.lima@vibedistro.com', name: 'Beatriz Lima', sector: 'Financeiro', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=beatriz' },
  { email: 'rafael.rodrigues@vibedistro.com', name: 'Rafael Rodrigues', sector: 'Jurídico', role: 'Gerente', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rafael' },
  { email: 'juliana.alves@vibedistro.com', name: 'Juliana Alves', sector: 'Jurídico', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=juliana' },
  { email: 'fernanda.pereira@vibedistro.com', name: 'Fernanda Pereira', sector: 'Administrativo', role: 'Gerente', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fernanda' },
  { email: 'thiago.gomes@vibedistro.com', name: 'Thiago Gomes', sector: 'Administrativo', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thiago' },
  { email: 'larissa.souza@vibedistro.com', name: 'Larissa Souza', sector: 'TI/Suporte', role: 'Gerente', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=larissa' },
  { email: 'gabriel.martins@vibedistro.com', name: 'Gabriel Martins', sector: 'TI/Suporte', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gabriel' },
  { email: 'isabela.ribeiro@vibedistro.com', name: 'Isabela Ribeiro', sector: 'Atendimento ao Artista', role: 'Gerente', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=isabela' },
  { email: 'lucas.barbosa@vibedistro.com', name: 'Lucas Barbosa', sector: 'Atendimento ao Artista', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lucas' },
  { email: 'camila.araujo@vibedistro.com', name: 'Camila Araújo', sector: 'A&R', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=camila' },
  { email: 'matheus.melo@vibedistro.com', name: 'Matheus Melo', sector: 'Marketing', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=matheus' },
  { email: 'leticia.dias@vibedistro.com', name: 'Letícia Dias', sector: 'Financeiro', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leticia' },
  { email: 'rodrigo.castro@vibedistro.com', name: 'Rodrigo Castro', sector: 'Administrativo', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rodrigo' },
  { email: 'amanda.cardoso@vibedistro.com', name: 'Amanda Cardoso', sector: 'Atendimento ao Artista', role: 'Colaborador', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amanda' },
]

// Direct DB connection to insert public.users row (auth API only handles auth.users)
const db = new pg.Client({
  host: 'db.zdjujxuibbhfxmcrzgss.supabase.co',
  port: 5432, user: 'postgres', password: dbPwd, database: 'postgres',
  ssl: { rejectUnauthorized: false },
})
await db.connect()

let created = 0, skipped = 0, failed = 0
for (const u of usersToCreate) {
  process.stdout.write(`  ${u.email.padEnd(40)} ... `)
  try {
    // handle_new_user() trigger reads name/sector/role/avatar from user_metadata and creates public.users row
    const { data: { user }, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { name: u.name, sector: u.sector, role: u.role, avatar: u.avatar },
    })
    if (error) {
      if (error.message.includes('already')) { console.log('SKIP (exists)'); skipped++; continue }
      throw error
    }
    console.log(`OK (${u.role}/${u.sector})`)
    created++
  } catch (e) {
    console.log(`FAIL: ${e.message.substring(0, 80)}`); failed++
  }
}

console.log(`\nSummary: ${created} created, ${skipped} skipped, ${failed} failed.`)

await db.end()
