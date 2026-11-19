# Encore

Log de treino de musculação, pensado para usar **no celular, no meio da série e sem sinal**.

O Encore é um PWA (Progressive Web App): instala na tela de início do Android e do iOS, abre em tela cheia e funciona 100% offline. Todos os dados ficam no próprio aparelho.

> **Status:** já dá para treinar. Divisões de treino e rotinas que você mesmo monta, treino ativo com timer de descanso e histórico funcionando offline. Veja o [roadmap](#roadmap).
>
> **Quer usar no celular?** Siga o tutorial [Como abrir no celular](#como-abrir-no-celular).

## Funcionalidades

- **Treino ativo:** comece por uma rotina (o app sugere a próxima da sequência) ou faça um treino livre. Cada série já vem preenchida com o que você fez da última vez. Escolheu o treino errado? Volte para a lista e escolha outro: sem séries feitas, a troca é na hora.
- **Sugestão de carga (progressão dupla):** bateu o topo da faixa em todas as séries? O app sugere subir a carga pelo salto do equipamento; senão, buscar +1 repetição. Um toque em "Aplicar" preenche as séries que faltam.
- **Registro rápido:** carga e repetições com botões grandes de −/+ ou digitando; séries extras marcadas como _encore_.
- **Cronômetro do treino sob seu controle:** começa parado; você inicia (depois da mobilidade, por exemplo) e para quando quiser.
- **Timer de descanso:** começa ao concluir uma série (ou no botão Descansar) e continua certo mesmo com a tela apagada, e a barra acompanha você em qualquer aba (o aviso de fim, com bipe e vibração, vale em qualquer tela). Duração padrão nas Configurações e descanso próprio por exercício na rotina (agachamento 3 min, elevação lateral 1 min).
- **Divisões de treino:** guarde várias divisões (Upper/Lower, PPL, ABC...), cada uma com as suas rotinas. Abas no topo das telas Treino e Rotinas trocam de divisão, e cada divisão tem a sua própria sequência ("próximo treino"): dá para alternar entre PPL e Upper/Lower sem perder onde parou em nenhuma. Crie, renomeie, reordene e exclua divisões, e mova rotinas entre elas.
- **Rotinas:** crie e edite as suas (séries, faixa de reps, carga de referência, descanso, ordem dos exercícios e da sequência). As mudanças ficam num rascunho e só valem quando você toca em **Salvar**; sair sem salvar pede confirmação. O app começa vazio: cada pessoa monta os próprios treinos.
- **Exercícios:** biblioteca com cerca de 100 exercícios (máquinas, polias, barras, halteres, kettlebell e peso corporal), busca que ignora acentos, filtro por grupo muscular e por tipo (livres x máquinas).
- **Histórico:** cada treino com duração, séries, volume, o detalhe de cada série e a comparação com a vez anterior da mesma rotina.
- **Português e inglês:** a interface, as datas, os números e os nomes dos exercícios trocam de idioma nas Configurações.
- **Navegação:** abas embaixo (alcance do polegar), menu lateral, atalho de configurações e botão Voltar nas telas internas (essencial no iPhone, onde o app instalado não tem o voltar do navegador).
- **Backup:** exporte um arquivo (no celular, pela tela de compartilhar) e importe em outro aparelho; a importação junta os dados sem duplicar e mantém sempre a versão mais recente. O app mostra a data do último backup e lembra você depois de 14 dias.
- **Feito para a academia:** tela ligada durante o treino, bipe no fim do descanso e séries de aquecimento que não distorcem volume nem a "última vez".
- **Desfazer:** excluir uma série, remover um exercício do treino ou excluir um treino do histórico mostra um aviso "Desfazer" por alguns segundos (a exclusão é sempre lógica).
- **Nada se perde:** cada toque é gravado na hora no aparelho; se o app fechar no meio do treino, ele continua de onde parou.

## Stack

| Camada               | Ferramenta                                                 |
| -------------------- | ---------------------------------------------------------- |
| Build e dev server   | [Vite](https://vite.dev)                                   |
| UI                   | React 19 + TypeScript (`strict`)                           |
| Estilo               | Tailwind CSS v4 (tokens no CSS, via `@theme`)              |
| Navegação            | React Router                                               |
| Dados                | [Dexie](https://dexie.org) sobre IndexedDB                 |
| Offline / instalação | `vite-plugin-pwa` (Workbox) + `@vite-pwa/assets-generator` |
| Fontes               | Oswald e Inter, self-hosted via Fontsource                 |
| Testes               | Vitest + Testing Library + `fake-indexeddb`                |
| Qualidade            | ESLint + Prettier                                          |

## Como rodar

Requisitos: Node 22+ e [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev            # servidor de desenvolvimento
pnpm build          # checagem de tipos + build de produção (gera o service worker)
pnpm preview        # serve o build (é aqui que o modo offline funciona)
pnpm lint           # ESLint + verificação do Prettier
pnpm format         # formata tudo com o Prettier
pnpm test           # testes (uma vez)
pnpm test:watch     # testes em modo observação
pnpm generate-icons # regenera os ícones a partir de public/logo.svg
```

O service worker só é gerado no `build`. Para testar o modo offline, use `pnpm build && pnpm preview`.

## Como abrir no celular

O app de verdade (instalável e offline) precisa estar publicado num endereço **HTTPS**. O caminho mais simples é a [Vercel](https://vercel.com), que é gratuita e publica sozinha a cada `git push`.

### 1. Publicar na Vercel (só na primeira vez)

1. Crie uma conta em [vercel.com](https://vercel.com) entrando com o **GitHub**.
2. Clique em **Add New… → Project** e escolha o repositório **Encore**. Se ele não aparecer (repositório privado), clique em **Adjust GitHub App Permissions** e libere o acesso a ele.
3. A Vercel reconhece o Vite sozinha: build `pnpm build`, pasta `dist`. Não mude nada e clique em **Deploy**.
4. Em cerca de 1 minuto você recebe um endereço como `https://encore-xxxx.vercel.app`. É ele que você vai abrir no celular.

A partir daí, **todo `git push` na `main` publica uma versão nova automaticamente**. O `vercel.json` já cuida das rotas (abrir `/historico` direto funciona) e de o service worker nunca ficar preso numa versão velha.

### 2. Instalar na tela de início

Abra o endereço no celular **com internet** (a primeira visita baixa o app para o aparelho) e instale.

**Android (Chrome)**

1. Abra o endereço no **Chrome**.
2. Toque no menu **⋮** (canto superior direito) e depois em **Instalar app**. Em algumas versões, a opção se chama **Adicionar à tela inicial**.
3. Confirme em **Instalar**. O ícone do Encore aparece junto com os outros apps.

**iPhone (Safari)**

1. Abra o endereço no **Safari** (é o caminho mais garantido no iOS).
2. Toque em **Compartilhar** (o quadrado com a seta para cima, na barra de baixo).
3. Role a lista e toque em **Adicionar à Tela de Início**, depois em **Adicionar**.

Daqui em diante, **abra sempre pelo ícone**: o app abre em tela cheia, sem a barra do navegador, e começa na aba Treino.

### 3. Conferir o modo offline

Depois de abrir o app instalado uma vez com internet, ligue o **modo avião** e abra de novo. Tudo deve funcionar: iniciar treino, registrar séries, ver o histórico.

### 4. Levar seus treinos de um aparelho para outro

Os dados ficam **só no aparelho** (não há servidor). Para levar os treinos do computador para o celular, ou para um celular novo:

1. No aparelho de origem: **Configurações → Backup → Exportar backup**. No computador, isso baixa um arquivo `encore-backup-AAAA-MM-DD.json`; no celular, abre a tela de compartilhar.
2. Mande o arquivo para o celular (WhatsApp, e-mail, Drive…) e salve-o em **Arquivos**.
3. **No app instalado** (aberto pelo ícone): **Configurações → Backup → Importar backup** e escolha o arquivo.

A importação junta os dados sem duplicar nada. Se o mesmo registro existir nos dois lados, fica a versão editada por último.

> **iPhone:** o app instalado e o Safari guardam dados **separados**. Importe o backup _dentro do app instalado_, não numa aba do Safari.
>
> **Dica:** exporte um backup de vez em quando. Trocar de celular ou apagar os dados do navegador apaga os treinos.

### 5. Atualizações

Quando sai uma versão nova (depois de um `git push`), o app mostra o aviso **"Nova versão disponível"** acima das abas. Toque em **Atualizar**. Se o aviso não aparecer, feche o app de vez e abra de novo, com internet.

### Alternativa para desenvolvimento: mesma rede Wi‑Fi

Para ver mudanças no celular sem publicar, com o computador e o celular **na mesma rede Wi‑Fi**:

```bash
pnpm dev --host     # mostra um endereço "Network", ex.: http://192.168.0.10:5173
```

Abra esse endereço no navegador do celular. Limitações: sem HTTPS **não dá para instalar, não funciona offline e a tela não fica ligada**. Serve só para olhar o visual. Redes de empresa ou faculdade costumam bloquear essa conexão; nesse caso, use a Vercel.

### Problemas comuns

| Problema                               | O que fazer                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| "Instalar app" não aparece no Android  | Espere a página carregar por completo e recarregue; ou use **Adicionar à tela inicial** no mesmo menu. |
| O bipe do descanso não toca no iPhone  | A chave de silencioso (lateral do iPhone) também cala o bipe.                                          |
| A tela apaga durante o treino          | Confira **Configurações → Durante o treino**. No iPhone, isso precisa do iOS 18.4 ou mais novo.        |
| Abri no celular e não tem meus treinos | Normal: os dados não viajam sozinhos. Faça o passo 4 (backup).                                         |
| A versão nova não chega                | Feche o app de vez e abra com internet; o aviso "Nova versão disponível" deve aparecer.                |

## Estrutura

```
src/
  app/        router, layout (barra do topo, menu lateral), entrada animada, aviso de nova versão
  features/   uma pasta por área do app (workout, routines, splits, exercises, history, settings)
  i18n/       textos em português (pt.ts) e inglês (en.ts), provider e formatadores
  db/         schema do Dexie, tipos, seed, migrações, repositório e consultas
  ui/         componentes base e tema (theme.css)
  lib/        funções puras (conversão de unidades, 1RM...)
  test/       configuração dos testes
```

## Decisões técnicas

**Offline-first, sem back-end.** O IndexedDB do aparelho é a fonte da verdade. Academia tem sinal ruim, e um app de log que trava esperando a rede é inútil. A sincronização entre aparelhos vai entrar depois, _por cima_ do banco local.

**Pronto para sincronizar, desde já.** Mesmo sem servidor, o schema segue regras que facilitam a sincronização futura:

- IDs são UUIDs gerados no cliente (`crypto.randomUUID()`), então não há conflito de IDs entre aparelhos.
- Todo registro tem `createdAt`, `updatedAt` e `deletedAt`. A exclusão é **lógica**: o registro fica marcado, e outro aparelho consegue saber que ele foi apagado.
- Toda tabela tem índice em `updatedAt`, para responder "o que mudou desde a última sincronização?".
- Os exercícios do seed têm **IDs fixos**. Se cada aparelho sorteasse os seus, o mesmo "Supino reto" apareceria duplicado depois de sincronizar.

**Migrações de banco.** O schema tem versões (`db.version(1)`, `db.version(2)`...) e as antigas nunca são editadas, porque o celular de cada usuário pode estar em qualquer uma. A v2 trouxe nomes bilíngues e juntou exercícios duplicados (ex.: "Bench Press" e "Supino reto com barra") movendo todas as séries para o exercício que fica, sem perder histórico; a v3 criou as divisões de treino e pôs as rotinas que já existiam numa divisão. Há testes que criam bancos antigos e conferem cada migração.

**Idiomas sem biblioteca.** Dois dicionários tipados: `pt.ts` é a fonte e o `en.ts` precisa ter exatamente as mesmas chaves, ou o projeto não compila. Plurais e textos com valores são funções. Para dois idiomas, uma biblioteca como react-i18next seria peso e complexidade a mais.

**Carga sempre em kg.** O banco guarda `weightKg`. A conversão para lb acontece só na exibição, então nunca existe dado "meio convertido".

**Índices pensados para as consultas reais.** `[workoutId+position]` traz as séries de um treino em ordem; `[exerciseId+completedAt]` traz o histórico de um exercício no tempo (séries não concluídas, com `completedAt = null`, ficam fora do índice automaticamente).

**Atualização com aviso, não automática.** Quando sai uma versão nova, o app mostra "Nova versão disponível" em vez de recarregar sozinho e interromper uma série.

**Armazenamento persistente.** Na abertura, o app pede `navigator.storage.persist()` para o navegador não apagar os dados quando faltar espaço.

**TypeScript 6.0, não 7.0.** O `typescript-eslint` ainda não suporta o TS 7 (a reescrita nativa). O 6.0 é estável e permite manter o ESLint com regras de TypeScript.

**Design system restrito no próprio Tailwind.** As escalas padrão de cor, raio e sombra são apagadas no `@theme`. Só existem os tokens do Encore, então `bg-blue-500` ou `shadow-lg` nem funcionam.

## Design

Estética de academia old school com estrutura minimalista: _a sujeira é textura, o minimalismo é estrutura._

- Fundo quase preto com um grão sutil (SVG gerado pelo navegador, sem imagem).
- **Uma** cor de acento (vermelho), só em ações principais e recordes.
- Logo "Selo": EN / CO / RE empilhados, com o RE (de novo) em vermelho; letras desenhadas em retângulos, sem depender de fonte.
- Oswald (condensada) em títulos e números grandes, Inter no corpo, números tabulares em cargas e repetições.
- Bordas grossas e retas, raio de 2 a 4px. Sem gradientes, sem sombras suaves.
- Movimento curto e seco, só quando ajuda: painéis que sobem, troca de tela com leve deslize, ✓ que "carimba", tranco no fim do descanso e um glitch de impressão na logo ao abrir o menu. Tudo desligado com "reduzir movimento".
- Alvos de toque de no mínimo 48px e campos com fonte de 16px (o iOS não dá zoom).

## Roadmap

- [x] **Fundação:** PWA instalável e offline, tema, navegação, banco local, seed
- [x] **Treino ativo:** séries pré-preenchidas, NumberStepper, timer de descanso, séries _encore_
- [x] **Histórico:** lista e detalhe com duração, séries e volume
- [x] **Rotinas (leitura):** iniciar treino pela rotina
- [x] **Exercícios (leitura):** busca e filtro por grupo
- [x] **Idiomas, configurações, menu lateral, logo e entrada animada**
- [x] **Cronômetro do treino** iniciado e parado pelo usuário
- [x] **Rotinas:** criar, editar, reordenar exercícios e a sequência, excluir
- [x] **Fase 1 do plano de melhorias:** backup, tela ligada, aquecimento, bipe do descanso
- [x] **Ajustes de front-end:** próxima série em destaque, faixa de treino em andamento, painéis nativos, animações, exercícios livres x máquinas
- [x] **Divisões de treino** (Upper/Lower, PPL...) com abas nas telas Treino e Rotinas
- [x] **Fase 2:** sugestão de carga (progressão dupla) com saltos por equipamento, descanso por exercício, comparação com a vez anterior, menu ⋯ no cartão do exercício
- [x] **Treino em rota própria** com Voltar, biblioteca de ~100 exercícios, lembrete de backup
- [x] **Desfazer exclusões** (série, exercício e treino do histórico)
- [ ] Evolução: tela do exercício com gráfico, volume semanal por grupo muscular
- [ ] Treino ativo em modo foco, com barra de progresso
- [x] **Exercícios personalizados:** criar ao adicionar (digitando um nome que não está na biblioteca)
- [ ] Editar e excluir exercícios personalizados
- [ ] Recordes (PRs) com 1RM estimado
- [ ] Gráficos de progressão por exercício
- [ ] Preferência de unidade (kg/lb)
- [ ] Conta e sincronização entre aparelhos

## Privacidade e segurança

- **Sem servidor e sem rastreio:** o app não faz nenhuma requisição de rede além de baixar a si mesmo. Os treinos ficam só no IndexedDB do aparelho.
- **Backup em texto puro:** o arquivo `encore-backup-*.json` não é criptografado; guarde-o como qualquer dado pessoal. A importação valida cada registro e recusa arquivos malformados.
- O deploy usa cabeçalhos de segurança (`vercel.json`): CSP, `nosniff`, `no-referrer` e outros. Para relatar uma vulnerabilidade, veja o [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE).
