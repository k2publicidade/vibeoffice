'use client'
import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, Send, ClipboardCheck, FileUp, Download, RefreshCw, ArrowUpRight, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useReleaseOperations } from '@/hooks/useReleaseOperations'
import { DISTRIBUTION_STAGES, distributionChecklist, parsePerformanceCsv, summarizePerformance, PERFORMANCE_TEMPLATE, type DistributionAction, type DistributionWorkflow, type DistributionHistory, type PerformanceRow } from '@/lib/release-operations'
import type { Release } from '@/types/releases'
import { toast } from 'sonner'

const field='w-full rounded-lg border border-[#303030] bg-[#111] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#fc7a67]'
const panel='rounded-xl border border-[#262626] bg-[#0d0d0d] p-4 md:p-5'
const labels:Record<string,string>={submit_review:'Enviado para análise',request_changes:'Ajustes solicitados',approve:'Aprovação interna',record_submission:'Envio registrado na Revelator',mark_live:'Publicação confirmada',reopen:'Reabertura',metadata_changed:'Metadados alterados'}
function download(name:string,text:string) {
 const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}))
 const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url)
}
function csvCell(value:unknown) { const text=String(value??'');return '"'+(typeof value==='string'&&/^[=+@\-\t\r]/.test(text)?"'":'')+text.replace(/"/g,'""')+'"' }
function dateLabel(value:string) { return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) }

export function ReleaseOperations({releases,mode,onEdit}:{releases:Release[];mode:'distribution'|'analytics';onEdit:(release:Release)=>void}) {
 const ops=useReleaseOperations(releases.map(r=>r.id+':'+r.updatedAt?.getTime()).join('|'))
 const {user}=useAuth()
 const [selectedId,setSelectedId]=useState('')
 const [stageFilter,setStageFilter]=useState('all')
 const visible=releases.filter(r=>ops.canManage || r.createdBy===user?.id)
 const filtered=visible.filter(r=>stageFilter==='all'||(ops.workflows.find(w=>w.release_id===r.id)?.stage||'draft')===stageFilter)
 const selected=visible.find(r=>r.id===selectedId) || filtered[0]
 const workflow=ops.workflows.find(w=>w.release_id===selected?.id)
 return <div className="space-y-5">
  <div className="flex flex-wrap justify-between items-center gap-3">
   <div><h2 className="text-xl font-semibold text-white">{mode==='distribution'?'Distribuição de músicas':'Análise de lançamentos'}</h2><p className="text-sm text-gray-400 mt-1">{mode==='distribution'?'Prepare, revise e acompanhe cada entrega.':'Streams, plataformas, territórios e receitas dos relatórios importados.'}</p></div>
   <Button variant="outline" size="sm" onClick={ops.reload} disabled={ops.loading}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
  </div>
  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100"><strong>Revelator · operação manual</strong><p className="mt-1 text-amber-100/70">Acesso à API ainda não liberado. Registre os envios feitos no painel Revelator e importe os relatórios para análise. O sistema não envia músicas automaticamente.</p></div>
  {ops.error && <div role="alert" className="border border-red-500/40 rounded-lg p-4 text-red-300">{ops.error} <button onClick={ops.reload} className="underline">Tentar novamente</button></div>}
  {ops.loading ? <p role="status" className="text-gray-400 py-12 text-center">Carregando distribuição e relatórios…</p> : !ops.error && (mode==='analytics' ? <PerformanceAnalysis releases={visible} ops={ops} /> : <>
   <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">{Object.entries(DISTRIBUTION_STAGES).map(([stage,label])=><button key={stage} onClick={()=>{setStageFilter(stageFilter===stage?'all':stage);setSelectedId('')}} aria-pressed={stageFilter===stage} className="text-left rounded-xl border border-[#262626] p-3 aria-pressed:border-[#fc7a67] hover:bg-[#161616]"><span className="block text-xs text-gray-400">{label}</span><span className="text-2xl font-semibold text-white">{visible.filter(r=>(ops.workflows.find(w=>w.release_id===r.id)?.stage||'draft')===stage).length}</span></button>)}</div>
   <div className="grid lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)] gap-5">
    <div className={panel}><h3 className="text-sm font-semibold text-gray-300 mb-3">Fila de lançamentos</h3><div className="space-y-2 max-h-[650px] overflow-auto">{filtered.map(release=>{const state=ops.workflows.find(w=>w.release_id===release.id);return <button key={release.id} onClick={()=>setSelectedId(release.id)} aria-pressed={selected?.id===release.id} className="w-full text-left rounded-lg p-3 border border-transparent hover:bg-[#181818] aria-pressed:bg-[#fc7a67]/10 aria-pressed:border-[#fc7a67]/40"><span className="block text-white font-medium truncate">{release.title}</span><span className="block text-xs text-gray-400 mt-1">{release.artist}</span><span className="block text-xs text-[#fc7a67] mt-2">{DISTRIBUTION_STAGES[state?.stage||'draft']}</span></button>})}{!filtered.length && <p className="text-sm text-gray-500">Nenhum lançamento nesta etapa. Cadastre um lançamento ou altere o filtro.</p>}</div></div>
    {selected ? <DistributionDetail key={selected.id+':'+(workflow?.revision||0)} release={selected} workflow={workflow} history={ops.history.filter(h=>h.release_id===selected.id)} canManage={ops.canManage} saving={ops.saving} onEdit={()=>onEdit(selected)} onChange={(action,payload)=>ops.change(selected.id,action,{revision:workflow?.revision||0,...payload})} /> : <div className={panel+' text-gray-500'}>Selecione um lançamento para começar.</div>}
   </div>
  </>)}
 </div>
}
function DistributionDetail({release,workflow,history,canManage,saving,onEdit,onChange}:{release:Release;workflow?:DistributionWorkflow;history:DistributionHistory[];canManage:boolean;saving:boolean;onEdit:()=>void;onChange:(action:DistributionAction,payload:Record<string,unknown>)=>Promise<unknown>}) {
 const [notes,setNotes]=useState('')
 const [rights,setRights]=useState(workflow?.rights_confirmed||false)
 const [remoteId,setRemoteId]=useState(workflow?.revelator_release_id||'')
 const [remoteUrl,setRemoteUrl]=useState(workflow?.revelator_url||'')
 const [stores,setStores]=useState(workflow?.stores.join(', ')||'')
 const [error,setError]=useState('')
 const stage=workflow?.stage||'draft'
 const checks=distributionChecklist(release)
 const ready=checks.every(c=>c.ok)&&rights
 async function act(action:DistributionAction) {
  setError('')
  try{await onChange(action,{notes,rights_confirmed:rights,...(action==='record_submission'?{revelator_release_id:remoteId,revelator_url:remoteUrl,stores:stores.split(',').map(s=>s.trim()).filter(Boolean)}:{})});toast.success(labels[action])}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar')}
 }
 return <div className="space-y-4">
  <div className={panel}>
   <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-[#fc7a67] uppercase tracking-wider mb-2">{DISTRIBUTION_STAGES[stage]}</p><h3 className="text-xl font-semibold text-white">{release.title}</h3><p className="text-sm text-gray-400">{release.artist} · {release.releaseType.toUpperCase()}</p></div><Button variant="outline" size="sm" onClick={onEdit}>Editar lançamento</Button></div>
   <h4 className="font-medium text-sm text-white mt-6 mb-3">Checklist para análise</h4>
   <ul className="grid sm:grid-cols-2 gap-2">{checks.map(check=><li key={check.key} className={'flex items-center gap-2 text-sm '+(check.ok?'text-emerald-400':'text-gray-500')}>{check.ok?<CheckCircle2 className="w-4 h-4"/>:<Circle className="w-4 h-4"/>}{check.label}<span className="sr-only">{check.ok?'completo':'pendente'}</span></li>)}</ul>
   <p className="text-xs text-gray-500 mt-3">Confere presença e formato dos dados. A revisão humana também deve conferir qualidade do áudio, capa, créditos e direitos.</p>
   {workflow?.notes && <div className="mt-4 rounded-lg bg-[#191919] p-3 text-sm text-gray-300 whitespace-pre-wrap"><span className="block text-xs text-gray-500 mb-1">Última observação</span>{workflow.notes}</div>}
   {(stage==='draft'||stage==='changes_requested') && <label className="flex items-start gap-3 mt-5 text-sm text-gray-300"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)} className="mt-1" />Confirmo que a distribuidora possui autorização para distribuir este fonograma, a composição e a arte.</label>}
   {workflow?.revelator_release_id && <div className="mt-4 text-sm text-gray-400"><p>Revelator ID: <strong className="text-white">{workflow.revelator_release_id}</strong></p><p>Plataformas: {workflow.stores.join(', ')}</p>{workflow.revelator_url && <a href={workflow.revelator_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#fc7a67] mt-2">Abrir na Revelator<ArrowUpRight className="w-4 h-4"/></a>}</div>}
   {canManage && stage==='approved' && <div className="space-y-3 mt-5 border-t border-[#262626] pt-4"><h4 className="font-medium text-white">Registrar envio realizado na Revelator</h4><p className="text-xs text-gray-400">Faça o envio no painel Revelator e registre a referência abaixo. Este botão apenas registra a operação.</p><label className="block text-sm text-gray-300">ID do lançamento na Revelator<Input value={remoteId} onChange={e=>setRemoteId(e.target.value)} inputMode="numeric" maxLength={18} /></label><label className="block text-sm text-gray-300">Link do painel (opcional)<Input value={remoteUrl} onChange={e=>setRemoteUrl(e.target.value)} placeholder="https://sua-conta.revelator.pro/…" maxLength={500}/></label><label className="block text-sm text-gray-300">Plataformas, separadas por vírgula<Input value={stores} onChange={e=>setStores(e.target.value)} placeholder="Spotify, Apple Music, Deezer" maxLength={10000}/></label></div>}
   <label className="block text-sm text-gray-300 mt-5">Observações da operação<textarea aria-label="Observações da operação" className={field+' mt-2 min-h-24'} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={4000} placeholder="Ajustes necessários, referência do envio ou confirmação de publicação" /></label>
   {error&&<p role="alert" className="text-red-400 mt-3 text-sm">{error}</p>}
   <div className="flex flex-wrap gap-2 mt-4">
    {(stage==='draft'||stage==='changes_requested') && <Button disabled={saving||!ready} onClick={()=>act('submit_review')}><Send className="w-4 h-4 mr-2"/>Enviar para análise</Button>}
    {canManage&&stage==='in_review'&&<Button disabled={saving} onClick={()=>act('approve')}><ClipboardCheck className="w-4 h-4 mr-2"/>Aprovar distribuição</Button>}
    {canManage&&(stage==='in_review'||stage==='approved')&&<Button variant="outline" disabled={saving||!notes.trim()} onClick={()=>act('request_changes')}>Solicitar ajustes</Button>}
    {canManage&&stage==='approved'&&<Button disabled={saving||!/^\d{1,18}$/.test(remoteId)||!stores.trim()} onClick={()=>act('record_submission')}>Registrar envio manual</Button>}
    {canManage&&stage==='submitted'&&<Button disabled={saving||!notes.trim()} onClick={()=>act('mark_live')}>Confirmar publicação</Button>}
    {canManage&&stage!=='draft'&&<Button variant="outline" disabled={saving||!notes.trim()} onClick={()=>act('reopen')}>Reabrir preparação</Button>}
   </div>
  </div>
  <div className={panel}><h4 className="text-sm font-semibold text-white mb-3">Histórico de distribuição</h4>{!history.length&&<p className="text-sm text-gray-500">Nenhuma operação registrada.</p>}<ol className="space-y-4">{history.map(event=><li key={event.id} className="border-l-2 border-[#fc7a67]/40 pl-3"><p className="text-sm text-white">{labels[event.action]||event.action}</p><p className="text-xs text-gray-500 mt-1">{event.actor_name} · {dateLabel(event.created_at)}</p><p className="text-xs text-gray-400">{DISTRIBUTION_STAGES[event.from_stage]} → {DISTRIBUTION_STAGES[event.to_stage]}</p>{event.notes&&<p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">{event.notes}</p>}</li>)}</ol></div>
 </div>
}

type Ops=ReturnType<typeof useReleaseOperations>
function PerformanceAnalysis({releases,ops}:{releases:Release[];ops:Ops}) {
 const [releaseId,setReleaseId]=useState('all')
 const [from,setFrom]=useState('')
 const [to,setTo]=useState('')
 const [platform,setPlatform]=useState('all')
 const [importOpen,setImportOpen]=useState(false)
 const rows=useMemo(()=>ops.metrics.filter(row=>(releaseId==='all'||row.release_id===releaseId)&&(!from||row.month>=from)&&(!to||row.month<=to)&&(platform==='all'||row.platform===platform)),[ops.metrics,releaseId,from,to,platform])
 const totals=summarizePerformance(rows.map(row=>({...row,revenue:row.revenue??0})))
 const platforms=[...new Set(ops.metrics.map(row=>row.platform))].sort()
 const months=Object.entries(totals.byMonth).sort(([a],[b])=>a.localeCompare(b))
 const maxMonth=Math.max(1,...months.map(([,n])=>n))
 const ranking=releases.map(release=>({release,streams:rows.filter(row=>row.release_id===release.id).reduce((sum,row)=>sum+row.streams,0)})).filter(item=>rows.some(row=>row.release_id===item.release.id)).sort((a,b)=>b.streams-a.streams)
 const exportReport=()=>download('analise-lancamentos.csv',[['month','release','artist','platform','country','streams',...(ops.canManage?['revenue','currency']:[])].map(csvCell).join(','),...rows.map(row=>{const release=releases.find(r=>r.id===row.release_id);return [row.month,release?.title||'',release?.artist||'',row.platform,row.country,row.streams,...(ops.canManage?[row.revenue,row.currency]:[])].map(csvCell).join(',')})].join('\n'))
 return <div className="space-y-5">
  <div className="flex flex-wrap gap-2 justify-end">{ops.canManage&&<Button onClick={()=>setImportOpen(value=>!value)}><FileUp className="w-4 h-4 mr-2"/>{importOpen?'Fechar importação':'Importar relatório'}</Button>}<Button variant="outline" disabled={!rows.length} onClick={exportReport}><Download className="w-4 h-4 mr-2"/>Exportar análise</Button></div>
  {importOpen&&<ReportImport releases={releases} ops={ops}/>}
  <div className={panel+' grid sm:grid-cols-2 lg:grid-cols-4 gap-3'}>
   <label className="text-sm text-gray-400">Lançamento<select aria-label="Filtrar lançamento" className={field+' mt-1'} value={releaseId} onChange={e=>setReleaseId(e.target.value)}><option value="all">Todos os lançamentos</option>{releases.map(r=><option key={r.id} value={r.id}>{r.title} · {r.artist}</option>)}</select></label>
   <label className="text-sm text-gray-400">Mês inicial<Input type="month" aria-label="Mês inicial" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label className="text-sm text-gray-400">Mês final<Input type="month" aria-label="Mês final" value={to} onChange={e=>setTo(e.target.value)}/></label>
   <label className="text-sm text-gray-400">Plataforma<select aria-label="Filtrar plataforma" className={field+' mt-1'} value={platform} onChange={e=>setPlatform(e.target.value)}><option value="all">Todas as plataformas</option>{platforms.map(p=><option key={p}>{p}</option>)}</select></label>
  </div>
  {from&&to&&from>to&&<p role="alert" className="text-red-400">O mês inicial deve ser anterior ou igual ao mês final.</p>}
  {!rows.length?<div className={panel+' text-center py-14'}><BarChart3 className="w-10 h-10 mx-auto text-gray-600 mb-3"/><h3 className="font-semibold text-white">Sem dados de desempenho neste período</h3><p className="text-sm text-gray-500 mt-2">{ops.canManage?'Importe um relatório real da Revelator para acompanhar os resultados.':'A equipe responsável precisa importar os relatórios dos seus lançamentos.'}</p></div>:<>
   <div className="grid sm:grid-cols-3 gap-3"><div className={panel}><p className="text-xs uppercase tracking-wider text-gray-500">Streams reportados</p><p className="text-3xl font-semibold text-white mt-2">{totals.streams.toLocaleString('pt-BR')}</p><p className="text-xs text-gray-500 mt-1">{rows.length} registros · {Object.keys(totals.byPlatform).length} plataformas</p></div><div className={panel}><p className="text-xs uppercase tracking-wider text-gray-500">Lançamentos com dados</p><p className="text-3xl font-semibold text-white mt-2">{ranking.length}</p></div><div className={panel}><p className="text-xs uppercase tracking-wider text-gray-500">{ops.canManage?'Receita reportada por moeda':'Cobertura dos relatórios'}</p>{ops.canManage?Object.entries(totals.revenueByCurrency).map(([currency,value])=><p key={currency} className="text-xl font-semibold text-white mt-2">{value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})} <span className="text-xs text-gray-400">{currency}</span></p>):<p className="text-xl text-white mt-2">{months.length} meses</p>}<p className="text-xs text-gray-500 mt-2">Valores e períodos conforme o relatório; não representam pagamento confirmado.</p></div></div>
   <div className="grid lg:grid-cols-2 gap-5"><div className={panel}><h3 className="font-medium text-white mb-5">Evolução mensal de streams</h3><div className="space-y-4">{months.map(([month,count])=><div key={month}><div className="flex justify-between text-xs text-gray-400 mb-1"><span>{month}</span><span>{count.toLocaleString('pt-BR')}</span></div><div className="h-3 bg-[#222] rounded-full"><div className="h-3 bg-[#fc7a67] rounded-full" style={{width:`${count/maxMonth*100}%`}}/></div></div>)}</div></div><div className={panel}><h3 className="font-medium text-white mb-4">Streams por plataforma</h3><Breakdown values={totals.byPlatform}/><h3 className="font-medium text-white mt-6 mb-4">Territórios</h3><Breakdown values={totals.byCountry}/><p className="text-xs text-gray-500 mt-3">ZZ indica total global sem país informado no arquivo.</p></div></div>
   <div className={panel+' overflow-auto'}><h3 className="font-medium text-white mb-4">Ranking de lançamentos</h3><table className="w-full text-sm text-left"><thead className="text-gray-500"><tr><th className="py-2">Lançamento</th><th>Artista</th><th className="text-right">Streams</th></tr></thead><tbody>{ranking.map(({release,streams})=><tr key={release.id} className="border-t border-[#262626]"><td className="py-3 text-white">{release.title}</td><td className="text-gray-400">{release.artist}</td><td className="text-right text-white">{streams.toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div>
   <div className={panel+' overflow-auto'}><h3 className="font-medium text-white mb-4">Origem e detalhe dos dados</h3><table className="w-full text-xs text-left min-w-[700px]"><thead className="text-gray-500"><tr>{['Mês','Lançamento','Plataforma','País','Streams',...(ops.canManage?['Receita','Moeda']:[]),'Arquivo / importação'].map(h=><th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t border-[#262626] text-gray-300"><td className="py-3 pr-3">{row.month}</td><td className="pr-3">{releases.find(r=>r.id===row.release_id)?.title}</td><td className="pr-3">{row.platform}</td><td>{row.country}</td><td>{row.streams.toLocaleString('pt-BR')}</td>{ops.canManage&&<><td>{row.revenue?.toLocaleString('pt-BR',{maximumFractionDigits:8})}</td><td>{row.currency}</td></>}<td><span className="block">{row.source_name}</span><span className="text-gray-500">{dateLabel(row.imported_at)}</span></td></tr>)}</tbody></table></div>
  </>}
 </div>
}
function Breakdown({values}:{values:Record<string,number>}) {return <dl className="space-y-2">{Object.entries(values).sort((a,b)=>b[1]-a[1]).map(([name,value])=><div key={name} className="flex justify-between gap-4 text-sm"><dt className="text-gray-400">{name}</dt><dd className="text-white">{value.toLocaleString('pt-BR')}</dd></div>)}</dl>}
function ReportImport({releases,ops}:{releases:Release[];ops:Ops}) {
 const [releaseId,setReleaseId]=useState('')
 const [csv,setCsv]=useState('')
 const [source,setSource]=useState('Relatório Revelator')
 const [locale,setLocale]=useState<'pt-BR'|'en-US'>('en-US')
 const [error,setError]=useState('')
 const [preview,setPreview]=useState<PerformanceRow[]>([])
 function validate(text=csv,nextLocale=locale) {setError('');try{const rows=parsePerformanceCsv(text,nextLocale);setPreview(rows);return rows}catch(e){setPreview([]);setError(e instanceof Error?e.message:'CSV inválido');return []}}
 async function importNow() {
  const rows=validate()
  if(!rows.length)return
  setError('')
  try{await ops.importReport(releaseId,csv,locale,source);setCsv('');setPreview([]);toast.success('Relatório importado. Os meses incluídos foram substituídos.')}
  catch(e){setError(e instanceof Error?e.message:'Erro ao importar')}
 }
 const months=[...new Set(preview.map(row=>row.month))].sort()
 return <div className={panel+' border-[#fc7a67]/30 space-y-4'}>
  <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold text-white">Importar desempenho da Revelator</h3><Button variant="outline" size="sm" onClick={()=>download('modelo-relatorio-revelator.csv',PERFORMANCE_TEMPLATE)}><Download className="w-4 h-4 mr-2"/>Baixar modelo CSV</Button></div>
  <p className="text-sm text-gray-400">Use um relatório de um único lançamento. Colunas obrigatórias: month (AAAA-MM), platform, streams, revenue, currency. country (BR, US…) e upc são opcionais. Cabeçalhos distributorName, streamsCount e netRevenue também são aceitos. Ajuste as colunas exportadas pela Revelator ao modelo antes de importar.</p>
  <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm text-gray-400">Lançamento do relatório<select aria-label="Lançamento do relatório" className={field+' mt-1'} value={releaseId} onChange={e=>setReleaseId(e.target.value)}><option value="">Selecione</option>{releases.map(r=><option key={r.id} value={r.id}>{r.title} · {r.artist}{r.upc?' · '+r.upc:''}</option>)}</select></label><label className="text-sm text-gray-400">Formato dos números<select aria-label="Formato dos números" className={field+' mt-1'} value={locale} onChange={e=>{const next=e.target.value as 'pt-BR'|'en-US';setLocale(next);setPreview([])}}><option value="en-US">Decimal com ponto (12.50)</option><option value="pt-BR">Decimal com vírgula (12,50)</option></select></label></div>
  <label className="block text-sm text-gray-400">Arquivo CSV (até 2 MB)<Input aria-label="Arquivo de relatório" type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2_000_000){setError('CSV deve ter até 2 MB');return}const text=await file.text();setCsv(text);setSource(file.name.slice(0,200));setPreview([]);setError('')}}/></label>
  <label className="block text-sm text-gray-400">Ou cole o CSV<textarea aria-label="Conteúdo do relatório CSV" className={field+' font-mono min-h-28 mt-1'} value={csv} onChange={e=>{setCsv(e.target.value);setPreview([])}} maxLength={2_000_000}/></label>
  <label className="block text-sm text-gray-400">Nome do relatório<Input value={source} onChange={e=>setSource(e.target.value)} maxLength={200}/></label>
  {error&&<p role="alert" className="text-red-400 text-sm">{error}</p>}
  <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={!csv||ops.saving} onClick={()=>validate()}>Validar e visualizar</Button><Button disabled={!releaseId||!preview.length||!source.trim()||ops.saving} onClick={importNow}>{ops.saving?'Importando…':'Importar e substituir meses incluídos'}</Button></div>
  {!!preview.length&&<div className="text-sm text-gray-400 border-t border-[#303030] pt-4"><p className="text-white">{preview.length.toLocaleString('pt-BR')} linhas válidas · Meses: {months.join(', ')}</p><p className="mt-1">A importação substituirá todos os dados desses meses para o lançamento selecionado. Outros lançamentos e meses serão preservados. Reimporte o relatório completo de cada mês para evitar dados parciais.</p><div className="overflow-auto mt-3"><table className="w-full text-xs text-left"><thead><tr>{['Mês','Plataforma','País','Streams','Receita','Moeda'].map(h=><th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead><tbody>{preview.slice(0,5).map((row,i)=><tr key={i}><td>{row.month}</td><td>{row.platform}</td><td>{row.country}</td><td>{row.streams}</td><td>{row.revenue}</td><td>{row.currency}</td></tr>)}</tbody></table></div></div>}
 </div>
}
