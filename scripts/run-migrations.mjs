import fs from 'node:fs';
import pg from 'pg';
import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
const file=process.argv[2];
if(!file || !process.argv.includes('--apply'))throw Error('Uso: node scripts/run-migrations.mjs supabase/migrations/ARQUIVO.sql --apply. Revise o arquivo antes.');
const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw Error('Defina DATABASE_URL localmente. Não versione a senha.');
const client=new pg.Client({connectionString,ssl:process.env.DATABASE_SSL_CA?{ca:fs.readFileSync(process.env.DATABASE_SSL_CA,'utf8'),rejectUnauthorized:true}:undefined});
try { await client.connect();await client.query(fs.readFileSync(file,'utf8'));console.log('Migração aplicada: '+file) } finally { await client.end() }
