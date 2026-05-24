const technicalErrorPatterns = [
  /\b(stack|stacktrace|traceback|exception)\b/i,
  /\bat\s+[\w.$<>]+\s*\(/i,
  /\b(sqlstate|syntax error at or near|select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from)\b/i,
  /\b(prisma|typeorm|sequelize|postgres|postgresql|pg::|node_modules)\b/i,
  /\b(authorization|bearer|access[_-]?token|refresh[_-]?token|jwt|cookie|password|senha|secret|private[_-]?key)\b/i,
  /(?:[A-Z]:\\|\/(?:usr|var|app|home|opt)\/)/i,
]

const genericMessagesByStatus: Array<[number, string]> = [
  [401, 'Sessao expirada. Entre novamente para continuar.'],
  [403, 'Voce nao tem permissao para executar esta acao.'],
  [404, 'Recurso nao encontrado ou indisponivel para seu perfil.'],
  [409, 'Esta operacao ja esta em andamento ou entrou em conflito com outra alteracao.'],
  [413, 'Arquivo ou requisicao acima do limite permitido.'],
  [415, 'Tipo de arquivo ou conteudo nao permitido.'],
  [429, 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.'],
]

function fallbackForStatus(statusCode: number, fallback: string) {
  const match = genericMessagesByStatus.find(([status]) => status === statusCode)
  if (match) return match[1]
  if (statusCode >= 500) return 'Nao foi possivel concluir a operacao agora. Tente novamente em alguns instantes.'
  return fallback
}

export function sanitizePublicErrorMessage(
  value: unknown,
  statusCode: number,
  fallback = 'Nao foi possivel conversar com a API.',
) {
  const message = String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  const safeFallback = fallbackForStatus(statusCode, fallback)

  if (!message) return safeFallback
  if (statusCode >= 500) return safeFallback
  if (technicalErrorPatterns.some((pattern) => pattern.test(message))) return safeFallback
  if (message.length > 220) return `${message.slice(0, 217)}...`

  return message
}
