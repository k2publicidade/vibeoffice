# Auditoria de dependências — 10/10/2026

O lockfile tinha 25 alertas: 19 moderados e seis altos. Após as alterações, restam cinco alertas altos no ambiente de desenvolvimento, derivados de um único aviso de `braces`. `npm audit --omit=dev` retorna zero vulnerabilidades conhecidas. Isso não comprova ausência de falhas desconhecidas.

## Correções verificadas

- `brace-expansion` 1.1.12 → 1.1.21, respeitando a faixa exigida pelo ESLint. A correção está publicada no [aviso do mantenedor](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).
- Override restrito a `@istanbuljs/load-nyc-config`: `js-yaml` 4.3.2. O carregador usa `load`, preservado nessa versão. A alteração remove `js-yaml` 3, `argparse` 1, `sprintf-js` e `esprima` dessa árvore de ferramentas, eliminando os 19 alertas moderados encadeados. A árvore do aplicativo não foi atualizada.
- `npm ci` reconstruiu as dependências a partir do lockfile. `npm ls` confirmou a resolução sem pacotes inválidos. A instalação exigiu encerrar o servidor local de auditoria na porta 3050, que mantinha o binário SWC aberto no Windows. Produção não foi interrompida.
- `npm run test:tooling` verifica leitura de YAML/JSON, herança de configuração, opções em camelcase, listas e tipos booleano/numérico. Os arquivos temporários são removidos ao terminar.

## Validação e limites

Build/TypeScript e lint sem erros passaram. A execução com cobertura passou nos 115 testes das 17 suites, mas o processo retornou falha porque a cobertura do aplicativo não atende ao limite global de 40% definido em `jest.config.js`: statements 14,38%, branches 13,29%, functions 12,86%, lines 15,01%. O gate e o conjunto de arquivos medidos foram preservados. A ampliação dos cenários está registrada em `vibeoffice-19`; auditorias SQL/HTTP não entram nessa medição Jest.

Os cinco alertas restantes seguem a cadeia `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` 3.0.3. O [aviso oficial](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) ainda não indica versão corrigida. A ferramenta usa o padrão `rootDir` da configuração local do ESLint; não foram encontrados imports dessa cadeia no código da aplicação. O alerta permanece registrado em `vibeoffice-20`. A sugestão automática de voltar `eslint-config-next` para 14.2.35 não foi aplicada.

Ainda há avisos de lint e atualizações opcionais, registrados em `vibeoffice-3`. A inspeção dos metadados de licenças encontrou principalmente MIT/ISC/Apache/BSD, além de MPL e LGPL em dependências como os binários de imagem; isso é um inventário, não uma conclusão jurídica sobre distribuição. Nenhum agendamento automático ou serviço adicional foi criado.

Para repetir: `npm ci`, `npm run test:tooling`, `npm test -- --runInBand --coverage`, `npm run lint -- --quiet`, `npm run build` e `npm audit --omit=dev`. Para revisar todo o ambiente, execute também `npm audit`. Reverter o commit de manutenção restaura os manifestos anteriores; execute `npm ci` novamente após a reversão.
