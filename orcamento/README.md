# Farol · Orçamento

Módulo de orçamento do FarolFinance (substitui a planilha "Gastos 7/4"). React + Vite, falando direto com o Supabase (chave anon, política `farol_anon_all`).

## Rodar

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # testes do cálculo (valores reais da planilha)
npm run build    # gera dist/
```

## Publicar na Vercel

No projeto da Vercel, **Root Directory = `orcamento`**. O framework (Vite) é detectado sozinho: build `npm run build`, saída `dist`.
URL e chave do Supabase podem ser sobrescritas com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Estrutura

- `src/lib/orcamento/`: cálculo puro, sem React nem Supabase, com testes em `__tests__/`
  - `calculo.js`: semanas (domingo a sábado), meta semanal e diária, "como deveria estar"
  - `fechamento.js`: provisão do cartão, fixos, renda, fechamento, total por pessoa
  - `parametros.js`: herança de metas para mês novo
  - `conciliacao.js`: pareamento fatura × lançamentos
  - `formato.js`: regras de exibição ("Estourado em R$ X", Economizou/Excedeu)
- `src/lib/dados.js`: leitura e gravação no Supabase
- `src/telas/`: Hoje, Semana, Mês, Lançamentos, Parâmetros, Conciliação

## Regras que diferem da planilha (decididas)

- Meta do dia desconta só o realizado **antes** do dia; dias futuros dividem igualmente o que sobrou da semana.
- Fixos ignoram as linhas "Provisionamento do cartão" e "Economia" de `gastos_fixos` (são calculadas).
- Renda: receitas do mês; se não houver, repete as fixas do mês anterior mais recente.
- Mês aberto sem metas: grava as herdadas (mês anterior → `metas_categoria`).
- Total por pessoa: todos os lançamentos, parcelados pelo valor cheio.
- Conciliação: compra ligada a gasto fixo fica em "fixos", mesmo parcelada.
