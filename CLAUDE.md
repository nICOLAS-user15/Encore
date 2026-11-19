# CLAUDE.md

Guia para agentes trabalhando neste repositório.

## Visão

Encore é um PWA de log de treino de musculação, usado de verdade na academia (celular, mão suada, sinal ruim). Também é projeto de portfólio e de aprendizado. Por isso:

- Explique decisões importantes brevemente, em português.
- Prefira código simples e legível a soluções "espertas".
- Não adicione dependências sem justificar.

## Offline-first (regra central)

- **Sem back-end por enquanto.** O IndexedDB (via Dexie) é a fonte da verdade. Nada pode depender de rede para funcionar.
- Nunca carregue recursos de CDN (fontes, scripts, imagens): tudo precisa estar no precache do service worker.
- A sincronização futura será construída por cima do banco local. Preserve as regras abaixo.

## Stack

Vite 8 · React 19 · TypeScript 6.0 (`strict`) · Tailwind CSS v4 · React Router v8 · Dexie 4 + dexie-react-hooks · vite-plugin-pwa · Vitest + Testing Library + fake-indexeddb · ESLint + Prettier · pnpm.

- O TS fica na 6.0 porque o `typescript-eslint` ainda não suporta o 7. Não atualize sem checar isso.
- `pnpm-workspace.yaml` existe para isolar o projeto: a pasta pai do usuário tem um workspace pnpm próprio.
- React Router: importe de `react-router` (não de `react-router-dom`); o `RouterProvider` vem de `react-router/dom`.

## Comandos

```bash
pnpm dev             # dev server
pnpm build           # tsc -b + vite build (gera o service worker)
pnpm preview         # serve o build; use para testar offline
pnpm lint            # eslint + prettier --check
pnpm format          # prettier --write
pnpm test            # vitest run
pnpm generate-icons  # ícones PWA a partir de public/logo.svg
```

Antes de considerar uma tarefa pronta: `pnpm build`, `pnpm lint` e `pnpm test` precisam passar.

## Estrutura

