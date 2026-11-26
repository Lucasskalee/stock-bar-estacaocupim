# Stokbar Cupim — Redesign Balcão Noturno & Conferência de Turnos

Transformação completa da interface e experiência do **Stokbar Cupim**, mantendo 100% da lógica ágil de conferência de bebidas do repositório original e elevando o visual para uma estética sofisticada de **balcão noturno em modo escuro com tons âmbar**, otimizada tanto para contagem rápida no celular quanto para fechamento no computador do caixa.

---

## Revisão do Usuário & Decisões Críticas

> [!IMPORTANT]
> As escolhas abaixo refletem suas respostas na etapa anterior e definem o escopo completo da entrega. Revise os padrões adotados antes de aprovarmos a implementação.

- **Identidade Visual Confirmada**: Modo escuro **Balcão Noturno** (superfícies carvão/grafite quentes com destaques em âmbar e cobre), sem excesso de ruído visual e com contraste acessível para uso em ambiente de bar/câmara fria.
- **Uso Multi-Dispositivo Confirmado**: Interface adaptativa de verdade — cards táteis com alvos de toque grandes (`≥ 44px`) e barra inferior compacta no celular; painel amplo com navegação lateral e grade tabular de alta densidade no computador.
- **Recursos Confirmados (mantendo 100% das funções originais)**:
  - Busca instantânea, filtro por categoria e barra de resumo de alertas de reposição.
  - Controles táteis de `-` / `+` ao lado da digitação direta para contagem ágil.
  - Botão de cópia rápida do **Pedido Sugerido** formatado para envio direto no WhatsApp.
  - **Histórico de turnos fechados** com visualização de consumo total e distribuição por categoria.
  - Relatório **PDF A4 vertical** redesenhado na nova identidade visual (cabeçalho escuro grafite com detalhe âmbar, resumo executivo e tabela de pedido destacado).
- **Decisão Padrão Recomendada (Compatibilidade & Usabilidade)**:
  - Os diálogos nativos `confirm()` e `alert()` do navegador serão substituídos por **modais de confirmação integrados** e **notificações toast** (evitando bloqueios em dispositivos móveis e iframes).
  - Quando o estoque estiver totalmente vazio no primeiro acesso, exibiremos um estado vazio elegante com botão para **carregar um cardápio exemplo de bar** (ex.: Heineken, Chopp, Coca-Cola, Água, Gin, Caipirinha) ou cadastrar a primeira bebida do zero, facilitando o teste imediato sem poluir dados já salvos no `localStorage`.

---

## 1. Visão Geral & Conceito Central

- **O que faz**: Gerencia a conferência de estoque de bebidas por turno de um bar ou restaurante — controlando estoque inicial, estoque final, estoque ideal, consumo calculado automaticamente e sugestão de pedido de reposição — com exportação em PDF A4, compartilhamento via WhatsApp e histórico de fechamentos.
- **Público-alvo & Contexto de Uso**:
  - *Bartender / Estoquista (Celular)*: Caminha pelo balcão, geladeiras e câmara fria sob iluminação baixa, precisando ajustar contagens com uma mão (`+` / `-`) e filtrar rapidamente por categoria (Cerveja, Destilado, Refrigerante, etc.).
  - *Gerente / Caixa (Computador)*: Analisa toda a planilha de bebidas de uma só vez, compara consumo por categoria, fecha o turno (`final → inicial`), gera o PDF A4 para arquivo/impressão e dispara o pedido de reposição ao fornecedor pelo WhatsApp.
- **Principal Valor Entregue**: Troca uma tabela HTML básica por uma ferramenta de operação noturna digna de um bar moderno — mais rápida para contar, impossível de errar na leitura dos números e pronta para gerar relatórios profissionais com um clique.

---

## 2. Experiência do Usuário & Design Visual

### Fluxos Principais do Usuário

