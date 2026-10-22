# Recuperação de senha com confirmação explícita

## Problema observado

Página /update-password aberta com error_code=otp_expired continuava exibindo os campos de senha e botão sem explicar que faltava sessão válida. Usuário não tinha acesso ao email cadastrado e solicitou recuperação pelo sistema. Não alterar senha nem email administrativamente; a nova senha deve ser preenchida e salva pelo usuário.

## Correção

- /update-password valida usuário no serviço de autenticação antes de mostrar o formulário, interpreta erro de recuperação, verifica sessão novamente antes da gravação e mostra mensagens de tamanho mínimo e confirmação.
- /auth/recover recebe o hash de recuperação no fragmento, remove o fragmento do endereço e aguarda clique explícito em Continuar recuperação antes de chamar verifyOtp. GET ou prévia não consome o token. Compatível com StrictMode. A recuperação bem-sucedida segue para /update-password com sessão normal; as verificações de MFA existentes não são removidas.
- Página de recuperação sem indexação e com referrer no-referrer. Nenhum token, senha ou link de recuperação gravado no repositório. Não enviar email; gerar link administrativo apenas para a conta explicitamente indicada pelo usuário e entregar a interação final ao próprio usuário.

## Verificação

Cinco testes de interface: token expirado, sessão ausente, mínimo de caracteres e confirmação, ausência de consumo automático em StrictMode e erro na verificação. Suíte de 428 testes/50 suítes passou; testes direcionados passaram novamente após ajuste de StrictMode. TypeScript passou. Lint sem erros, dois avisos de estado em efeito. Build precisou de retry devido ao alerta existente Next.js registrado em vibeoffice-bzc.

## Publicação e entrega ao usuário

95648252540b6fa569d379c0a74bacb80d04f06a confirmado no domínio oficial e deployment dpl_8p6xPFAyk2vk58yXQi75dkYfHmDz READY/production. Browser confirmou fragmento removido e botão Continuar recuperação; verificação com token inválido exibiu erro. Nova recuperação da conta explicitamente indicada aberta no navegador e entregue ao usuário, aguardando clique e definição da própria senha. Nenhum email enviado e nenhuma senha alterada pelo agente.
