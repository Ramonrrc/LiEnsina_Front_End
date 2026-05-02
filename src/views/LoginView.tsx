import { FormEvent, useState } from 'react'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  GitMerge,
  GraduationCap,
  KeyRound,
  Mail,
  MoveLeft,
  ShieldCheck,
  Users,
  BarChart3,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { appName, localCredentials, logoPath } from '../data'

// ─── Fundo animado com filtro SVG ───────────────────────────────────────────
const loginBg = '/FundoPreto.jpg'

function AnimatedBackground() {
  return (
    <>
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
      >
        <defs>
          <filter id="bg-warp" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.010 0.007"
              numOctaves="2"
              seed="5"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.010 0.007; 0.013 0.009; 0.010 0.006; 0.012 0.008; 0.010 0.007"
                dur="20s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Imagem de fundo ESTÁTICA — sem filter, para o backdrop-filter das seções enxergar */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* Imagem de fundo com warp — decorativa, por cima */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-16px',
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'url(#bg-warp)',
          willChange: 'filter',
          zIndex: 1,
        }}
      />

      {/* Overlay escuro */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 12, 18, 0.72)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Grain sutil */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          opacity: 0.4,
          zIndex: 2,
        }}
      />
    </>
  )
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface LoginViewProps {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>
}

// ─── LoginView ───────────────────────────────────────────────────────────────
export default function LoginView({ errorMessage, isSubmitting, onSubmit }: LoginViewProps) {
  const [email, setEmail] = useState(localCredentials[0]?.email ?? '')
  const [password, setPassword] = useState(localCredentials[0]?.email ?? '')
  const [showPassword, setShowPassword] = useState(false)

  function fillCredential(credEmail: string) {
    setEmail(credEmail)
    setPassword(credEmail)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({ email: email.trim(), password })
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-8 overflow-hidden">
      <AnimatedBackground />

      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .login-card {
          animation: loginFadeIn 0.35s ease forwards;
        }
      `}</style>

      <div
        className="login-card relative z-10 w-full max-w-5xl grid lg:grid-cols-[1fr_0.85fr] rounded-[24px]"
        style={{
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
          zIndex: 10,
        }}
      >

        {/* ── Painel esquerdo — glassmorphism ── */}
        <section
          className="relative overflow-hidden px-10 py-11 text-white flex flex-col justify-between gap-8 min-h-[600px]"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(10px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '24px 0 0 24px',
          }}
        >
          {/* Blob superior direito */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
          />
          {/* Blob inferior esquerdo */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-16 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
          />

          {/* ── Topo ── */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <a
                href="/"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.60)',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.60)'
                }}
              >
                <MoveLeft className="h-3 w-3" />
                <span>Voltar</span>
              </a>

              {/* Badge plataforma */}
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{
                  background: 'rgba(212,175,90,0.10)',
                  border: '1px solid rgba(212,175,90,0.22)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#d4af5a', boxShadow: '0 0 6px rgba(212,175,90,0.65)' }}
                />
                <span
                  className="text-[10px] font-semibold tracking-[0.15em] uppercase"
                  style={{ color: 'rgba(212,175,90,0.90)' }}
                >
                  Plataforma ativa
                </span>
              </div>
            </div>

            {/* Logo + título */}
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
                >
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span
                  className="text-xl font-semibold tracking-tight"
                  style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.95)' }}
                >
                  {appName}
                </span>
              </div>

              <h1
                className="text-[2rem] font-semibold leading-[1.22] tracking-tight mb-3"
                style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.95)' }}
              >
                Gestão Escolar<br />
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>Integrada</span>
              </h1>

              <p
                className="text-sm leading-[1.8] max-w-[300px]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.40)' }}
              >
                Secretaria, direção e professores em uma plataforma única com controle de acesso por perfil.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-2.5 pt-1">
              {[
                { icon: <FileText className="w-3.5 h-3.5" />, text: 'Turmas, alunos e matrículas com histórico completo' },
                { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Acesso segmentado por cargo e trilha de auditoria' },
                { icon: <GitMerge className="w-3.5 h-3.5" />, text: 'Relatórios e histórico escolar LGPD compliant' },
              ].map(({ icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)' }}
                  >
                    {icon}
                  </div>
                  <p
                    className="text-[12.5px] leading-[1.65]"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.50)' }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Status grid ── */}
          <div className="relative z-10 grid grid-cols-2 gap-2.5">
            <GlassStatusCard icon={<Zap className="w-3.5 h-3.5" />} label="API" value="Online" detail="Adapter local ativo" dot="green" />
            <GlassStatusCard icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Autenticação" value="JWT" detail="Sessão persistida" dot="blue" />
            <GlassStatusCard icon={<Users className="w-3.5 h-3.5" />} label="Turmas" value="Ativo" detail="Gestão completa" dot="blue" />
            <GlassStatusCard icon={<BarChart3 className="w-3.5 h-3.5" />} label="Relatórios" value="Em tempo real" detail="Exportação ativa" dot="green" />
          </div>
        </section>

        {/* ── Painel direito — formulário ── */}
        <section
          className="flex items-center justify-center px-8 py-10"
          style={{ background: '#f7f6f2', borderRadius: '0 24px 24px 0' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="w-full max-w-sm"
          >
            {/* Header do formulário */}
            <div className="mb-7">
              <p
                className="text-[10.5px] font-semibold tracking-[0.18em] uppercase mb-2"
                style={{ fontFamily: "'DM Sans', sans-serif", color: '#b08d3a' }}
              >
                Acesso seguro
              </p>
              <h2
                className="text-[1.65rem] font-semibold leading-[1.2] tracking-tight mb-2"
                style={{ fontFamily: "'Lora', serif", color: '#0e1117' }}
              >
                Entrar no sistema
              </h2>
              <p
                className="text-[13px] leading-[1.7]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: '#a09e99' }}
              >
                Selecione um perfil ou insira suas credenciais abaixo.
              </p>
            </div>

            {/* Divider label */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: '#e2e0d9' }} />
              <span
                className="text-[10.5px] font-semibold tracking-[0.10em] uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif", color: '#c4c2bb' }}
              >
                Perfis de acesso
              </span>
              <div className="flex-1 h-px" style={{ background: '#e2e0d9' }} />
            </div>

            {/* Seletor rápido de credenciais */}
            <div className="flex flex-col gap-2 mb-5">
              {localCredentials.map((credential) => (
                <button
                  key={credential.email}
                  type="button"
                  onClick={() => fillCredential(credential.email)}
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-200"
                  style={{
                    border: '1px solid #ddd9d2',
                    background: '#ffffff',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = '#c9a94e'
                    ;(e.currentTarget as HTMLElement).style.background = '#faf8f0'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = '#ddd9d2'
                    ;(e.currentTarget as HTMLElement).style.background = '#ffffff'
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#faf4e6', border: '1px solid #e8d49a' }}
                  >
                    <Users className="w-4 h-4" style={{ color: '#b08d3a' }} />
                  </div>
                  <div>
                    <p
                      className="text-[12.5px] font-semibold"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: '#0e1117' }}
                    >
                      {credential.label}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: '#b0ada8' }}
                    >
                      {credential.email}
                    </p>
                  </div>
                  <ArrowRight
                    className="w-3.5 h-3.5 ml-auto"
                    style={{ color: '#ccc' }}
                  />
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: '#e2e0d9' }} />
              <span
                className="text-[10.5px] font-semibold tracking-[0.10em] uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif", color: '#c4c2bb' }}
              >
                ou entre manualmente
              </span>
              <div className="flex-1 h-px" style={{ background: '#e2e0d9' }} />
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <FieldShell label="E-mail institucional">
                <Mail className="h-4 w-4 shrink-0" style={{ color: '#bbb8b3' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@liensina.local"
                  required
                  className="h-full w-full bg-transparent text-sm font-medium outline-none"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: '#0e1117' }}
                />
              </FieldShell>

              <FieldShell label="Senha">
                <KeyRound className="h-4 w-4 shrink-0" style={{ color: '#bbb8b3' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="h-full w-full bg-transparent text-sm font-medium outline-none"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: '#0e1117' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 transition-colors"
                  style={{ color: '#bbb8b3' }}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#666')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#bbb8b3')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </FieldShell>

              {errorMessage && (
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium"
                  style={{
                    border: '1px solid #f5c2c7',
                    background: '#fff5f5',
                    color: '#c23b22',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  background: '#0e1117',
                  color: '#ffffff',
                  opacity: isSubmitting ? 0.65 : 1,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                }}
                onMouseEnter={e => {
                  if (!isSubmitting)
                    (e.currentTarget as HTMLElement).style.background = '#1e2535'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = '#0e1117'
                }}
              >
                {isSubmitting ? (
                  <>
                    <span>Entrando...</span>
                    <span
                      className="h-4 w-4 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#fff' }}
                    />
                  </>
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer do form */}
            <div
              className="mt-5 flex items-center gap-2 text-[11.5px]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: '#c4c2bb' }}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: '#d4d2ca' }} />
              Sessão protegida por JWT com controle de cargo.
            </div>
          </motion.div>
        </section>

      </div>
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[11.5px] font-medium tracking-[0.04em]"
        style={{ fontFamily: "'DM Sans', sans-serif", color: '#706e6a' }}
      >
        {label}
      </span>
      <span
        className="flex h-11 items-center gap-3 rounded-[10px] px-4 transition-all duration-200"
        style={{
          border: '1px solid #d8d6cf',
          background: '#ffffff',
        }}
        onFocusCapture={e => {
          ;(e.currentTarget as HTMLElement).style.borderColor = '#c9a94e'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(201,169,78,0.14)'
        }}
        onBlurCapture={e => {
          ;(e.currentTarget as HTMLElement).style.borderColor = '#d8d6cf'
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
        }}
      >
        {children}
      </span>
    </label>
  )
}

function GlassStatusCard({
  icon,
  label,
  value,
  detail,
  dot,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  dot: 'green' | 'blue'
}) {
  const dotColor = dot === 'green' ? '#d4af5a' : '#7ab4e8'
  const dotGlow = dot === 'green' ? 'rgba(212,175,90,0.65)' : 'rgba(122,180,232,0.6)'

  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)' }}
        >
          {icon}
        </div>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: dotColor, boxShadow: `0 0 5px ${dotGlow}` }}
        />
      </div>
      <p
        className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-0.5"
        style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.35)' }}
      >
        {label}
      </p>
      <p
        className="text-[15px] font-semibold mb-1"
        style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.88)' }}
      >
        {value}
      </p>
      <p
        className="text-[11px] leading-[1.5]"
        style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.32)' }}
      >
        {detail}
      </p>
    </div>
  )
}