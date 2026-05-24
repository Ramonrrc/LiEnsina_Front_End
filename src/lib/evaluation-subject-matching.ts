import { getAcademicSubjectLabel } from '../components/role-portal/portal-components'
import type { Question } from '../types'

function sanitizeText(value?: string | null) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
}

export function normalizeEvaluationSubjectText(value?: string | null) {
  return sanitizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function evaluationSubjectCodes(value?: string | null): string[] {
  const text = normalizeEvaluationSubjectText(value).replace(/[^a-z0-9-]+/g, ' ').trim()
  if (!text) return []

  const codes: string[] = []
  const withoutPhysicalEducation = text.replace(/educacao fisica|ed fisica|educacao-fisica/g, ' ')
  if (/(educacao fisica|ed fisica|educacao-fisica)/.test(text)) codes.push('EDUCACAO_FISICA')
  if (/(lingua portuguesa|portugues|portuguesa|portugues-brasil)/.test(text)) codes.push('LINGUA_PORTUGUESA')
  if (/(lingua inglesa|ingles|inglesa|english)/.test(text)) codes.push('LINGUA_INGLESA')
  if (/(lingua espanhola|espanhol|espanhola|espanol|spanish)/.test(text)) codes.push('LINGUA_ESPANHOLA')
  if (/(ensino religioso|religiao|religioso)/.test(text)) codes.push('ENSINO_RELIGIOSO')
  if (/(projeto de vida|projeto vida)/.test(text)) codes.push('PROJETO_DE_VIDA')
  if (/literatura/.test(text)) codes.push('LITERATURA')
  if (/redacao/.test(text)) codes.push('REDACAO')
  if (/matematica/.test(text)) codes.push('MATEMATICA')
  if (/biologia/.test(text)) codes.push('BIOLOGIA')
  if (/(^|[\s-])fisica([\s-]|$)/.test(withoutPhysicalEducation)) codes.push('FISICA')
  if (/quimica/.test(text)) codes.push('QUIMICA')
  if (/historia/.test(text)) codes.push('HISTORIA')
  if (/geografia/.test(text)) codes.push('GEOGRAFIA')
  if (/filosofia/.test(text)) codes.push('FILOSOFIA')
  if (/sociologia/.test(text)) codes.push('SOCIOLOGIA')
  if (/ciencias/.test(text) && !/(ciencias da natureza|natureza|ciencias humanas|humanas|sociais aplicadas)/.test(text)) codes.push('CIENCIAS')
  if (/(^|[\s-])arte(s)?([\s-]|$)/.test(text)) codes.push('ARTE')
  return Array.from(new Set(codes))
}

export function evaluationSubjectMatches(first?: string | null, second?: string | null) {
  const firstCodes = evaluationSubjectCodes(first)
  const secondCodes = evaluationSubjectCodes(second)
  if (firstCodes.length || secondCodes.length) return firstCodes.some((code) => secondCodes.includes(code))

  const firstKey = normalizeEvaluationSubjectText(first).replace(/[^a-z0-9-]+/g, ' ').trim()
  const secondKey = normalizeEvaluationSubjectText(second).replace(/[^a-z0-9-]+/g, ' ').trim()
  if (!firstKey || !secondKey) return false
  if (firstKey === secondKey || firstKey.includes(secondKey) || secondKey.includes(firstKey)) return true

  const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'ensino', 'anos', 'area', 'lingua'])
  const firstWords = firstKey.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word))
  const secondWords = secondKey.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word))
  return firstWords.some((firstWord) => secondWords.some((secondWord) => (
    firstWord === secondWord
    || firstWord.includes(secondWord)
    || secondWord.includes(firstWord)
  )))
}

function getSubjectGroup(value?: string | null) {
  const text = normalizeEvaluationSubjectText(value)
  if (!text) return null
  if (text.includes('matematica')) return 'matematica'
  if (/(linguagens|portugues|literatura|redacao|ingles|espanhol|arte|educacao fisica)/.test(text)) return 'linguagens'
  if (/(humanas|historia|geografia|filosofia|sociologia|sociais)/.test(text)) return 'humanas'
  if (/(natureza|biologia|fisica|quimica|ciencias naturais)/.test(text) || text === 'ciencias') return 'natureza'
  return null
}

function getLanguageSubject(value?: string | null) {
  const text = normalizeEvaluationSubjectText(value)
  if (/(ingles|lingua inglesa)/.test(text)) return 'ingles'
  if (/(espanhol|lingua espanhola)/.test(text)) return 'espanhol'
  if (/(portugues|lingua portuguesa|literatura|redacao)/.test(text)) return 'portugues'
  return null
}

function isBroadAcademicSubject(value?: string | null) {
  const text = normalizeEvaluationSubjectText(getAcademicSubjectLabel(value))
  return /(linguagens|ciencias humanas|humanas|sociais aplicadas|ciencias da natureza|natureza)/.test(text)
}

