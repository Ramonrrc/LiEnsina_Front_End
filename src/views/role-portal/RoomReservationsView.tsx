import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  GraduationCap,
  MapPin,
  Save,
  School,
  Sparkles,
  Target,
  Users,
  X,
  Building2,
} from 'lucide-react'

import { CompactSelect } from '../../components/ui/compact-select'
import DateInput from '../../components/ui/date-input'
import { FieldMessage, fieldStateClass } from '../../components/ui/form-field'
import type { RolePortalScreenModel } from './screen-model'
import type { RoomReservation } from '../../types'
import { classOptions } from '../../components/role-portal/portal-components'

/* ─────────────────────────────────────────────
   Eyebrow
───────────────────────────────────────────── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─────────────────────────────────────────────
   Bone (shimmer skeleton)
───────────────────────────────────────────── */
function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Section card
───────────────────────────────────────────── */
function SectionCard({
  label, title, icon: Icon, iconBg, children, delay = 0, headerRight,
}: {
  label: string
  title: string
  icon: React.ElementType
  iconBg: string
  children: React.ReactNode
  delay?: number
  headerRight?: React.ReactNode
}) {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm"
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBg}`}>
            <Icon size={16} className="text-white" />
          </div>
          <div>
            <Eyebrow className="text-indigo-500">{label}</Eyebrow>
            <p className="font-['Lora'] text-sm font-semibold text-stone-900 leading-snug mt-0.5">{title}</p>
          </div>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   Field wrapper com ícone colorido na label
───────────────────────────────────────────── */
function Field({
  label, icon: Icon, iconColor = 'text-stone-400', error, children, hint, required,
}: {
  label: string
  icon?: React.ElementType
  iconColor?: string
  error?: string
  children: React.ReactNode
  hint?: string
  required?: boolean
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        {Icon && <Icon size={11} className={`shrink-0 ${iconColor}`} />}
        <Eyebrow className="text-stone-500">{label}</Eyebrow>
        {required && <span className="text-rose-400 text-[10px] font-bold ml-0.5">*</span>}
      </span>
      {children}
      <FieldMessage hint={hint} error={error} />
    </label>
  )
}

/* ─────────────────────────────────────────────
   Input classes
───────────────────────────────────────────── */
const inputIconCls =
  "min-h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white pl-9 pr-3.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans']"

const inputCls =
  "min-h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans']"

const textareaCls =
  "min-h-24 w-full min-w-0 resize-none rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans']"

/* ─────────────────────────────────────────────
   Skeleton field
───────────────────────────────────────────── */
function SkeletonField() {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-2.5 w-24 rounded" />
      <Bone className="h-11 w-full rounded-xl" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Skeleton formulário
───────────────────────────────────────────── */
function FormSkeleton() {
  return (
    <div className="animate-in fade-in duration-300 fill-mode-both overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <Bone className="h-0.5 w-full rounded-none" />
      <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
        <Bone className="h-9 w-9 rounded-xl shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Bone className="h-2.5 w-20 rounded" />
          <Bone className="h-3.5 w-40 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5 max-[580px]:grid-cols-1">
        {[1, 2, 3, 4, 5].map((i) => <SkeletonField key={i} />)}
        <div className="col-span-2 flex flex-col gap-2 max-[580px]:col-span-1">
          <Bone className="h-2.5 w-24 rounded" />
          <Bone className="h-24 w-full rounded-xl" />
        </div>
      </div>
      <div className="flex justify-end border-t border-stone-200 px-5 py-4">
        <Bone className="h-10 w-40 rounded-xl" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Skeleton card de reserva
───────────────────────────────────────────── */
function ReservationCardSkeleton({ index }: { index: number }) {
  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className="animate-in fade-in duration-300 fill-mode-both flex flex-col gap-3 rounded-2xl border border-stone-300 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Bone className="h-9 w-9 rounded-xl shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Bone className="h-2.5 w-14 rounded" />
            <Bone className="h-4 w-28 rounded-lg" />
          </div>
        </div>
        <Bone className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Bone className="h-6 w-24 rounded-full" />
        <Bone className="h-6 w-28 rounded-full" />
      </div>
      <Bone className="h-10 w-full rounded-xl" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Skeleton lista
───────────────────────────────────────────── */
function ListSkeleton() {
  return (
    <div className="animate-in fade-in duration-300 fill-mode-both overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <Bone className="h-0.5 w-full rounded-none" />
      <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
        <Bone className="h-9 w-9 rounded-xl shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Bone className="h-2.5 w-20 rounded" />
          <Bone className="h-3.5 w-32 rounded" />
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <ReservationCardSkeleton key={i} index={i} />)}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   Main Component
══════════════════════════════════════ */
export function RoomReservationsView({ model }: { model: RolePortalScreenModel }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const {
    reservations,
    selectedReservation,
    setSelectedReservation,
    isSavingReservation,
    reservationError,
    reservationFieldErrors,
    reservationDraft,
    classes,
    schools,
    handleSaveReservation,
    handleReservationStartTimeChange,
    reservationStartTimeOptions,
    reservationEndTimeOptions,
    updateReservationDraftField,
    clearReservationFieldError,
    getClassName,
    getReservationSchoolName,
    formatReservationDate,
    formatReservationTime,
  } = model

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes shimmer { to { transform: translateX(200%) } }
        .fill-mode-both { animation-fill-mode: both; }

        @keyframes rrv-spin { to { transform: rotate(360deg); } }
        @keyframes rrv-modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes rrv-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rrv-row-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .rrv-spinner {
          display: inline-block; width: 15px; height: 15px;
          border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; animation: rrv-spin 0.7s linear infinite; flex-shrink: 0;
        }

        /* ícone dentro do input */
        .rrv-wrap { position: relative; }
        .rrv-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          pointer-events: none; transition: opacity 0.15s;
        }
        .rrv-wrap:focus-within .rrv-icon { opacity: 1 !important; }

        /* botão salvar */
        .rrv-save-btn {
          box-shadow: 0 1px 2px rgba(79,70,229,0.25);
          transition: all 0.18s cubic-bezier(0.22,1,0.36,1);
        }
        .rrv-save-btn:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(79,70,229,0.35);
          transform: translateY(-1px);
        }
        .rrv-save-btn:active:not(:disabled) { transform: translateY(0); }

        /* cards de reserva */
        .rrv-card {
          transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
        }
        .rrv-card:hover {
          box-shadow: 0 6px 24px rgba(79,70,229,0.13);
          transform: translateY(-2px);
          border-color: #a5b4fc !important;
        }
        .rrv-card:hover .rrv-hint { opacity: 1 !important; }
        .rrv-card:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }

        /* modal */
        .rrv-overlay { animation: rrv-overlay-in 0.2s ease-out both; }
        .rrv-modal   { animation: rrv-modal-in 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .rrv-row     { animation: rrv-row-in 0.3s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="font-['DM_Sans',system-ui,sans-serif] grid min-h-screen gap-4 bg-stone-100 px-[clamp(12px,2.5vw,40px)] py-6 pb-12 text-stone-900">

        {/* ═══ HEADER BAR ═══ */}
        <div className="animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
          <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">

            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
                <DoorOpen size={16} className="text-white" />
              </div>
              <div>
                <Eyebrow className="text-indigo-500">Professor</Eyebrow>
                <p className="font-['Lora'] text-sm font-semibold text-stone-900 leading-snug mt-0.5">Reservas de Sala</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-5 divide-x divide-stone-200">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                  <DoorOpen size={13} className="text-indigo-600" />
                </div>
                <div>
                  <Eyebrow>Reservas</Eyebrow>
                  <p className="font-['Lora'] text-base font-bold text-stone-900 leading-none">{isLoading ? '—' : reservations.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                  <Users size={13} className="text-emerald-600" />
                </div>
                <div>
                  <Eyebrow>Turmas</Eyebrow>
                  <p className="font-['Lora'] text-base font-bold text-stone-900 leading-none">{isLoading ? '—' : classes.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                  <Building2 size={13} className="text-violet-600" />
                </div>
                <div>
                  <Eyebrow>Escolas</Eyebrow>
                  <p className="font-['Lora'] text-base font-bold text-stone-900 leading-none">{isLoading ? '—' : schools.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pl-5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 font-['DM_Sans']">Sistema ativo</span>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            <FormSkeleton />
            <ListSkeleton />
          </div>
        ) : (
          <>
            {/* ═══ FORMULÁRIO ═══ */}
            <SectionCard
              label="Nova reserva"
              title="Reservar ambiente escolar"
              icon={Calendar}
              iconBg="bg-indigo-600"
              delay={75}
            >
              <form onSubmit={handleSaveReservation} noValidate>

                {reservationError && (
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
                    <AlertCircle size={15} className="shrink-0 text-rose-500" />
                    <p className="text-sm font-medium text-rose-700 font-['DM_Sans']">{reservationError}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">

                  {/* Sala */}
                  <Field label="Sala, Laboratório" icon={MapPin} iconColor="text-indigo-500" error={reservationFieldErrors.room} hint="Nome do ambiente como a escola identifica." required>
                    <div className="rrv-wrap">
                      <input
                        className={`${inputIconCls} ${fieldStateClass(reservationFieldErrors.room)}`}
                        value={reservationDraft.room}
                        onChange={(e) => updateReservationDraftField('room', e.target.value)}
                        placeholder="Ex: Laboratório de Informática"
                        aria-invalid={Boolean(reservationFieldErrors.room) || undefined}
                        required
                      />
                      <MapPin size={13} className="rrv-icon text-indigo-500 opacity-70" />
                    </div>
                  </Field>

                  {/* Turma */}
                  <Field label="Turma" icon={GraduationCap} iconColor="text-violet-500" error={reservationFieldErrors.classId} hint="Selecione a turma que usará o ambiente." required>
                    <CompactSelect
                      value={reservationDraft.classId}
                      options={classOptions(classes)}
                      onChange={(classId) => updateReservationDraftField('classId', classId)}
                      ariaLabel="Turma"
                      error={reservationFieldErrors.classId}
                      className={`${inputCls} ${fieldStateClass(reservationFieldErrors.classId)}`}
                      dropdownWidth="trigger"
                    />
                  </Field>

                  {/* Data */}
                  <Field label="Data da reserva" icon={CalendarDays} iconColor="text-sky-500" error={reservationFieldErrors.date} hint="Informe o dia da reserva." required>
                    <div className="rrv-wrap">
                      <DateInput
                        value={reservationDraft.date}
                        onChange={(e) => updateReservationDraftField('date', e.target.value)}
                        error={reservationFieldErrors.date}
                        icon={<CalendarDays size={13} className="text-sky-500 opacity-70" />}
                        className={`${inputCls} ${fieldStateClass(reservationFieldErrors.date)}`}
                      />
                    </div>
                  </Field>

                  {/* Horário início */}
                  <Field label="Horário de início" icon={Clock} iconColor="text-emerald-500" error={reservationFieldErrors.startTime} hint="Escolha quando a reserva começa." required>
                    <div className="rrv-wrap">
                      <CompactSelect
                        value={reservationDraft.startTime}
                        options={reservationStartTimeOptions}
                        onChange={(startTime) => {
                          clearReservationFieldError('startTime')
                          clearReservationFieldError('endTime')
                          handleReservationStartTimeChange(startTime)
                        }}
                        ariaLabel="Horário de início"
                        error={reservationFieldErrors.startTime}
                        className={`${inputIconCls} ${fieldStateClass(reservationFieldErrors.startTime)}`}
                        dropdownWidth="trigger"
                      />
                      <Clock size={13} className="rrv-icon text-emerald-500 opacity-70" />
                    </div>
                  </Field>

                  {/* Horário fim */}
                  <Field label="Horário de término" icon={Clock} iconColor="text-amber-500" error={reservationFieldErrors.endTime} hint="Escolha um horário posterior ao início." required>
                    <div className="rrv-wrap">
                      <CompactSelect
                        value={reservationDraft.endTime}
                        options={reservationEndTimeOptions}
                        onChange={(endTime) => updateReservationDraftField('endTime', endTime)}
                        ariaLabel="Horário de fim"
                        error={reservationFieldErrors.endTime}
                        className={`${inputIconCls} ${fieldStateClass(reservationFieldErrors.endTime)}`}
                        dropdownWidth="trigger"
                      />
                      <Clock size={13} className="rrv-icon text-amber-500 opacity-70" />
                    </div>
                  </Field>

                  {/* Finalidade — full width */}
                  <div className="col-span-2 max-[580px]:col-span-1">
                    <Field label="Finalidade" icon={Target} iconColor="text-orange-500" error={reservationFieldErrors.purpose} hint="Descreva rapidamente o objetivo da reserva." required>
                      <textarea
                        className={`${textareaCls} ${fieldStateClass(reservationFieldErrors.purpose)}`}
                        value={reservationDraft.purpose}
                        onChange={(e) => updateReservationDraftField('purpose', e.target.value)}
                        placeholder="Descreva o objetivo da reserva, atividades planejadas, recursos necessários…"
                        aria-invalid={Boolean(reservationFieldErrors.purpose) || undefined}
                        required
                      />
                    </Field>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-end border-t border-stone-200 pt-5">
                  <button
                    type="submit"
                    disabled={isSavingReservation || classes.length === 0}
                    className="rrv-save-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 font-['DM_Sans']"
                  >
                    {isSavingReservation
                      ? <><span className="rrv-spinner" />Salvando…</>
                      : <><Save size={15} />Salvar reserva</>}
                  </button>
                </div>
              </form>
            </SectionCard>

            {/* ═══ LISTA DE RESERVAS ═══ */}
            <SectionCard
              label="Histórico"
              title="Reservas recentes"
              icon={Clock}
              iconBg="bg-violet-600"
              delay={150}
              headerRight={
                reservations.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 font-['DM_Sans']">
                    <Sparkles size={9} />
                    {reservations.length} reserva{reservations.length !== 1 ? 's' : ''}
                  </span>
                ) : undefined
              }
            >
              {reservations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50">
                    <DoorOpen size={28} className="text-stone-300" />
                  </div>
                  <div>
                    <p className="font-['Lora'] text-sm font-semibold text-stone-600">Nenhuma reserva cadastrada</p>
                    <p className="mt-1 text-xs text-stone-400 font-['DM_Sans']">Preencha o formulário acima para criar sua primeira reserva.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {reservations.map((r: RoomReservation, i: number) => (
                    <article
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedReservation(r)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedReservation(r) } }}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className="rrv-card animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both relative cursor-pointer overflow-hidden rounded-2xl border border-stone-300 bg-white p-4 shadow-sm focus:outline-none"
                      aria-label={`Ver dados da reserva de ${r.room}`}
                    >
                      {/* barra lateral */}
                      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />

                      <div className="pl-3">
                        {/* Topo */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                              <DoorOpen size={15} className="text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <Eyebrow>Ambiente</Eyebrow>
                              <p className="font-['Lora'] text-sm font-semibold text-stone-900 truncate leading-snug">{r.room}</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 font-['DM_Sans']">
                            <Clock size={10} className="text-emerald-500" />
                            {formatReservationTime(r.startTime)}–{formatReservationTime(r.endTime)}
                          </span>
                        </div>

                        {/* Badges */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-[10px] font-medium text-stone-600 font-['DM_Sans']">
                            <GraduationCap size={10} className="text-violet-500" />
                            {getClassName(r.classId)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 text-[10px] font-medium text-stone-600 font-['DM_Sans']">
                            <CalendarDays size={10} className="text-sky-500" />
                            {formatReservationDate(r.date)}
                          </span>
                        </div>

                        {/* Finalidade */}
                        {r.purpose && (
                          <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                            <p className="line-clamp-2 text-[12px] font-medium text-stone-500 font-['DM_Sans']">{r.purpose}</p>
                          </div>
                        )}

                        {/* "Ver detalhes" aparece no hover */}
                        <div className="rrv-hint mt-3 flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-400 font-['DM_Sans'] opacity-0 transition-opacity duration-200">
                          Ver detalhes <ArrowRight size={10} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>

      {/* ═══ MODAL ═══ */}
      {selectedReservation && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="presentation"
              onMouseDown={() => setSelectedReservation(null)}
              className="rrv-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-stone-900/40 px-4 py-6 backdrop-blur-sm"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="rrv-modal-title"
                onMouseDown={(e) => e.stopPropagation()}
                className="rrv-modal w-full max-w-lg overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-xl"
              >
                {/* Faixa gradiente */}
                <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
                      <DoorOpen size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <Eyebrow className="text-indigo-500">Dados da reserva</Eyebrow>
                      <h2 id="rrv-modal-title" className="font-['Lora'] text-sm font-semibold text-stone-900 leading-snug truncate mt-0.5">
                        {selectedReservation.room}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReservation(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-400 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Fechar modal"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="grid gap-3 p-5">

                  {/* Ambiente */}
                  <div style={{ animationDelay: '0ms' }} className="rrv-row flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                      <MapPin size={14} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <Eyebrow>Ambiente</Eyebrow>
                      <p className="font-['Lora'] text-sm font-semibold text-stone-900">{selectedReservation.room}</p>
                    </div>
                  </div>

                  {/* Data + Horário */}
                  <div className="grid grid-cols-2 gap-3">
                    <div style={{ animationDelay: '50ms' }} className="rrv-row flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                        <CalendarDays size={14} className="text-sky-600" />
                      </div>
                      <div className="min-w-0">
                        <Eyebrow>Data</Eyebrow>
                        <p className="text-sm font-semibold text-stone-900 font-['DM_Sans']">{formatReservationDate(selectedReservation.date)}</p>
                      </div>
                    </div>
                    <div style={{ animationDelay: '100ms' }} className="rrv-row flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                        <Clock size={14} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <Eyebrow>Horário</Eyebrow>
                        <p className="text-sm font-semibold text-stone-900 font-['DM_Sans']">
                          {formatReservationTime(selectedReservation.startTime)}–{formatReservationTime(selectedReservation.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Turma + Escola */}
                  <div className="grid grid-cols-2 gap-3">
                    <div style={{ animationDelay: '150ms' }} className="rrv-row flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        <GraduationCap size={14} className="text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <Eyebrow>Turma</Eyebrow>
                        <p className="text-sm font-semibold text-stone-900 font-['DM_Sans'] truncate">{getClassName(selectedReservation.classId)}</p>
                      </div>
                    </div>
                    <div style={{ animationDelay: '200ms' }} className="rrv-row flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                        <Building2 size={14} className="text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <Eyebrow>Escola</Eyebrow>
                        <p className="text-sm font-semibold text-stone-900 font-['DM_Sans'] truncate">{getReservationSchoolName(selectedReservation)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Finalidade */}
                  {selectedReservation.purpose && (
                    <div style={{ animationDelay: '250ms' }} className="rrv-row rounded-xl border border-stone-300 bg-stone-50 px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                          <Target size={14} className="text-orange-600" />
                        </div>
                        <Eyebrow>Finalidade</Eyebrow>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-stone-600 font-['DM_Sans']">
                        {selectedReservation.purpose}
                      </p>
                    </div>
                  )}

                  {/* Status confirmado */}
                  <div style={{ animationDelay: '300ms' }} className="rrv-row flex items-center justify-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-sm font-semibold text-emerald-700 font-['DM_Sans']">Reserva confirmada</span>
                  </div>

                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