- `src/app/`: router (`routes.tsx` exporta as rotas para os testes), `AppLayout` (TopBar + SideMenu + BottomNav), `Splash`, `UpdatePrompt`, `startPage.ts` (abrir o app do zero sempre leva a /treino, antes de criar o router; recarregar mantém a página).
- Exercícios: "livres" x "máquinas" é derivado do equipamento por `exerciseKind()` (src/features/exercises/exerciseKind.ts: máquina e polia = máquinas), não é guardado no banco.
- Telas internas declaram `handle: { backTo: "/pai" }` na rota: a TopBar mostra "Voltar" (volta no histórico; sem histórico, vai para `backTo`). As abas principais mostram menu + configurações.
- `src/i18n/`: `pt.ts` (fonte da verdade e tipo `Messages`), `en.ts`, `context.ts` (`useI18n`: `t`, `format`, `exerciseName`, `language`) e `I18nProvider` (lê o idioma das configurações).
- `src/features/settings/`: configurações (registro único com id fixo `SETTINGS_ID`, gravado por `updateSettings`, exceção à regra do repository) e tela Sobre.
- `src/features/<area>/`: telas e lógica de cada aba (workout, routines, exercises, history). Padrão por área: `*Actions.ts` (escritas, recebem `db` por parâmetro), `*Queries.ts` (leituras), `*Stats.ts` (funções puras) e componentes `.tsx`. Telas leem com `useLiveQuery` e se atualizam sozinhas.
- Treino ativo = workout com `endedAt === null` (só um por vez; `startWorkout` devolve o existente). Os exercícios de um treino são derivados das séries (`groupSetsByExercise`); não existe tabela WorkoutExercise.
- Rotas do treino: `/treino` = lista (`StartWorkout`, com cartão "Continuar" se houver treino aberto); `/treino/:workoutId` = `ActiveWorkoutScreen` (handle `backTo: '/treino'`), que redireciona sozinha ao finalizar (histórico) ou descartar (lista); o `ActiveWorkout` não navega. Telas que iniciam treino usam `startOrSwitchWorkout` (troca livre se o treino aberto não tem série concluída; senão `blocked` → confirmação) e navegam para `/treino/<id>`. A aba Treino aponta para o treino aberto (`activePrefix` no BottomNav).
- Divisões de treino (src/features/splits/): `Split` agrupa rotinas (Upper/Lower, PPL...). `Routine.splitId` aponta para ela; as abas de divisão (`SplitTabs`) aparecem em Treino, Rotinas e no editor da rotina, e a divisão escolhida fica em `Settings.activeSplitId` (um só valor para o app inteiro; `useSplits()` resolve e grava; se o id sumiu, vale a primeira). Regras: a sequência ("próximo") é POR divisão (`lastRoutineIdInSplit`; a posição da rotina é entre as da mesma divisão); `deleteSplit` exclui a divisão E as rotinas dela (exclusão lógica, devolve quantas; a tela confirma dizendo o número; o histórico fica); rotina órfã (divisão inexistente) aparece na primeira divisão (`routinesOfSplit`); `createRoutine` exige o `splitId`.
- Rotinas: editor em /rotinas/:routineId (existente) e /rotinas/nova?divisao=<id> (nova). Trabalha com um RASCUNHO (`routineDraft.ts`, funções puras): nada vai para o banco até o botão **Salvar** (`saveRoutine`: transação única que cria/atualiza a rotina, exclui/cria/atualiza os exercícios na ordem do rascunho, troca a divisão e renumera a sequência da divisão de destino). Rotina nova só existe após Salvar. Sair com alterações abre "Descartar alterações?" (`useBlocker`; `allowLeave` libera o Salvar/Excluir). Reordenação de exercícios e da rotina é do rascunho (`moveDraftItem`, `position`).
- **O app começa vazio:** nenhuma rotina, divisão ou treino pessoal vem no código (o programa de exemplo foi removido). Dados de exemplo só existem para testes, em `src/test/fixtures.ts` (`importTestProgram`, cargas inventadas), que nunca é importado pelo app. Não coloque dados pessoais em nada que vá para o navegador.
- Exercícios fora da biblioteca: no `ExercisePicker`, digitar um nome que não existe oferece "+ Criar" (`NewExerciseForm`: grupo muscular e equipamento obrigatórios, sem padrão). `createCustomExercise` salva com `isCustom: true`, nome nos dois idiomas, e devolve o existente se o nome já existe em qualquer idioma (`nameKey` em `src/lib/text.ts`).
- `src/db/`: `types.ts`, `db.ts` (schema e versões), `migrations/` (uma função de upgrade por versão, com teste; schema atual = v3, que criou `splits`), `repository.ts` (escritas), `queries.ts` (leituras), `seed.ts`.
- `src/ui/`: componentes base e `theme.css` (tokens + CSS base).
- `src/lib/`: funções puras e testáveis.

## Regras do banco (Dexie)

