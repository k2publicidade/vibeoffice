# E-mail do VibeOffice com Resend

O usuário escolheu Resend em 10/10/2026. Existem duas configurações independentes: recuperação de senha pelo Supabase Auth e notificações pelo servidor Next.js.

## Pré-requisitos

Entrar na conta Resend, verificar um domínio controlado pela organização e escolher um remetente nesse domínio. Criar uma chave com permissão de envio limitada ao domínio. A chave deve ficar apenas nos painéis e nas variáveis privadas; nunca no Git, em variáveis `NEXT_PUBLIC_*`, em screenshots ou mensagens de chat.

## Recuperação de senha

No projeto Supabase `uipqqyqhwfzqhucvtrrf`, em Authentication → Emails → SMTP Settings, configurar:

| Campo | Valor |
| --- | --- |
| Sender email | Endereço escolhido no domínio verificado |
| Sender name | VIBEDISTRO Office |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Chave privada de envio do Resend |

Ativar e salvar somente após preencher todas as credenciais. O Site URL deve permanecer `https://office.vibedistro.com`, com `/auth/callback**` e `/update-password` autorizados nos redirects.

Referência: [integração oficial Resend/Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp).

## Notificações

Na Vercel, configurar `RESEND_API_KEY` e `EMAIL_FROM` no ambiente Production e republicar a aplicação. `EMAIL_FROM` pode seguir o formato `VIBEDISTRO Office <endereco@dominio-verificado>`.

O endpoint `/api/notifications/deliver` exige o segredo de webhook existente e respeita as preferências individuais. Mensagens e menções do chat não enviam e-mail. Cada notificação usa uma chave de idempotência, inclui o link do registro e só recebe `email_sent_at` depois da aceitação pelo Resend. Falhas HTTP, de rede e timeout preservam a entrega pendente para nova tentativa.

## Validação final

Usar apenas um destinatário autorizado para o teste. Solicitar recuperação pela tela de login, confirmar entrega e verificar que o link chega à tela de atualização de senha. A alteração da senha deve ser realizada pelo titular. Habilitar a preferência de e-mail desse destinatário e gerar uma notificação de tarefa: conferir entrega, link, `email_sent_at` e ausência de duplicação ao repetir o webhook. Aceitação da API não comprova recebimento na caixa de entrada; conferir o status no Resend e a mensagem recebida.

Até concluir essas verificações, o item `vibeoffice-2` permanece em andamento.


## Preparação em 10/10/2026

Conta Resend conectada. Domínio `vibedistro.com` cadastrado na região São Paulo (sa-east-1), ID `91af9ba6-1196-48c5-ac70-5c33a72a6dab`. Nameservers públicos confirmam Cloudflare. O painel Cloudflare está aguardando login do titular. Recebimento de e-mail ficou desativado; remetente proposto: `VIBEDISTRO Office <notificacoes@vibedistro.com>`.

Registros públicos exibidos pelo Resend (DNS only, TTL Auto):

| Tipo | Nome | Conteúdo |
| --- | --- | --- |
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDAftdbjfnEnfTuRzjVtC+uFhvVWq03wcLBTwjXlX7FPoiYDIa98v8g2lwT4dASOoLS5ZlyyRhD7t6k+Q+Bu6neRLPCnrnn7A3sdYCJWNhCR78Cx01Ox3aNvUUdB6B5Cx3v8RDYdvP3PgESlJCZQHWpmTVxgGYJTEsJlFLTELDddwIDAQAB |
| CNAME | rsend | rsend-sae1.forge.rmta.net |
| CNAME | send | send.forge.rmta.net |

Os registros devem ser conferidos contra o painel antes de salvar. Não alterar registros existentes de web ou recebimento. Criação da chave de envio limitada ao domínio e autorização DNS aguardam confirmação exigida pela ferramenta de navegador. A chave será configurada apenas no SMTP Supabase e nas variáveis privadas de Production da Vercel. Testar entrega somente no endereço autorizado pelo titular.
