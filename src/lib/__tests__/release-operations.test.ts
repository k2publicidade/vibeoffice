import { parsePerformanceCsv, summarizePerformance, distributionChecklist } from '@/lib/release-operations'
import type { Release } from '@/types/releases'
const release = { title:'Single',artist:'Artista',releaseType:'single',releaseDate:new Date('2030-01-10'),fileReferences:{cover:'cover',wav:'audio'},composers:[{name:'Autor'}],tracks:[],isrc:'BRABC2600001',upc:'123456789012' } as unknown as Release
it('identifies missing requirements for internal review',()=>{
 expect(distributionChecklist(release).every(item=>item.ok)).toBe(true)
 expect(distributionChecklist({...release,wavUrl:undefined,fileReferences:{cover:'cover'}}).find(item=>item.key==='audio')?.ok).toBe(false)
})
it('parses Revelator-style reports with quotes, BOM and semicolon decimals',()=>{
 const rows=parsePerformanceCsv('\ufeffmonth;distributorName;country;streamsCount;netRevenue;currency;UPC\r\n2026-09;"Spotify; Premium";BR;1200;12,50;USD;123456789012', 'pt-BR')
 expect(rows).toEqual([{month:'2026-09',platform:'Spotify; Premium',country:'BR',streams:1200,revenue:12.5,currency:'USD',upc:'123456789012'}])
})
it('rejects ambiguous headers and malformed numbers instead of dropping data',()=>{
 expect(()=>parsePerformanceCsv('month,platform,streams,revenue,currency\n2026-09,Spotify,invalid,1,USD','en-US')).toThrow(/linha 2/i)
 expect(()=>parsePerformanceCsv('month,platform,streams,revenue,currency\n2026-13,Spotify,1,1,USD','en-US')).toThrow(/linha 2/i)
 expect(()=>parsePerformanceCsv('month,month,platform,streams,revenue,currency\n2026-09,2026-09,Spotify,1,1,USD','en-US')).toThrow(/duplicad/i)
})
it('keeps revenues separate by currency and supports negative adjustments',()=>{
 const rows=parsePerformanceCsv('month,platform,streams,revenue,currency\n2026-09,Spotify,10,2,USD\n2026-09,Apple Music,20,-1,BRL','en-US')
 expect(summarizePerformance(rows)).toMatchObject({streams:30,revenueByCurrency:{USD:2,BRL:-1}})
})
it('requires the report period and rejects unclosed quoted fields',()=>{
 expect(()=>parsePerformanceCsv('platform,streams,revenue,currency\nSpotify,1,1,USD','en-US')).toThrow(/month/i)
 expect(()=>parsePerformanceCsv('month,platform,streams,revenue,currency\n2026-09,"Spotify,1,1,USD','en-US')).toThrow(/aspas/i)
})
