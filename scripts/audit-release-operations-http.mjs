import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
const origin=process.argv[2]||'https://office.vibedistro.com';
if(!/^https:\/\/office\.vibedistro\.com$/.test(origin)&&!/^http:\/\/localhost:\d+$/.test(origin))throw Error('Use the official Office domain or localhost');
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[];let releaseId;
function checked(result,label){if(result.error)throw new Error(label+': '+result.error.message);return result.data}
async function account(role){
 const email='audit-ops-http-'+randomUUID()+'@example.invalid';
 const {user}=checked(await service.auth.admin.createUser({email,email_confirm:true,app_metadata:{office_enabled:true},user_metadata:{name:'AUDITORIA DISTRIBUIÇÃO'}}),'create fixture');users.push(user.id);
 checked(await service.from('users').update({role,active:true,sector:'Administrativo'}).eq('id',user.id).select('id').single(),'activate fixture');
 const jar=new Map();
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});
 const link=checked(await service.auth.admin.generateLink({type:'magiclink',email}),'fixture session');
 checked(await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'authenticate fixture');
 return {client,cookie:[...jar].map(([name,value])=>name+'='+value).join('; ')};
}
async function api(actor,method='GET',body){
 const response=await fetch(origin+'/api/release-operations',{method,redirect:'manual',headers:{cookie:actor.cookie,origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const text=await response.text();let data;try{data=JSON.parse(text)}catch{throw Error('API returned non-JSON '+response.status)}
 return {status:response.status,data};
}
try {
 const member=await account('Colaborador'),admin=await account('Admin');
 const release=checked(await member.client.rpc('save_office_release',{release_id:null,changes:{title:'AUDITORIA HTTP DISTRIBUIÇÃO',artist:'AUDITORIA',release_type:'single',release_date:'2035-10-22',cover_url:'audit-placeholder',wav_url:'audit-placeholder',composers:[{name:'Autor auditoria'}],isrc:'BRABC2600001',upc:'123456789012'}}),'create release fixture');releaseId=release.id;
 const html=await fetch(origin+'/lancamentos',{headers:{cookie:admin.cookie}});assert.equal(html.status,200);const page=await html.text();assert.equal(new URL(html.url).pathname,'/lancamentos');assert.ok(page.includes('/_next/'));
 let response=await api(member,'PATCH',{releaseId,action:'submit_review',revision:0,rights_confirmed:true});assert.equal(response.status,200);assert.equal(response.data.stage,'in_review');
 response=await api(member,'PATCH',{releaseId,action:'approve',revision:1});assert.equal(response.status,403);
 response=await api(admin,'PATCH',{releaseId,action:'approve',revision:1});assert.equal(response.status,200);assert.equal(response.data.stage,'approved');
 response=await api(admin,'POST',{releaseId,csv:'month,platform,country,streams,revenue,currency,upc\n2026-09,Spotify,BR,100,2.50,USD,123456789012',locale:'en-US',source:'AUDITORIA-HTTP.csv'});assert.equal(response.status,200);assert.equal(response.data.rows,1);
 response=await api(admin);assert.equal(response.status,200);assert.equal(response.data.metrics.find(row=>row.release_id===releaseId).revenue,2.5);
 response=await api(member);assert.equal(response.status,200);assert.equal(response.data.metrics.find(row=>row.release_id===releaseId).revenue,null);
 console.log('PASS published authenticated page and real HTTP review, admin approval, CSV import, analytics and financial privacy. No Revelator delivery called.');
}finally{
 const failures=[];
 if(releaseId){const result=await service.from('releases').delete().eq('id',releaseId);if(result.error)failures.push(result.error)}
 for(const id of users.reverse()){const result=await service.auth.admin.deleteUser(id);if(result.error)failures.push(result.error)}
 if(failures.length)throw new AggregateError(failures,'Fixture cleanup failed');
 console.log('CLEANUP: disposable release, reports, history and audit accounts removed.');
}
