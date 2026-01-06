# Guia de Deploy para Vercel - VIBEDISTRO

## ❌ Erro de Login em Produção Resolvido

O erro `"Unexpected token '<', '<!DOCTYPE"` que aparecia ao tentar fazer login em produção era causado por **variáveis de ambiente não configuradas no Vercel**.

### Erro Original
```
n: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
tuwqhdayuefuchotrspq.supabase.co/auth/v1/token?grant_type=password:1  Failed to load resource: the server responded with a status of 500
```

### Causa Raiz
Quando `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estão configuradas no Vercel, o Supabase client é inicializado com valores `undefined`, causando requisições malformadas.

---

## ✅ Solução Aplicada

Foi adicionada validação de variáveis de ambiente na inicialização da aplicação:

1. **src/lib/env.ts** - Valida variáveis na inicialização
2. **src/lib/init.ts** - Função de inicialização da aplicação
3. **src/app/providers.tsx** - Chama validação na inicialização
4. **src/lib/supabase/client.ts** - Usa env validado
5. **src/lib/supabase/server.ts** - Usa env validado
6. **src/middleware.ts** - Error handling melhorado

---

## 🚀 Como Fazer Deploy no Vercel

### Passo 1: Obter Credenciais do Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **Settings → API**
4. Copie:
   - **Project URL** (ex: `https://abc123def456.supabase.co`)
   - **anon public key** (começa com `eyJhbG...`)

### Passo 2: Configurar Variáveis no Vercel

1. Vá para seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **Settings**
3. Vá para **Environment Variables**
4. Adicione as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-aqui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**⚠️ IMPORTANTE:**
- As variáveis DEVEM começar com `NEXT_PUBLIC_` para estar disponíveis no frontend
- Não use `SUPABASE_SERVICE_ROLE_KEY` no Vercel (apenas localmente para seed)
- Não commite `.env.local` no git (já está em `.gitignore`)

### Passo 3: Permitir Origem no Supabase Auth

O Supabase precisa saber que sua aplicação em produção pode fazer requisições de autenticação.

1. No Supabase Dashboard, vá para **Authentication → Providers → Email**
2. Role até **Redirect URLs**
3. Adicione sua URL de produção:
   ```
   https://seu-dominio-vercel.vercel.app
   https://seu-dominio-customizado.com
   ```

### Passo 4: Deploy

```bash
# Fazer push para a branch
git push -u origin claude/fix-production-login-error-h1ppe

# Vercel detectará automaticamente e fará deploy
# Verifique em https://vercel.com/deployments
```

---

## 🧪 Testar o Login em Produção

### Credenciais de Teste

Todos os usuários de teste têm a senha `password123`:

- **Admin**: `eu@vibedistro.com`
- **A&R Manager**: `joao.silva@vibedistro.com`
- **Marketing Manager**: `maria.santos@vibedistro.com`

### Passos para Testar

1. Acesse sua URL de produção no Vercel
2. Vá para página de login (`/login`)
3. Tente fazer login com `eu@vibedistro.com` e `password123`
4. Se funcionar, você verá redirecionamento para o dashboard

### Se Ainda Não Funcionar

Abra o **DevTools → Console** e procure por uma das mensagens:

#### Erro de Variáveis de Ambiente
```
❌ ENVIRONMENT CONFIGURATION ERROR
Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Solução**: Verifique se as variáveis estão configuradas no Vercel settings.

#### Erro de Formato de URL
```
Invalid NEXT_PUBLIC_SUPABASE_URL: must start with https://
```

**Solução**: Copie a URL completa do Supabase (com `https://`).

#### Erro de Origem (CORS)
```
[CORS error] or [POST /auth/v1/token 403]
```

**Solução**: Adicione seu domínio Vercel às "Redirect URLs" no Supabase Auth settings.

#### Erro de Credenciais
```
Invalid login credentials
```

**Solução**: Verifique email/senha. Se criar novo usuário, execute `npm run db:seed` localmente com service role key.

---

## 📋 Checklist de Deploy

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada no Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada no Vercel
- [ ] Domínio Vercel adicionado às "Redirect URLs" do Supabase
- [ ] `.env.local` NÃO está commitado no git
- [ ] Build passa localmente: `npm run build`
- [ ] Login funciona em produção
- [ ] Redirecionamento automático de /login para / quando autenticado

---

## 🔐 Boas Práticas de Segurança

1. **NUNCA** use `SUPABASE_SERVICE_ROLE_KEY` no Vercel
   - Essa chave bypassa todas as políticas de segurança
   - Use apenas para scripts server-side localmente

2. **SEMPRE** use HTTPS em produção
   - Supabase rejeita requisições HTTP

3. **Valide credenciais** antes de salvar em local storage
   - Use o hook `useAuth()` que gerencia isso automaticamente

4. **Monitore logs** do Supabase para atividades suspeitas
   - Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → Logs

---

## 🆘 Suporte

Se o login ainda não funcionar após seguir estes passos:

1. Verifique os logs do Vercel: **Settings → Functions**
2. Verifique os logs do Supabase: **Logs** no dashboard
3. Abra o DevTools → **Network** tab e procure por requisições a `/auth/v1/token`
4. Procure por mensagens de erro no console do navegador

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Auth Settings](https://supabase.com/dashboard/project/_/settings/auth)