- IDs: UUID gerado no cliente com `crypto.randomUUID()`. Exceção: o seed usa IDs fixos (não mude os existentes).
- Seed (`src/db/seed.ts`): `SEED_EXERCISES_V1` (os 25 originais, **congelados**: a migração v2 depende deles) + `SEED_EXERCISES_LIBRARY` (biblioteca ampliada). `syncSeedExercises` roda a cada abertura e só adiciona o que falta: pula ids já existentes (inclusive excluídos, para não "ressuscitar") e nomes já existentes em qualquer idioma (para não duplicar exercícios do programa). Para adicionar exercícios, acrescente na `LIBRARY` com UUID novo fixo. Migrações nunca devem ler a lista atual do seed.
- Todo registro estende `BaseRecord` (`id`, `createdAt`, `updatedAt`, `deletedAt`). Datas em epoch ms (`number`).
- **Escritas passam por `src/db/repository.ts`** (`createRecord`, `updateRecord`, `softDelete`), nunca `table.add/put` direto nas telas.
- **Exclusão sempre lógica** (`softDelete`). Leituras filtram com `isActive`.
- Carga sempre em kg (`weightKg`); converter só na exibição (`src/lib/units.ts`).
- Mudou índices ou tabelas? Crie `db.version(N + 1)` com `.upgrade(...)` em `src/db/migrations/vN.ts` e um teste que abre um banco da versão anterior; nunca edite uma versão já publicada. O autor TEM dados reais: migrações precisam preservá-los.
- Exercícios têm `names: { pt, en }` (não `name`). Na tela, use `exerciseName(exercise)` do `useI18n`. Programa e seed compartilham o nome em inglês para se reconhecerem como o mesmo exercício.
- Treino: `startedAt`/`endedAt` = abertura/finalização; `timerStartedAt`/`timerStoppedAt` = cronômetro controlado pelo usuário. Duração no histórico: `workoutDurationMs`.
- IndexedDB não indexa booleanos nem `null`: não crie índice em `isCustom`; lembre que `completedAt = null` fica fora de `[exerciseId+completedAt]`.
- Tabelas tipadas como `Table<T, ID>` (não `EntityTable`, que deixa o id opcional).

## Design system

Sujo, escuro e minimalista: a sujeira é textura, o minimalismo é estrutura.

- Tokens em `src/ui/theme.css` (`@theme`). As escalas padrão do Tailwind de cor, raio e sombra foram **removidas**; use só: `background`, `surface`, `text`, `muted`, `line`, `accent`, `accent-bright`, `accent-pressed`.
- **Uma única cor de acento**, só para ação principal da tela e recordes (PRs). `accent` em fundos/botões, `accent-bright` em texto e ícones pequenos, `accent-pressed` no estado pressionado. Aba ativa e estados de navegação NÃO usam acento.
- **Um botão vermelho por tela.** Se a ação principal muda (ex.: "Iniciar cronômetro" antes da 1ª série, "Finalizar treino" depois), o vermelho muda junto. Confirmações que apagam (descartar, remover, excluir) usam `ConfirmSheet destructive` (botão `destructive`, claro sobre escuro), nunca o vermelho.
- Texto mínimo `text-xs` (12px): nada de `text-[11px]`.
- Tipografia: `font-display` (Oswald) em títulos e números grandes, `font-sans` (Inter) no corpo, `tabular-nums` em cargas e repetições.
- Bordas grossas (`border-2`/`border-4`) e retas; raio só `rounded-sm` (2px) ou `rounded-md` (4px).
- **Proibido:** gradientes, sombras suaves, animação em loop ou "só enfeite".
- **Movimento (aprovado pelo autor):** curto (≤ ~450ms), seco, e só quando ajuda a entender algo. Tokens em `theme.css` (`animate-splash-*`, `sheet-in`, `menu-in`, `fade-in` no `backdrop:`, `screen-in` na troca de tela via `key={pathname}` no AppLayout, `dock-in` nos filhos da doca, `stamp` no ✓ só após o toque, `nudge` no fim do descanso, `glitch`/`glitch-ghost` na `GlitchWordmark` do menu). Botões afundam com `active:scale-*`. Uma regra global em `@media (prefers-reduced-motion: reduce)` zera tudo: não precisa de `motion-reduce:` por componente. Duas animações no mesmo elemento brigam pela propriedade `animation`: use camadas (ex.: RestTimer).
- Entrada (Splash) dura `SPLASH_DURATION_MS` = 1800ms; mudar um exige mudar os tokens `splash-*` também.
- Mobile: alvos de toque ≥ 48px (`min-h-12`), inputs ≥ 16px, safe areas com `pt-safe`/`pb-safe`, sem overscroll, `user-select: none` em UI (já no CSS base).
- Componentes base em `src/ui/`: Button, Card, ScreenHeader, BottomNav, NumberStepper, EmptyState, Sheet, ConfirmSheet, BottomDock, Logo (`stamp`/`wordmark`), icons (SVGs próprios, sem biblioteca de ícones).
- Painéis (Sheet, SideMenu) são `<dialog>` nativos via `useModalDialog(open)`: o navegador cuida de foco, fundo inerte e Esc. Conteúdo só é renderizado com `open`. Sheet tem seta ← "Voltar" à esquerda do título.
- Avisos fixos acima das abas (descanso, nova versão, "Treino em andamento") vão dentro de `<DockItem>`: eles se empilham na doca (`BottomDockProvider` no App.tsx). Não crie outro `fixed bottom-...`.
- Logo: `public/logo.svg` é a fonte dos ícones PWA (`pnpm generate-icons`); o componente `Logo` usa o mesmo desenho.

