import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parsePerformanceCsv } from '@/lib/release-operations'
import type { ReleaseOperationsClient } from '@/lib/release-operations-server'
import type { Json } from '@/lib/supabase/database.types'

async function authorize(request: Request,write=false) {
 if(write && request.headers.get('origin')!==new URL(request.url).origin) return {error:NextResponse.json({error:'Origem inválida'},{status:403})}
 const session=await createServerSupabaseClient()
 const {data:{user}}=await session.auth.getUser()
 if(!user) return {error:NextResponse.json({error:'Faça login novamente'},{status:401})}
 const {data:role}=await session.rpc('office_role')
 if(!role) return {error:NextResponse.json({error:'Acesso não autorizado'},{status:403})}
 return {client:session as unknown as ReleaseOperationsClient,role}
}
function databaseError(error:{code?:string;message:string}) {
 const known=error.code==='42501' || error.code==='P0001' || error.code==='40001'
 return NextResponse.json({error:known ? error.message : 'Não foi possível salvar. Atualize a página e tente novamente.'},{status:error.code==='42501'?403:error.code==='40001'?409:400})
}
export async function GET(request:Request) {
 const auth=await authorize(request)
 if(auth.error)return auth.error
 const {data,error}=await auth.client!.rpc('release_operations_snapshot')
 if(error)return NextResponse.json({error:'Não foi possível carregar distribuição e análise'},{status:500})
 return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}})
}
const actionSchema=z.object({releaseId:z.uuid(),action:z.enum(['submit_review','request_changes','approve','record_submission','mark_live','reopen']),revision:z.number().int().nonnegative(),notes:z.string().max(4000).default(''),rights_confirmed:z.boolean().optional(),revelator_release_id:z.string().regex(/^\d{1,18}$/).optional(),revelator_url:z.string().max(500).optional(),stores:z.array(z.string().trim().min(1).max(100)).max(100).optional()}).strict()
export async function PATCH(request:Request) {
 const auth=await authorize(request,true)
 if(auth.error)return auth.error
 const parsed=actionSchema.safeParse(await request.json().catch(()=>null))
 if(!parsed.success)return NextResponse.json({error:'Confira os dados da ação'},{status:400})
 const {releaseId,action,...payload}=parsed.data
 if(payload.revelator_url) {
  try {const url=new URL(payload.revelator_url);if(url.protocol!=='https:'||!url.hostname.endsWith('.revelator.pro')||url.username||url.password||url.port)throw new Error()}
  catch{return NextResponse.json({error:'Use o link HTTPS do painel Revelator'},{status:400})}
 }
 const {data,error}=await auth.client!.rpc('change_release_distribution',{p_release_id:releaseId,p_action:action,p_payload:payload as Json})
 return error?databaseError(error):NextResponse.json(data)
}
export async function POST(request:Request) {
 const auth=await authorize(request,true)
 if(auth.error)return auth.error
 if(auth.role!=='Admin' && auth.role!=='Gerente')return NextResponse.json({error:'Somente Admin e Gerente podem importar relatórios'},{status:403})
 const parsed=z.object({releaseId:z.uuid(),csv:z.string().max(2_000_000),locale:z.enum(['pt-BR','en-US']),source:z.string().trim().min(1).max(200)}).strict().safeParse(await request.json().catch(()=>null))
 if(!parsed.success)return NextResponse.json({error:'Relatório inválido ou maior que 2 MB'},{status:400})
 try {
  const rows=parsePerformanceCsv(parsed.data.csv,parsed.data.locale)
  const {data,error}=await auth.client!.rpc('import_release_performance',{p_release_id:parsed.data.releaseId,p_rows:rows as unknown as Json,p_source:parsed.data.source})
  return error?databaseError(error):NextResponse.json(data)
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'CSV inválido'},{status:400})}
}