1. **Conferência de Estoque (Tela Principal)**:
   - Ao abrir o app, o usuário vê o resumo silencioso do turno atual em 4 indicadores objetivos: **Total de Itens**, **Consumo no Turno**, **Itens para Repor** e **Unidades a Pedir** (todos com algarismos tabulares alinhados).
   - Logo abaixo, uma barra de trabalho reúne campo de busca, abas de filtro por categoria (`Todas`, `Cerveja`, `Refrigerante`, `Água`, `Suco`, `Destilado`, `Vinho`, `Outros`) e filtro rápido `"Só para repor"`.
   - No **desktop**, as bebidas aparecem em uma tabela limpa de alta legibilidade com controles inline (`-`, input numérico, `+`) para *Inicial*, *Final* e *Ideal*, além das colunas calculadas *Consumo* e *Pedir* (destacada com texto e rótulo semântico quando `> 0`).
   - No **celular**, cada bebida se transforma em um card tátil bem espaçado com controles `-` / `+` de fácil alcance pelo polegar, evitando rolagem horizontal em tabelas apertadas.
2. **Cadastro e Edição Rápida de Bebida**:
   - Botão principal **"Nova bebida"** abre um modal limpo (ou gaveta inferior no celular) com nome, categoria, estoque ideal e estoque inicial opcional. Também permite editar nome/categoria de uma bebida já cadastrada ou removê-la com confirmação segura.
3. **Pedido Sugerido & WhatsApp**:
   - Uma visão dedicada (ou painel lateral/aba **"Pedido"**) agrupa apenas os itens com `pedido > 0` organizados por categoria, com botões diretos para **"Copiar para WhatsApp"** (gera texto formatado com data/hora, itens agrupados e total de unidades) e **"Gerar PDF"**.
4. **Fechamento de Turno & Histórico**:
   - Ao acionar **"Fechar turno (final → inicial)"**, um modal de confirmação mostra o resumo do turno prestes a ser encerrado (itens conferidos, consumo total, pedido sugerido) e oferece salvar o fechamento no **Histórico** antes de transferir o estoque final para o inicial do próximo turno.
   - Na aba **"Histórico & Consumo"**, o gerente consulta turnos anteriores (data/hora, total consumido, detalhes expansíveis de cada turno) e um gráfico de barras horizontal mostrando o **consumo acumulado por categoria**.

### Identidade Visual & Tema

- **Direção Estética**: *Balcão Noturno Contemporâneo* — inspiração em madeira escura, cobre polido e iluminação âmbar de bar de alta gastronomia. Visual limpo, tátil e sóbrio, sem efeitos neon exagerados, sem gradientes genéricos e sem excesso de etiquetas coloridas.
- **Paleta de Cores & Atmosfera (Regra 60-30-10)**:
  - *60% Fundo Principal (Canvas)*: `--background: #0E0D0B` (carvão profundo com leve subtom quente).
  - *30% Superfícies Estruturais*: `--surface: #171512` e `--surface-elevated: #1F1C18`, separados por bordas finas de 1px (`--border: rgba(255, 244, 224, 0.08)`), sem empilhar "cards dentro de cards".
  - *Tipografia*: `--foreground: #F5F0E8` (off-white quente de alto contraste) e `--muted-foreground: #A69D8E` (cinza-areia legível).
  - *10% Destaque & Semântica*:
    - `--primary` / `--accent`: `#D98A2B` (âmbar de malte / cobre) com hover `#E89B3C` para botões primários, aba ativa e foco.
    - Semântica de estoque (sempre acompanhada de texto explícito, nunca apenas cor):
      - Reposição necessária / Alerta: `#E05A47` (vermelho terracota legível) + rótulo `"Repor"`.
      - Estoque saudável: `#4CA975` (verde folha suave) + rótulo `"OK"`.
      - Pendente de contagem: `#8A8175` + rótulo `"Pendente"`.
- **Tipografia & Hierarquia (Regra 2+1)**:
  - *Display / Marca / Títulos*: **Bricolage Grotesque** (personalidade artesanal moderna, forte presença editorial sem perder legibilidade).
  - *Corpo & Controles*: **Plus Jakarta Sans** (limpa e escaneável em telas pequenas e tabelas densas).
  - *Números, Contagens & Tabelas*: **JetBrains Mono** com `font-variant-numeric: tabular-nums` (alinhamento vertical perfeito de quantidades e totais, zero trepidação ao clicar em `+` e `-`).
- **Disciplina de Layout & Anti-Poluição**:
  - Metadados (categoria, data, contagens secundárias) exibidos como **texto limpo com separadores tipográficos (`·`)**, evitando poluição visual de cápsulas/pills em toda a tela.
  - Navegação desktop por **sidebar fixa (`240px`)** + topo contextual limpo; no mobile, topo enxuto (`52px`) + **barra de navegação inferior fixa** (`Conferência`, `Pedido`, `Histórico`) respeitando o limite de `≤ 15%` da altura da tela em elementos fixos.
  - Todos os botões, abas e links mantêm rótulo em linha única (`whitespace-nowrap`) e alvos de toque de no mínimo `44×44px` no mobile.