function questionSubjectValues(question: Question) {
  const metadataKeywords = Array.isArray(question.metadata.keywords) ? question.metadata.keywords.join(' ') : ''
  return [
    getAcademicSubjectLabel(question.subject),
    question.subject,
    question.component,
    question.area,
    question.metadata.enemDiscipline,
    question.metadata.enemLanguage,
    metadataKeywords,
  ].map((value) => String(value ?? '')).filter(Boolean)
}

function questionFullText(question: Question) {
  return normalizeEvaluationSubjectText([
    ...questionSubjectValues(question),
    question.title,
    question.context,
    question.statement,
    question.explanation,
    question.sourceName,
    question.options.map((option) => option.text).join(' '),
    question.skills.map((skill) => `${skill.code} ${skill.description} ${skill.component} ${skill.thematicUnit} ${skill.knowledgeObject}`).join(' '),
    question.descriptors.map((descriptor) => `${descriptor.code} ${descriptor.description} ${descriptor.topic} ${descriptor.axis}`).join(' '),
  ].join(' '))
}

const specificSubjectTerms: Record<string, string[]> = {
  HISTORIA: ['historia', 'era vargas', 'revolucao francesa', 'ditadura militar', 'guerra fria', 'colonizacao', 'iluminismo', 'escravidao', 'industrializacao', 'republica velha', 'imperio'],
  GEOGRAFIA: ['geografia', 'cartografia', 'relevo', 'clima', 'vegetacao', 'bioma', 'territorio', 'paisagem', 'urbanizacao', 'demografia', 'migracao', 'globalizacao', 'bacia hidrografica'],
  FILOSOFIA: ['filosofia', 'socrates', 'platao', 'aristoteles', 'kant', 'descartes', 'epistemologia', 'etica', 'moral', 'metafisica', 'razao'],
  SOCIOLOGIA: ['sociologia', 'sociedade', 'cultura', 'classe social', 'desigualdade', 'weber', 'durkheim', 'marx', 'cidadania', 'movimento social'],
  BIOLOGIA: ['biologia', 'ecologia', 'celula', 'genetica', 'dna', 'evolucao', 'ecossistema', 'fotossintese', 'virus', 'bacteria', 'organismo', 'especie'],
  FISICA: ['fisica', 'velocidade', 'forca', 'energia', 'aceleracao', 'movimento', 'pressao', 'potencia', 'circuito', 'eletrica', 'onda', 'calor', 'temperatura'],
  QUIMICA: ['quimica', 'mol', 'reacao', 'atomo', 'molecula', 'substancia', 'solucao', 'ion', 'oxidacao', 'estequiometria'],
  LITERATURA: ['literatura', 'poema', 'romance', 'conto', 'narrador', 'modernismo', 'barroco', 'realismo', 'texto literario'],
  REDACAO: ['redacao', 'dissertativo', 'argumentativo', 'tese', 'proposta de intervencao', 'coesao', 'coerencia'],
  ARTE: ['arte', 'artista', 'obra', 'pintura', 'teatro', 'musica', 'danca', 'cinema', 'escultura'],
  EDUCACAO_FISICA: ['educacao fisica', 'esporte', 'ginastica', 'pratica corporal', 'movimento corporal'],
}

function textIncludesAnyTerm(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeEvaluationSubjectText(term)))
}

function questionMatchesSpecificSubject(question: Question, subject: string) {
  const subjectCode = evaluationSubjectCodes(subject)[0]
  if (!subjectCode) return false

  const directValues = questionSubjectValues(question)
  if (directValues.some((value) => evaluationSubjectCodes(value).includes(subjectCode))) return true

  const text = questionFullText(question)
  const terms = specificSubjectTerms[subjectCode]
  return Boolean(terms?.length && textIncludesAnyTerm(text, terms))
}

export function questionMatchesEvaluationSubject(question: Question, subject?: string | null) {
  const targetLabel = getAcademicSubjectLabel(subject)
  const target = normalizeEvaluationSubjectText(targetLabel)
  if (!target) return true

  const sourceValues = questionSubjectValues(question)
  if (sourceValues.some((value) => evaluationSubjectMatches(value, targetLabel))) return true
  if (questionMatchesSpecificSubject(question, targetLabel)) return true
  if (!isBroadAcademicSubject(targetLabel)) return false

  const source = normalizeEvaluationSubjectText(sourceValues.join(' '))
  const targetGroup = getSubjectGroup(targetLabel)
  const questionGroup = getSubjectGroup(source)
  const targetLanguage = getLanguageSubject(targetLabel)
  if (targetLanguage) {
    const questionLanguage = getLanguageSubject(source)
    if (targetLanguage === 'portugues') return questionGroup === 'linguagens' && questionLanguage !== 'ingles' && questionLanguage !== 'espanhol'
    return questionLanguage === targetLanguage
  }
  return Boolean(targetGroup && questionGroup && targetGroup === questionGroup)
}
