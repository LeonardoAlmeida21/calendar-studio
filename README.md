# Calendar Studio

Editor visual de calendários, sem conta e sem servidor, feito com React + TypeScript + Vite. Publicação automática em GitHub Pages.

## Utilização

O primeiro acesso abre **Experimental Timeline 2026–2027**, com as tarefas da imagem de referência já preenchidas. Inclui outubro de 2026 a janeiro de 2027, preparação, pilot study, collagen, elastin, conferências, férias e finalização.

- No separador **Meses**, escolhe o mês inicial e quantos meses queres apresentar. Não precisas de criar um ano completo.
- Clica num dia para escrever uma tarefa ou numa tarefa para a editar.
- Cada tarefa pode ter cor própria, categoria e intervalo de datas. As últimas 12 cores ficam disponíveis entre sessões.
- **Mais opções** permite mover, copiar, escolher a cor do texto e apresentar atividades como barra contínua ou blocos diários.
- **Design** configura título, subtítulo, rodapé, letras, cores e cabeçalhos individuais.
- **Cores** cria e edita categorias. As tarefas acompanham a cor da categoria, exceto quando têm uma cor individual.
- **Descarregar** permite escolher JPG, PNG ou PDF e selecionar apenas os meses desejados. Por exemplo: editar seis meses e exportar só três.
- **Projeto** descarrega o JSON editável. A biblioteca permite importar, duplicar, mudar o nome, eliminar e fazer backup de tudo.
- Ctrl+Z desfaz; Ctrl+Shift+Z ou Ctrl+Y refaz. Dentro de um campo de texto, aplicam-se os atalhos normais desse campo.

## Dados locais e backups

Os calendários são guardados automaticamente em IndexedDB, **neste navegador e neste dispositivo**. Abrir o site noutro dispositivo dá acesso ao editor, com uma biblioteca independente. Não existe sincronização automática.

A indicação **Guardado neste navegador** confirma que a gravação terminou. Limpar dados do navegador, mudar de domínio ou utilizar uma sessão privada pode tornar os calendários indisponíveis. Guarda um JSON para ter uma cópia separada. A importação cria cópias sem substituir os projetos existentes.

O exemplo é criado uma única vez por instalação local. Se o eliminares, não volta a aparecer automaticamente. **Criar exemplo** gera uma nova cópia quando precisares.

## Exportação

- **JPG:** 95% de qualidade; fundo opaco; 2× ou 4×.
- **PNG:** imagem sem perdas; 2× ou 4×.
- **PDF:** A4/A3 horizontal ou vertical; margens de 10 mm; páginas rasterizadas a aproximadamente 300 ppi. O texto não é selecionável.
- As exportações incluem só o calendário, sem ferramentas, e não dependem do zoom da área de edição.
- O PDF conserva meses inteiros e reduz as colunas se for necessário. Uma página demasiado densa é assinalada em vez de cortar conteúdo.
- As imagens têm um limite de proteção de 40 megapíxeis e 8192 píxeis por lado. Escolhe menos meses ou 2× se ultrapassares o limite. Até 240 meses por operação de exportação; intervalos maiores podem ser exportados em partes.
- As fontes estão incluídas no site, incluindo os caracteres gregos do exemplo.

## Desenvolvimento

Requer Node.js 22 e npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## Testes

```sh
npm test
npx playwright install chromium firefox webkit
npm run test:e2e
```

Os testes cobrem anos bissextos e 400 anos de grelhas de datas, fronteiras de semanas/meses/anos, atividades sobrepostas, edição e gravação, cores recentes, duplicação, eliminação, importação JSON, interface móvel e downloads JPG/PNG/PDF. Capturas e ficheiros de verificação ficam em `work/` e não entram no Git.

Variáveis opcionais de teste:

- `CALENDAR_CHROME_PATH`: executável Chromium já instalado.
- `CALENDAR_TEST_URL`: testar uma publicação existente sem iniciar o servidor local. Os testes usam contextos de navegador isolados.

## GitHub Pages

1. O repositório usa a branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolher **GitHub Actions**.
3. Cada push para `main` executa testes, build e publicação. Pull requests executam as verificações sem publicar.
4. O workflow configura `VITE_BASE_PATH` com `/<nome-do-repositorio>/` ou `/` para um repositório `<utilizador>.github.io`.
5. O endereço é `https://<utilizador>.github.io/<nome-do-repositorio>/`.

A navegação usa `#/calendars` e `#/calendar/<id>`, por isso recarregar o editor não precisa de regras de servidor. Para domínio próprio, define `VITE_BASE_PATH=/` no build e configura o domínio no GitHub Pages.

## Estrutura

- `src/lib/model.ts`: tipos e validação de projetos.
- `src/lib/dates.ts` e `layout.ts`: datas e segmentos de atividades.
- `src/lib/sample.ts`: todas as tarefas do exemplo.
- `src/lib/storage.ts`: IndexedDB, revisões e backups.
- `src/lib/export.ts`: imagens e PDF.
- `src/components/`: documento do calendário, controlos, tarefas e exportação.
- `src/App.tsx`: biblioteca, histórico, navegação e gravação.

Não existem credenciais, serviços externos, publicidade ou telemetria na aplicação. Os dados dos calendários não são enviados ao GitHub; o GitHub aloja apenas a aplicação e o exemplo incluído no código.