- **Identidade Visual do Relatório PDF A4**:
  - Cabeçalho em faixa escura grafite (`#171512`) com linha fina em âmbar (`#D98A2B`), título **Stokbar Cupim**, subtítulo do turno e carimbo de data/hora.
  - Faixa de resumo numérico logo abaixo do cabeçalho (Itens, Consumo Total, Itens a Repor, Total a Pedir).
  - Tabela principal de conferência com cabeçalho carvão escuro, zebrado sutil e coluna **Pedir** destacada; seguida do bloco **Pedido Sugerido** com cabeçalho âmbar/cobre escuro para leitura imediata na hora da compra.
- **Feedback Interativo & Micro-Animações**:
  - Transições suaves e rápidas (`≤ 200ms`) nos filtros, troca de telas e pressionamento dos botões `+`/`-`.
  - Destaque momentâneo no número alterado, toasts discretos no canto inferior (ex.: `"Pedido copiado para o WhatsApp"`, `"Turno salvo no histórico"`), estados vazios guiados e modais com foco acessível.

---

## 3. Decisões de Produto & Trade-Offs

- **Decisão 1: Persistência Local Retrocompatível (`localStorage`)**
  - *Abordagem Escolhida*: Manter a chave original `stokbar-conferencia` para a lista de bebidas e adicionar `stokbar-historico` para turnos salvos, além de exportação/importação rápida de backup se necessário.
  - *Por quê*: Garante funcionamento instantâneo sem tela de login (essencial na correria do bar), zero custo de servidor e compatibilidade direta caso o usuário já tenha itens salvos no navegador na implantação atual do Vercel.
  - *Alternativas Consideradas*: Banco na nuvem com login (adicionaria atrito de autenticação que o fluxo original do Stokbar não exige).

- **Decisão 2: Biblioteca de PDF Integrada no Bundle**
  - *Abordagem Escolhida*: Instalar `jspdf` e `jspdf-autotable` como dependências do projeto React/TypeScript em vez de carregar via `<script>` externo de CDN.
  - *Por quê*: Elimina falhas quando a internet do estoque/câmara fria oscila e garante tipagem segura e geração instantânea do PDF A4 estilizado.
  - *Alternativas Consideradas*: Manter CDN no `index.html` (mais frágil e sujeito a erro `"Biblioteca de PDF não carregada"`).

- **Decisão 3: Visão Híbrida Tabela (Desktop) + Cards Táteis (Mobile)**
  - *Abordagem Escolhida*: Renderizar uma tabela densa de conferência em telas `lg:` e uma lista de cards verticais com steppers `-` / `+` grandes em telas menores.
  - *Por quê*: Tabelas com 7 colunas são confortáveis no caixa, mas praticamente inutilizáveis com uma mão no celular em pé na frente da geladeira.
  - *Alternativas Consideradas*: Tabela com scroll horizontal no mobile (gera erros de toque e lentidão na contagem).

- **Decisão 4: Gráfico de Consumo em SVG Nativo Leve**
  - *Abordagem Escolhida*: Construir o gráfico de consumo por categoria (e evolução dos últimos turnos) diretamente em SVG responsivo com `tabular-nums` e tooltips interativos, sem bibliotecas pesadas extras.
  - *Por quê*: Mantém o app extremamente leve, com acabamento visual 100% fiel à paleta âmbar/carvão e carregamento imediato no celular.

---

## 4. Arquitetura Técnica & Estratégia de Dados *(Referência Técnica)*

### Diagrama de Arquitetura e Fluxo de Componentes

