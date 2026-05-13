# LiEnsina_Front_End

## Desenvolvimento local

Use sempre:

```bash
npm run dev
```

O script de desenvolvimento fixa o servidor em `127.0.0.1:5173`, limpa o cache do Vite, encerra processos Vite/esbuild antigos deste projeto, para containers LiEnsina antigos nessa porta e usa `strictPort`. Se a porta continuar ocupada por outro processo, o servidor para com erro em vez de abrir automaticamente em outra porta.

`npm run dev:raw` existe apenas para diagnostico direto do Vite e ignora essas protecoes.

## Docker

O container de producao usa a porta `8080` por padrao para nao conflitar com o Vite em `5173`.

```bash
docker compose up --build
```

Se ja existir um container antigo usando `5173`, pare-o antes de iniciar o Vite:

```bash
docker stop liensina-frontend
```
