# MeuEnsino Front End

Front-end React + Vite do MeuEnsino. A UI e apenas camada de experiencia: autorizacao real, ownership e escopo multi-tenant ficam no back-end.

## Desenvolvimento local

```bash
npm install
npm run dev
```

O script fixa o Vite em `127.0.0.1:5173`, limpa cache local e usa `strictPort`.
Em desenvolvimento, o Vite encaminha `/api/*` e `/uploads/*` para `DEV_API_PROXY_TARGET` (padrao `http://127.0.0.1:3001`), entao o backend precisa estar rodando nessa porta ou a variavel deve ser ajustada no `.env`.

## Carregamento seguro

Ao restaurar sessao, o front chama somente:

- `POST /auth/refresh`, usando cookie `HttpOnly`.
- `GET /me`.
- `GET /me/permissions`.

Depois carrega dados sob demanda por dominio quando a rota/componente precisa. O refresh token nao e salvo em `localStorage` nem fica acessivel ao JavaScript; o access token permanece em memoria.

## Docker

```bash
docker compose up --build
```

O container de producao roda Nginx como usuario nao-root na porta `8080` interna. O `nginx.conf` aplica CSP, `frame-ancestors 'none'`, `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy` e `Permissions-Policy`.

Por padrao, o healthcheck do compose valida `/health` e `/api/health`. Em desenvolvimento isolado do front, use `CHECK_BACKEND_HEALTH=false`; em homologacao/producao mantenha `true` para detectar API indisponivel.

## Variaveis de ambiente

```bash
VITE_API_URL=/api
DEV_API_PROXY_TARGET=http://127.0.0.1:3001
VITE_ALLOWED_ASSET_ORIGINS=
FRONTEND_PORT=8080
CHECK_BACKEND_HEALTH=true
```

`VITE_ALLOWED_ASSET_ORIGINS` deve ficar vazio sempre que possivel. Use apenas para CDNs explicitamente confiaveis que servem assets publicos e alinhe a allowlist com a CSP de producao.

## Contrato com o back-end

As telas agora preferem endpoints escopados por sessao, como `/me/schools`, `/me/classes`, `/me/exams`, `/me/students`, `/me/grades`, `/me/exam-corrections`, `/me/answer-cards`, `/me/lesson-records`, `/me/room-reservations`, `/me/calendar-events` e `/me/meal-managements`. Endpoints globais devem ficar restritos a perfis administrativos autorizados.

O contrato detalhado de seguranca do back-end esta em `SECURITY_BACKEND_CONTRACT.md`.

## Provas

A criacao de provas no front limita a quantidade a 100 questoes, alinhada ao backend e ao servico OMR. Se o backend rejeitar payload acima desse teto, a tela exibe erro publico sem detalhes internos.

## Comandos

```bash
npm test
npm run build
npm audit --omit=dev
```

## Observacao de seguranca

Rotas, menus e botoes escondidos no front nao sao controle de seguranca. Qualquer chamada manual via Insomnia/Postman precisa ser bloqueada pelo back-end, e as telas devem tratar 401/403/404 como estado normal de acesso negado.