## Convenções de código

- Identificadores em inglês; comentários em português.
- **Nenhum texto de interface fixo no componente**: adicione a chave em `src/i18n/pt.ts` E em `src/i18n/en.ts` e use `t.area.chave`. Números e datas via `format.*` do `useI18n`. Nomes de idiomas aparecem no próprio idioma ("Português", "English").
- Componentes como funções nomeadas com export nomeado (sem `export default`).
- Props tipadas com `type`; nada de `any`.
- Testes ao lado do arquivo (`*.test.ts(x)`); testes de banco usam `createDatabase('<nome único>')`.
- Commits em Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), pequenos, um por etapa lógica.
- **O autor faz os commits.** Agentes não rodam `git commit`/`git push`: entregam os comandos (`git add <arquivos>` + `git commit -m ...`, um por etapa) para ele executar.

## Exercícios do autor

São exercícios de aprendizado com TODO e testes em `describe.skip`. **Não implemente** essas funções, a menos que o autor peça:

1. `src/lib/units.ts`: `kgToLb`, `lbToKg`, `formatWeight`.
2. `src/lib/oneRepMax.ts`: `estimateOneRepMax` (Epley).
3. `src/lib/time.ts`: `formatDuration` (o placeholder atual só mostra minutos).

Enquanto `formatWeight` não existir, a UI mostra cargas só em kg via `formatDecimal`/`formatSet` (`src/lib/format.ts`).

## Funcionalidades: regras que o código não mostra

Estado e roadmap: ver o README. Regras de cada funcionalidade (o que o código sozinho não conta):

- Descanso por exercício: `RoutineExercise.restSeconds` (`null` = padrão das Configurações); leia com `restSecondsOf`, que cobre itens antigos sem o campo. O "Descansar" manual usa o exercício da próxima série. Resumo comparado: `ComparisonCard` no detalhe do treino (volume, séries e duração vs. a vez anterior da mesma rotina, via `getPreviousSummary` + `compareWorkouts`). Menu ⋯ no cartão do exercício (aquecimento e remover; o rodapé fica só com + Série / + Encore). PRs e kg/lb esperam os exercícios do autor (units.ts, oneRepMax.ts).

- Progressão (src/features/workout/progression.ts): progressão dupla em `suggestNextLoad` (topo da faixa em todas as séries na carga mais alta → +salto e volta ao mínimo; senão +1 rep, com teto no topo). Só séries `normal` contam (encore e aquecimento não). Peso corporal (`stepKg = null`) progride só em reps. "Aplicar" (`applyLoadSuggestion`) muda só as séries `normal` pendentes.
- Saltos de carga por equipamento: `Settings.weightStepsKg` (sem índice, sem migração; `getSettings` junta com o padrão). Use `weightStepFor(settings, equipment)` para a sugestão e para o −/+ do editor de série.