```
┌────────────────────────────────────────────────────────────────────────┐
│                          STOKBAR CUPIM (SPA)                           │
│   Estado Central & Persistência Local (stokbar-conferencia/historico)  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
        ┌───────────▼───────────┐        ┌───────────▼───────────┐
        │   Navegação Adaptativa │        │  Serviços de Saída    │
        │  • Sidebar (Desktop)   │        │  • Gerador PDF A4     │
        │  • Bottom Nav (Mobile) │        │  • Formatador WhatsApp│
        └───────────┬───────────┘        └───────────▲───────────┘
                    │                                │
    ┌───────────────┼────────────────┬───────────────┴───────┐
    │               │                │                       │
┌───▼──────────┐ ┌──▼────────────┐ ┌─▼──────────────────┐ ┌──▼────────────┐
│ Conferência  │ │ Pedido        │ │ Histórico &        │ │ Modais &      │
│ de Estoque   │ │ Sugerido      │ │ Consumo            │ │ Feedback      │
│ • KPIs Turno │ │ • Agrupado p/ │ │ • Turnos Fechados  │ │ • Nova/Editar │
│ • Busca/Cat. │ │   Categoria   │ │ • Gráfico Consumo  │ │   Bebida      │
│ • Tabela (PC)│ │ • Copiar WA   │ │   por Categoria    │ │ • Fechar Turno│
│ • Cards (Mob)│ │ • Exportar PDF│ │ • Detalhe do Turno │ │ • Zerar / Del │
│ • Steppers   │ │               │ │                    │ │ • Toasts      │
└──────────────┘ └───────────────┘ └────────────────────┘ └───────────────┘
```

### Modelo de Dados & Cálculos (100% Fiel à Regra Original)

- **Entidade `BebidaItem`** (salva em `stokbar-conferencia`):
  - `id`: identificador único (gerado automaticamente na migração de itens legados sem `id`).
  - `nome`: texto obrigatório (ex.: `"Heineken 600ml"`).
  - `categoria`: `'Cerveja' | 'Refrigerante' | 'Água' | 'Suco' | 'Destilado' | 'Vinho' | 'Outros'`.
  - `inicial`: `number | null` (estoque no início do turno).
  - `final`: `number | null` (estoque contado ao fim do turno).
  - `ideal`: `number | null` (meta de estoque ideal).
- **Fórmulas Derivadas** (calculadas em tempo real):
  - `consumo = (inicial != null && final != null) ? Math.max(0, inicial - final) : null`
  - `alvo = ideal ?? inicial`
  - `pedido = (final != null && alvo != null) ? Math.max(0, alvo - final) : null`
- **Entidade `RegistroTurno`** (salva em `stokbar-historico`):
  - `id`, `encerradoEm` (ISO timestamp), `rotulo` (ex.: `"Turno 25/11 · 23:40"`), `totalItens`, `totalConsumo`, `totalPedir`, `consumoPorCategoria` (mapa categoria → unidades), e `itens` (snapshot das bebidas naquele fechamento).

### Mapeamento de Interações & Transições de Estado

- **Contagem Inline (`-` / input / `+`)**: Cada ajuste atualiza imediatamente `inicial`, `final` ou `ideal`, recalcula `consumo`, `pedido` e os KPIs do topo, e persiste no `localStorage`. O botão `-` bloqueia em `0` (nunca negativo); apagar o campo retorna o valor para `null` (`"-"`).
- **Busca & Filtros**: Filtragem reativa em memória por nome da bebida, categoria selecionada e alternância `"Somente com reposição"`. Exibe estado vazio contextual com ação `"Limpar filtros"` quando nenhum item corresponde.
- **Cadastro / Edição / Exclusão**: Modal validado impede nomes vazios, permite editar qualquer bebida existente e exige confirmação em modal antes de remover.
- **Virada de Turno (`Novo turno`)**: Modal exibe resumo do turno atual com opção marcada por padrão `"Salvar no histórico antes de virar o turno"`; ao confirmar, registra o `RegistroTurno` (quando há contagens), copia `final → inicial` nos itens preenchidos, limpa `final` para `null` e dispara toast de sucesso.
- **Zerar Contagens**: Modal de confirmação limpa `inicial` e `final` de todas as bebidas mantendo o cadastro e o estoque `ideal`.
- **Exportação PDF & WhatsApp**:
  - *WhatsApp*: Monta mensagem estruturada com título, data/hora, bebidas agrupadas por categoria (`• Nome: X un`) e total geral, copia via Clipboard API (com fallback seguro) e confirma via toast.
  - *PDF A4*: Gera e baixa `conferencia_YYYY-MM-DD_HHhMM.pdf` com identidade visual Balcão Noturno, numeração de páginas, totais e seção de Pedido Sugerido.
