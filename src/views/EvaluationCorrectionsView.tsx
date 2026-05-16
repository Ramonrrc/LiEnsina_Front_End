import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileDown,
  FileText,
  GraduationCap,
  ImageUp,
  RotateCcw,
  Save,
  SearchCheck,
  Users,
  XCircle,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import type {
  ClassRoom,
  Evaluation,
  EvaluationCorrection,
  EvaluationCorrectionReviewPayload,
  Student,
} from '../types'

type EvaluationCorrectionsViewProps = {
  evaluations: Evaluation[]
  classes: ClassRoom[]
  students: Student[]
  corrections: EvaluationCorrection[]
  onProcess: (evaluationId: string, studentId: string, image: File) => Promise<EvaluationCorrection>
  onReview: (correctionId: string, payload: EvaluationCorrectionReviewPayload) => Promise<EvaluationCorrection>
  onDownloadEvaluation?: (evaluationId: string) => Promise<void>
}

function formatScore(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

function statusLabel(correction?: EvaluationCorrection | null) {
  if (!correction) return 'Pendente'
  if (correction.status === 'CONFIRMED') return 'Confirmada'
  if (correction.status === 'NEEDS_RETAKE') return 'Reenviar foto'
  if (correction.status === 'REJECTED') return 'Rejeitada'
  return 'Sugestao'
}

function statusClass(correction?: EvaluationCorrection | null) {
  if (!correction) return 'border-slate-300 bg-slate-50 text-slate-600'
  if (correction.status === 'CONFIRMED') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  if (correction.status === 'NEEDS_RETAKE') return 'border-amber-300 bg-amber-50 text-amber-700'
  if (correction.status === 'REJECTED') return 'border-rose-300 bg-rose-50 text-rose-700'
  return 'border-indigo-300 bg-indigo-50 text-indigo-700'
}

function confidenceLabel(value: number) {
  if (value >= 0.85) return 'Alta'
  if (value >= 0.65) return 'Media'
  return 'Baixa'
}

function answerStatusLabel(value: string) {
  if (value === 'ok') return 'OK'
  if (value === 'blank') return 'Em branco'
  if (value === 'multiple') return 'Dupla'
  if (value === 'low_confidence') return 'Baixa confianca'
  return 'Nao lida'
}

export default function EvaluationCorrectionsView({
  evaluations,
  classes,
  students,
  corrections,
  onProcess,
  onReview,
  onDownloadEvaluation,
}: EvaluationCorrectionsViewProps) {
  const [classId, setClassId] = useState('')
  const [evaluationId, setEvaluationId] = useState('')
  const [selectedCorrectionId, setSelectedCorrectionId] = useState('')
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finalScore, setFinalScore] = useState('')
  const [teacherNotes, setTeacherNotes] = useState('')

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id)
  }, [classId, classes])

  const classOptions = useMemo<Array<CompactSelectOption<string>>>(() => [
    { value: '', label: 'Selecione a turma' },
    ...classes.map((item) => ({ value: item.id, label: item.name, description: `${item.grade} - ${item.shift}` })),
  ], [classes])

  const classEvaluations = useMemo(
    () => evaluations.filter((evaluation) => !classId || evaluation.classId === classId),
    [classId, evaluations],
  )

  useEffect(() => {
    if (evaluationId && classEvaluations.some((evaluation) => evaluation.id === evaluationId)) return
    setEvaluationId(classEvaluations[0]?.id ?? '')
    setSelectedCorrectionId('')
  }, [classEvaluations, evaluationId])

  const evaluationOptions = useMemo<Array<CompactSelectOption<string>>>(() => [
    { value: '', label: classId ? 'Selecione a prova' : 'Escolha uma turma primeiro' },
    ...classEvaluations.map((item) => ({ value: item.id, label: item.title, description: `${item.questions} questoes` })),
  ], [classEvaluations, classId])

  const selectedEvaluation = evaluations.find((evaluation) => evaluation.id === evaluationId) ?? null
  const selectedClass = classes.find((item) => item.id === classId) ?? null
  const classStudents = useMemo(
    () => students.filter((student) => !classId || student.classId === classId),
    [classId, students],
  )
  const evaluationCorrections = useMemo(
    () => corrections.filter((correction) => correction.evaluationId === evaluationId),
    [corrections, evaluationId],
  )
  const correctionByStudentId = useMemo(
    () => new Map(evaluationCorrections.map((correction) => [correction.studentId, correction])),
    [evaluationCorrections],
  )
  const selectedCorrection = evaluationCorrections.find((correction) => correction.id === selectedCorrectionId)
    ?? evaluationCorrections[0]
    ?? null

  useEffect(() => {
    if (!selectedCorrection) {
      setFinalScore('')
      setTeacherNotes('')
      return
    }
    setFinalScore(String(selectedCorrection.finalScore ?? selectedCorrection.suggestedScore ?? ''))
    setTeacherNotes(selectedCorrection.teacherNotes ?? '')
  }, [selectedCorrection?.id])

  async function handleImageChange(student: Student, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedEvaluation) return
    setProcessingStudentId(student.id)
    setError(null)
    setNotice(null)
    try {
      const correction = await onProcess(selectedEvaluation.id, student.id, file)
      setSelectedCorrectionId(correction.id)
      setFinalScore(String(correction.suggestedScore))
      setTeacherNotes(correction.teacherNotes ?? '')
      setNotice(`Sugestao gerada para ${student.name}. Revise antes de confirmar.`)
    } catch (processingError) {
      setError(processingError instanceof Error ? processingError.message : 'Nao foi possivel processar o cartao resposta.')
    } finally {
      setProcessingStudentId(null)
    }
  }

  async function submitReview(status: EvaluationCorrectionReviewPayload['status']) {
    if (!selectedCorrection) return
    setReviewing(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await onReview(selectedCorrection.id, {
        status,
        finalScore: finalScore === '' ? null : Number(finalScore),
        teacherNotes,
      })
      setSelectedCorrectionId(updated.id)
      setNotice(status === 'CONFIRMED' ? 'Nota confirmada com sucesso.' : 'Revisao salva.')
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Nao foi possivel salvar a revisao.')
    } finally {
      setReviewing(false)
    }
  }

  const confirmedCount = evaluationCorrections.filter((correction) => correction.status === 'CONFIRMED').length
  const pendingCount = Math.max(0, classStudents.length - confirmedCount)

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1680px] gap-5 bg-gradient-to-br from-slate-100 via-slate-50 to-white px-[clamp(10px,2.5vw,40px)] py-4 pb-16 text-slate-900">
      <PageTitleBar
        label="OMR / Cartao resposta"
        title="Correcao de Provas"
        icon={<SearchCheck className="h-6 w-6" />}
        actions={selectedEvaluation && onDownloadEvaluation ? (
          <button
            type="button"
            onClick={() => onDownloadEvaluation(selectedEvaluation.id)}
            className="inline-flex items-center justify-center gap-2 rounded-sm border-2 border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
          >
            <FileDown className="h-4 w-4" />
            Baixar prova
          </button>
        ) : null}
      />
      <p className="-mt-2 text-sm font-semibold text-slate-500">Envie a foto ou PDF do cartao resposta, revise a leitura e confirme a nota manualmente.</p>

      <section className="grid gap-4 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1.5">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
            <Users className="h-4 w-4 text-cyan-500" />
            Turma
          </span>
          <CompactSelect value={classId} onChange={(value) => { setClassId(value); setSelectedCorrectionId('') }} options={classOptions} className="min-h-11 rounded-sm border-2 border-slate-300 bg-white px-4 text-sm font-bold" dropdownMinWidth={260} />
        </label>
        <label className="grid gap-1.5">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
            <ClipboardCheck className="h-4 w-4 text-indigo-500" />
            Prova
          </span>
          <CompactSelect value={evaluationId} onChange={(value) => { setEvaluationId(value); setSelectedCorrectionId('') }} options={evaluationOptions} className="min-h-11 rounded-sm border-2 border-slate-300 bg-white px-4 text-sm font-bold" dropdownMinWidth={320} />
        </label>
        <div className="grid grid-cols-3 gap-2 lg:min-w-[300px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase text-slate-400">Alunos</p>
            <p className="text-xl font-black text-slate-900">{classStudents.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[10px] font-black uppercase text-emerald-500">Confirmadas</p>
            <p className="text-xl font-black text-emerald-700">{confirmedCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-black uppercase text-amber-500">Pendentes</p>
            <p className="text-xl font-black text-amber-700">{pendingCount}</p>
          </div>
        </div>
      </section>

      {(notice || error) && (
        <div className={`rounded-lg border-2 px-4 py-3 text-sm font-bold ${error ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(520px,0.95fr)_1.05fr]">
        <section className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
              <GraduationCap className="h-4 w-4 text-cyan-500" />
              Alunos da turma {selectedClass ? `- ${selectedClass.name}` : ''}
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {!selectedEvaluation ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">Selecione uma turma e uma prova para iniciar.</div>
            ) : classStudents.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">Nenhum aluno encontrado para esta turma.</div>
            ) : classStudents.map((student) => {
              const correction = correctionByStudentId.get(student.id)
              const isProcessing = processingStudentId === student.id
              return (
                <div key={student.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <button type="button" onClick={() => correction && setSelectedCorrectionId(correction.id)} className="min-w-0 text-left">
                    <p className="truncate text-sm font-black text-slate-900">{student.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{student.registrationNumber || student.registration || student.login}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(correction)}`}>
                      {statusLabel(correction)}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {correction && (
                      <button type="button" onClick={() => setSelectedCorrectionId(correction.id)} className="inline-flex items-center gap-1.5 rounded-sm border-2 border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                        <Eye className="h-4 w-4" />
                        Revisar
                      </button>
                    )}
                    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-bold text-white shadow-sm ${isProcessing ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                      <ImageUp className="h-4 w-4" />
                      {isProcessing ? 'Processando' : correction ? 'Reenviar' : 'Enviar arquivo'}
                      <input type="file" accept="image/*,application/pdf" className="hidden" disabled={isProcessing} onChange={(event) => handleImageChange(student, event)} />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
              <FileText className="h-4 w-4 text-indigo-500" />
              Revisao da leitura
            </h2>
          </div>

          {!selectedCorrection ? (
            <div className="grid min-h-[360px] place-items-center p-8 text-center">
              <div>
                <SearchCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">Envie uma foto ou PDF de cartao resposta, ou selecione uma sugestao existente.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-[10px] font-black uppercase text-indigo-500">Nota sugerida</p>
                  <p className="text-2xl font-black text-indigo-700">{formatScore(selectedCorrection.suggestedScore)}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-black uppercase text-emerald-500">Acertos</p>
                  <p className="text-2xl font-black text-emerald-700">{selectedCorrection.correctCount}/{selectedCorrection.totalQuestions}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-black uppercase text-amber-500">Confianca</p>
                  <p className="text-2xl font-black text-amber-700">{Math.round(selectedCorrection.confidence * 100)}%</p>
                  <p className="text-[11px] font-bold text-amber-600">{confidenceLabel(selectedCorrection.confidence)}</p>
                </div>
                <div className={`rounded-lg border p-3 ${statusClass(selectedCorrection)}`}>
                  <p className="text-[10px] font-black uppercase opacity-70">Status</p>
                  <p className="text-lg font-black">{statusLabel(selectedCorrection)}</p>
                </div>
              </div>

              {selectedCorrection.imageUrl && (
                <a href={resolveApiAssetUrl(selectedCorrection.imageUrl) ?? selectedCorrection.imageUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-sm border-2 border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                  <Eye className="h-4 w-4" />
                  Ver arquivo enviado
                </a>
              )}

              {(selectedCorrection.failures.length > 0 || selectedCorrection.shouldRetakeImage) && (
                <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Pontos de atencao
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCorrection.shouldRetakeImage && <span className="rounded-full bg-white px-2 py-1 text-xs">Reenviar foto recomendado</span>}
                    {selectedCorrection.failures.map((failure) => <span key={failure} className="rounded-full bg-white px-2 py-1 text-xs">{failure}</span>)}
                  </div>
                </div>
              )}

              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[180px_1fr]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-slate-500">Nota final</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={finalScore}
                    onChange={(event) => setFinalScore(event.target.value)}
                    className="min-h-10 rounded-sm border-2 border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-slate-500">Observacao do professor</span>
                  <input
                    value={teacherNotes}
                    onChange={(event) => setTeacherNotes(event.target.value)}
                    className="min-h-10 rounded-sm border-2 border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-indigo-500"
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={reviewing} onClick={() => submitReview('CONFIRMED')} className="inline-flex items-center gap-2 rounded-sm bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  Confirmar nota
                </button>
                <button type="button" disabled={reviewing} onClick={() => submitReview('NEEDS_RETAKE')} className="inline-flex items-center gap-2 rounded-sm border-2 border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60">
                  <RotateCcw className="h-4 w-4" />
                  Pedir nova foto
                </button>
                <button type="button" disabled={reviewing} onClick={() => submitReview('REJECTED')} className="inline-flex items-center gap-2 rounded-sm border-2 border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                  <XCircle className="h-4 w-4" />
                  Rejeitar leitura
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[70px_1fr_1fr_1fr_90px] bg-slate-100 px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  <span>Questao</span>
                  <span>Detectada</span>
                  <span>Correta</span>
                  <span>Status</span>
                  <span>Conf.</span>
                </div>
                <div className="max-h-[440px] overflow-auto divide-y divide-slate-100">
                  {selectedCorrection.detectedAnswers.map((answer) => (
                    <div key={answer.questionNumber} className={`grid grid-cols-[70px_1fr_1fr_1fr_90px] px-3 py-2 text-sm ${answer.isCorrect ? 'bg-white' : 'bg-rose-50/55'}`}>
                      <span className="font-black text-slate-700">{answer.questionNumber}</span>
                      <span className="font-bold text-slate-700">{answer.detectedOption ?? '-'}</span>
                      <span className="font-bold text-emerald-700">{answer.correctOption}</span>
                      <span className="font-semibold text-slate-600">{answerStatusLabel(answer.status)}</span>
                      <span className="font-bold text-slate-600">{Math.round(answer.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