- Cronômetro (`WorkoutTimer`): antes de iniciar mostra "Iniciar" + "Descansar"; depois de iniciado mostra "Pausar"/"Retomar" + "Finalizar treino" (abre a confirmação; `finishWorkout` também para o cronômetro), e o botão do rodapé some. Pausa: `Workout.timerPausedAt` (opcional, sem migração); ao retomar, `timerStartedAt` avança o tempo da pausa. Leia o tempo SEMPRE por `timerElapsedMs`/`workoutDurationMs` (workoutStats.ts), não por `timerStoppedAt ?? now`. O descanso vem sozinho ao concluir a série.
- Atualização do app (`applyUpdate`): o "Atualizar" do `UpdatePrompt` recarrega também por `controllerchange` e, no pior caso, após 1,5s (só `updateServiceWorker(true)` falhava em silêncio no celular).
- Observações de rotina/exercício são texto livre: não se traduz. `useI18n().note()` só traduz as frases padrão do programa antigo (`src/i18n/notes.ts`); o banco não muda.
- Aquecimento (`type: "warmup"`): fica fora de volume, contagem e "última vez"; use `isWorkingSet`, `completedWorkingSets` e `numberSets` (src/features/workout/workoutStats.ts).
- Backup (src/features/settings/backup.ts): ao criar uma versão nova do schema, `parseBackup` precisa converter backups antigos (hoje aceita v2 e v3: `upgradeBackupFromV2` faz com o arquivo o que a migração v3 faz com o banco, usando o MESMO id fixo `LEGACY_SPLIT_ID`, para não duplicar a divisão). Ao criar a v4, estenda essa conversão e acrescente os testes de backup antigo. `saveBackupFile` devolve `false` se o usuário cancelou a tela de compartilhar; só com `true` grava `Settings.lastBackupAt`. Lembrete (`backupReminder.ts`): aparece na lista de treinos quando há treino finalizado e nenhum backup há 14+ dias. Use `loaded` do `useSettings` antes de decidir algo pelo valor padrão (evita "piscar").
- Áudio: `unlockAudio()` só funciona dentro de um toque do usuário; chame antes de qualquer `await`.
- Pontos de interface já decididos: próxima série em destaque (`nextPendingSetId`), faixa de treino em andamento, rotina ativa com "Continuar", doca, `<dialog>`. Backlog: histórico paginado/agrupado, editar/excluir exercício personalizado, rotas preguiçosas (React.lazy), cabeçalho compacto no treino, evolução (gráficos).
- **Avisos e erros (`src/ui/Toast.tsx` + `toastContext.ts`):** `useAction()` envolve escritas disparadas pelo usuário (`run(() => ...)`) e mostra erro em vez de falhar em silêncio; `useToast().showUndo(msg, undo)` mostra "Desfazer" na doca (excluir série, remover exercício, excluir treino do histórico). Desfazer = `restoreRecord`/`restoreSets`/`restoreWorkout` (a exclusão é sempre lógica). Rotas têm `errorElement` (`ErrorScreen`) e a falha ao abrir o banco mostra `ErrorScreen database` (main.tsx).
- **Descanso fica acima das telas:** `RestTimerProvider` (no `AppLayout`) + `useRest()`; só apita na passagem de "contando" para "acabou" e descarta descanso já vencido ao reabrir.
- **Backup é entrada não confiável:** `parseBackup` valida e COPIA cada linha (`backupSchema.ts`); importar dedupa exercício por `nameKey` e finaliza treino aberto extra (nunca fica treino "fantasma"). Bordas de controles usam `border-line-strong` (≥3:1); `line` só em divisores e cartões.

## Armadilhas já encontradas

- iOS: tocar num botão NÃO tira o foco de um `<input>`; não dependa de `onBlur` para salvar valores (o NumberStepper repassa cada número válido no `onChange`).
- Testes de tela usam o `db` global (fake-indexeddb): limpe as tabelas no `beforeEach` e use `findBy*`/`waitFor` para o que vem do banco. Sem `I18nProvider`, os componentes usam português (valor padrão do contexto).
- Lint do React Compiler (`react-hooks/purity`): não chame `Date.now()` durante a renderização; use `useNow()`.
- jsdom não tem `showModal()`/`close()` do `<dialog>`: `src/test/setup.ts` tem uma imitação mínima. Com um painel aberto, o "Voltar" dele também existe: em testes, prefira esperar pela URL a procurar "Voltar".
