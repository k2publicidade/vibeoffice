import fs from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const env=process.env;
if(!process.env.OFFICE_AUDIT_ACCOUNTS) throw Error('Set OFFICE_AUDIT_ACCOUNTS to a private account JSON file');
const accounts=JSON.parse(fs.readFileSync(process.env.OFFICE_AUDIT_ACCOUNTS,'utf8'));
const origin=process.argv[2] || 'http://localhost:3050';
async function login(account){
 const jar=new Map();const client=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});
 const result=await client.auth.signInWithPassword({email:account.email,password:account.password});if(result.error)throw result.error;return {client,cookie:[...jar].map(([name,value])=>name+'='+value).join('; ')};
}
const admin=await login(accounts[0]),manager=await login(accounts[1]);
for(const path of ['/','/tasks','/tickets','/calendar','/studio','/lancamentos','/chat','/drive','/courses','/courses/manage','/admin/avisos','/admin/usuarios','/profile','/settings','/settings/notifications','/vibecanvas']){
 const response=await fetch(origin+path,{headers:{cookie:admin.cookie},redirect:'manual'});
 if(response.status!==200)throw Error(path+' returned '+response.status);console.log('PASS ADMIN '+path);
}
for(const path of ['/admin/usuarios','/courses/manage']){
 const response=await fetch(origin+path,{headers:{cookie:manager.cookie},redirect:'manual'});if(response.status!==307)throw Error('Manager access '+path+' '+response.status);console.log('PASS gerente bloqueado '+path);
}
const payload={name:'Auditoria',email:'audit-http@example.invalid',password:'audit-password!123',role:'Colaborador',sector:'Administrativo'};
for(const [actor,headers] of [['Gerente',{cookie:manager.cookie,origin}],['CSRF',{cookie:admin.cookie,origin:'https://evil.example'}]]){
 const r=await fetch(origin+'/api/admin/users',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(payload)});if(r.status!==403)throw Error(actor+' '+r.status);console.log('PASS API negada '+actor);
}
const unauth=await fetch(origin+'/tasks',{redirect:'manual'});if(unauth.status!==307)throw Error('Anonymous route access');console.log('PASS acesso anônimo negado');
const webhook=await fetch(origin+'/api/notifications/deliver',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(webhook.status!==401)throw Error('Webhook unprotected');console.log('PASS webhook protegido');
console.log('HTTP CHECK COMPLETE');
