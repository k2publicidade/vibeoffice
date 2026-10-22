import type { Release } from '@/types/releases'
export const DISTRIBUTION_STAGES = {
 draft: 'Preparação', in_review: 'Em análise', changes_requested: 'Ajustes solicitados',
 approved: 'Aprovado', submitted: 'Enviado na Revelator', live: 'Publicado',
} as const
export type DistributionStage = keyof typeof DISTRIBUTION_STAGES
export type DistributionAction = 'submit_review' | 'request_changes' | 'approve' | 'record_submission' | 'mark_live' | 'reopen'
export interface DistributionWorkflow {
 release_id: string; stage: DistributionStage; notes: string; rights_confirmed: boolean;
 revelator_release_id: string | null; revelator_url: string | null; stores: string[];
 updated_at: string; revision: number; approved_fingerprint: string | null
}
export interface DistributionHistory {
 id: string; release_id: string; actor_name: string; action: string; from_stage: DistributionStage; to_stage: DistributionStage;
 notes: string; created_at: string
}
export interface PerformanceRow {
 month: string; platform: string; country: string; streams: number; revenue: number; currency: string; upc?: string
}
export interface StoredPerformance extends Omit<PerformanceRow, 'revenue'> {
 revenue: number | null;
 id: string; release_id: string; imported_at: string; source_name: string
}
export interface ReleaseOperationsSnapshot {
 workflows: DistributionWorkflow[]; history: DistributionHistory[]; metrics: StoredPerformance[]; canManage: boolean
}
export function distributionChecklist(release: Release) {
 const single=release.releaseType==='single'
 return [
  {key:'identity',label:'Título e artista',ok:!!release.title.trim() && !!release.artist.trim()},
  {key:'date',label:'Data de lançamento',ok:!!release.releaseDate},
  {key:'cover',label:'Capa anexada',ok:!!(release.fileReferences?.cover || release.coverUrl)},
  {key:'audio',label:single ? 'Áudio anexado' : 'Áudio / pacote de faixas anexado',ok:!!(release.fileReferences?.wav || release.wavUrl)},
  {key:'credits',label:single ? 'Compositores informados' : 'Faixas com título e compositores',ok:single ? !!release.composers?.length && release.composers.every(c=>!!c.name.trim()) : !!release.tracks?.length && release.tracks.every(t=>!!t.title.trim() && !!t.composers?.length && t.composers.every(c=>!!c.name.trim()))},
  {key:'isrc',label:single ? 'ISRC válido' : 'ISRC de todas as faixas',ok:single ? /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(release.isrc || '') : !!release.tracks?.length && release.tracks.every(t=>/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(t.isrc || ''))},
  {key:'upc',label:'UPC (12 ou 13 dígitos)',ok:/^\d{12,13}$/.test(release.upc || '')},
 ]
}
function csvTable(text: string): string[][] {
 const clean=text.replace(/^\uFEFF/,'')
 const first=clean.split(/\r?\n/,1)[0]
 const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length ? ';' : ','
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,afterQuote=false
 for(let i=0;i<clean.length;i++) {
  const ch=clean[i]
  if(quoted) {
   if(ch==='"' && clean[i+1]==='"') {field+='"';i++}
   else if(ch==='"') {quoted=false;afterQuote=true}
   else field+=ch
  } else if(ch==='"') {
   if(field.trim() || afterQuote) throw new Error('Aspas inválidas no CSV')
   quoted=true
  } else if(ch===delimiter) {row.push(field.trim());field='';afterQuote=false}
  else if(ch==='\n' || ch==='\r') {
   if(ch==='\r' && clean[i+1]==='\n') i++
   row.push(field.trim());if(row.some(Boolean)) rows.push(row);row=[];field='';afterQuote=false
  } else {
   if(afterQuote && ch.trim()) throw new Error('Texto inválido após aspas no CSV')
   field+=ch
  }
 }
 if(quoted) throw new Error('Aspas não fechadas no CSV')
 row.push(field.trim());if(row.some(Boolean))rows.push(row)
 return rows
}
const aliases:Record<string,string>={month:'month',mes:'month',reportingmonth:'month',salesmonth:'month',period:'month',periodo:'month',platform:'platform',plataforma:'platform',distributorname:'platform',dsp:'platform',store:'platform',country:'country',pais:'country',territory:'country',iso2code:'country',streams:'streams',streamscount:'streams',revenue:'revenue',netrevenue:'revenue',receita:'revenue',currency:'currency',moeda:'currency',currencycode:'currency',upc:'upc',ean:'upc'}
export function parsePerformanceCsv(text:string,locale:'pt-BR'|'en-US'):PerformanceRow[] {
 if(text.length>2_000_000) throw new Error('CSV deve ter até 2 MB')
 const table=csvTable(text)
 if(table.length<2) throw new Error('CSV sem linhas de dados')
 if(table.length>5001) throw new Error('Limite de 5.000 linhas por importação')
 const headers=table[0].map(h=>aliases[h.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')] || h)
 if(new Set(headers).size!==headers.length) throw new Error('Cabeçalhos duplicados no CSV')
 for(const key of ['month','platform','streams','revenue','currency']) if(!headers.includes(key))throw new Error(`Coluna obrigatória ausente: ${key}`)
 return table.slice(1).map((cells,index)=>{
  const fail=(message:string):never=>{throw new Error(`Linha ${index+2}: ${message}`)}
  if(cells.length!==headers.length) fail('número de colunas diferente do cabeçalho')
  const row=Object.fromEntries(headers.map((h,i)=>[h,cells[i]]))
  const numeric=(value:string)=>{
   const pattern=locale==='pt-BR' ? /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/ : /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/
   if(!pattern.test(value)) fail('número inválido; confira o formato decimal')
   const number=Number(locale==='pt-BR' ? value.replace(/\./g,'').replace(',','.') : value.replace(/,/g,''))
   if(!Number.isFinite(number) || Math.abs(number)>1e12) fail('número fora do limite')
   return number
  }
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month))fail('month deve usar AAAA-MM')
  if(!row.platform || row.platform.length>100)fail('plataforma inválida')
  const streams=numeric(row.streams),revenue=numeric(row.revenue)
  if(!Number.isSafeInteger(streams)||streams<0)fail('streams deve ser um inteiro não negativo')
  const currency=row.currency.toUpperCase(),country=(row.country||'ZZ').toUpperCase()
  if(!/^[A-Z]{3}$/.test(currency))fail('moeda deve usar três letras, como USD ou BRL')
  if(!/^[A-Z]{2}$/.test(country))fail('país deve usar duas letras, como BR; use ZZ para total global')
  if(row.upc && !/^\d{12,13}$/.test(row.upc))fail('UPC deve ter 12 ou 13 dígitos')
  return {month:row.month,platform:row.platform,country,streams,revenue,currency,...(row.upc?{upc:row.upc}:{})}
 })
}
export function summarizePerformance(rows:PerformanceRow[]) {
 const revenueByCurrency:Record<string,number>={},byPlatform:Record<string,number>={},byMonth:Record<string,number>={},byCountry:Record<string,number>={}
 let streams=0
 for(const row of rows){streams+=row.streams;revenueByCurrency[row.currency]=(revenueByCurrency[row.currency]||0)+row.revenue;byPlatform[row.platform]=(byPlatform[row.platform]||0)+row.streams;byMonth[row.month]=(byMonth[row.month]||0)+row.streams;byCountry[row.country]=(byCountry[row.country]||0)+row.streams}
 return {streams,revenueByCurrency,byPlatform,byMonth,byCountry}
}
export const PERFORMANCE_TEMPLATE='month,platform,country,streams,revenue,currency,upc\n'
