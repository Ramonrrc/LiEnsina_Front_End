# Contrato de segurança obrigatório para o back-end MeuEnsino

Este workspace contém apenas o front-end React/Vite/Nginx. As mudanças no cliente reduzem exposição acidental, mas não substituem controles de servidor. O back-end deve implementar os contratos abaixo antes de produção.

## Escopo multi-tenant e ownership

- Todo endpoint deve derivar `tenantId`, escolas permitidas, papel e vínculos a partir da sessão/token confiável.
- Nunca confiar em `tenantId`, `schoolId`, `classId`, `studentId`, `teacherId`, `guardianId`, `examId` ou `roleId` enviados pelo navegador sem validar vínculo real.
- Diretor, professor, aluno e responsável nunca devem receber listagens globais.
- Recursos privados devem usar consulta com escopo no banco, por exemplo:

```ts
where: {
  id: resourceId,
  tenantId: session.tenantId,
  schoolId: { in: session.allowedSchoolIds },
}
```

- Leitura, criação, edição, exclusão, export, download, geração de URL assinada e jobs assíncronos devem repetir a validação de ownership.
- Retornar `403` ou `404` quando o recurso não pertencer ao escopo permitido.

## Endpoints escopados esperados pelo front-end

O front-end passa a preferir endpoints derivados da sessão:

- `GET /me/schools`
- `GET /me/teachers`
- `GET /me/guardians`
- `GET /me/students`
- `GET /me/classes`
- `GET /me/lesson-records`
- `GET /me/room-reservations`
- `GET /me/exams`
- `GET /me/exam-corrections`
- `GET /me/answer-cards`
- `GET /me/grades`
- `GET /me/calendar-events`
- `GET /me/meal-managements`
- `GET /me/teacher-subjects`

Endpoints globais como `/schools`, `/students`, `/classes`, `/exams`, `/users` e `/roles` devem existir apenas para perfis administrativos autorizados e ainda assim com ABAC explícito.

## DTOs strict e mass assignment

- Usar Zod, Joi, class-validator ou equivalente com schemas `strict`.
- Rejeitar campos extras e mapear campo por campo.
- Nunca persistir `req.body` diretamente.
- Campos sensíveis proibidos em rotas comuns: `id`, `tenantId`, `roleId`, `role`, `permissions`, `isAdmin`, `createdById`, `updatedById`, `approvedBy`, `approvedAt`, `passwordHash`, `refreshTokenHash`, `tokenVersion`, `averageScore`, `finalScore`, `correctionResult`, status crítico e campos de ownership.
- `roleId` e `permissions` só podem ser alterados por rota administrativa com autorização forte, auditoria e invalidação de sessão/permissões.

## Uploads, PDFs, OMR e arquivos privados

- Validar magic bytes no servidor e não confiar no MIME do cliente.
- Bloquear SVG, HTML, scripts, arquivos poliglotas, MIME falso e extensões perigosas.
- Limitar tamanho por arquivo, tamanho total, quantidade, megapixels, largura/altura, páginas de PDF e tempo de processamento.
- Reencodar imagens com biblioteca segura, remover EXIF/metadados e salvar novo arquivo limpo com nome aleatório.
- Usar storage privado por padrão; download deve passar por endpoint autenticado com ownership.
- Retornar `Content-Type`, `X-Content-Type-Options: nosniff` e `Content-Disposition` seguros.
- OMR/PDF pesado deve ir para fila com quota por tenant/escola/usuário.

## Endpoints caros, concorrência e idempotência

- Aplicar rate limit por IP, usuário, tenant/escola e rota usando store distribuído em produção.
- Criar quotas por plano/escola/usuário para OMR, IA, geração, correção, export, relatórios e dashboards caros.
- Usar fila para tarefas longas, deduplicação de jobs e lock por prova/aluno/correção quando aplicável.
- Exigir e persistir `Idempotency-Key` em operações que não podem duplicar efeito.
- Retornar `409` para job equivalente em processamento e `429` para limite excedido.
- Registrar auditoria de criação, upload, correção, export, alteração de nota, alteração de permissão e ações administrativas.

## Healthcheck

- `GET /api/health` público deve retornar apenas resposta mínima, como `{ "status": "ok" }`.
- Health interno detalhado deve exigir rede interna/autenticação e nunca expor driver, versão, vendor, stack trace, secrets ou configurações.

## Testes mínimos obrigatórios no back-end

- IDOR: escola A acessando aluno/prova/export/download da escola B deve receber `403` ou `404`.
- RBAC/ABAC: professor não acessa turma/prova não vinculada; aluno não acessa outro aluno; responsável não acessa aluno não vinculado.
- Mass assignment: `isAdmin`, `permissions`, `roleId`, `schoolId` de outro tenant, `createdById`, status crítico, `averageScore`, `finalScore` e `correctionResult` devem falhar.
- Upload: SVG, HTML renomeado, MIME falso, imagem gigante, PDF com páginas demais, arquivo poliglota e arquivo privado sem ownership devem falhar.
- Concorrência: 50 chamadas paralelas ao OMR/geração/correção/export devem produzir uma execução efetiva ou respostas `409/429`.
- Sessão: troca de senha, troca de permissão e desativação de usuário invalidam tokens/sessões antigas.
