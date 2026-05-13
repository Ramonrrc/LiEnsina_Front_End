import { FormEvent, useState } from 'react'
import { motion } from 'motion/react'
import { z } from 'zod'
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

import { appName } from '../data'
import { FieldMessage, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'

const loginBg = '/FundoPreto.jpg'
const loginSchema = z.object({
  email: z.string().trim().min(3, 'Informe e-mail, login ou matrícula.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
type LoginFormField = keyof z.infer<typeof loginSchema>

function AnimatedBackground() {
  return (
    <>
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <defs>
          <filter id="bg-warp" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.010 0.007" numOctaves="2" seed="5" result="noise">
              <animate attributeName="baseFrequency" values="0.010 0.007; 0.013 0.009; 0.010 0.006; 0.012 0.008; 0.010 0.007" dur="20s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      <div aria-hidden="true" className="login-warp-bg" style={{ position: 'absolute', inset: '-16px', backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'url(#bg-warp)', willChange: 'filter', zIndex: 1 }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(10, 12, 18, 0.72)', pointerEvents: 'none', zIndex: 2 }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`, pointerEvents: 'none', opacity: 0.4, zIndex: 2 }} />
    </>
  )
}

interface LoginViewProps {
  errorMessage: string | null
  isSubmitting: boolean
  onBackToLanding: () => void
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>
}

export default function LoginView({ errorMessage, isSubmitting, onBackToLanding, onSubmit }: LoginViewProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginFormField>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      setFieldErrors(zodFieldErrors<LoginFormField>(result.error))
      return
    }

    setFieldErrors({})
    await onSubmit(result.data)
  }

  return (
    <div className="login-page relative flex min-h-[100svh] items-center justify-center overflow-x-hidden overflow-y-auto px-3 py-6">
      <AnimatedBackground />

      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── BASE (desktop) ── */
        .login-shell {
          border-radius: 24px;
          overflow: hidden;
        }
        .login-info-panel {
          border-right: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px 0 0 24px;
        }
        .login-form-panel {
          border-radius: 0 24px 24px 0;
        }
        .login-mobile-hero { display: none; }
        .login-desktop-info { display: flex; }

        /* ══════════════════════════════════════════
           MOBILE — ≤ 1023px
           Estrutura: hero escuro (topo) + card branco (baixo)
        ══════════════════════════════════════════ */
        @media (max-width: 1023px) {
          .login-page {
            align-items: center !important;
            justify-content: center !important;
            padding: 20px 14px !important;
            min-height: 100svh;
          }
          /* Shell: coluna única, sem grid de 2 colunas */
          .login-shell {
            max-width: 420px !important;
            width: 100% !important;
            border-radius: 22px !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* ── Painel esquerdo: vira header hero compacto ── */
          .login-desktop-info {
            display: none !important;
          }
          .login-mobile-hero {
            display: flex !important;
            flex-direction: column;
            padding: 18px 18px 16px !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 22px 22px 0 0 !important;
            min-height: 0 !important;
            gap: 0 !important;
            background: rgba(255,255,255,0.03);
            backdrop-filter: blur(10px) saturate(1.1);
            -webkit-backdrop-filter: blur(10px) saturate(1.1);
            position: relative;
            overflow: hidden;
          }

          /* Linha superior: voltar + badge */
          .mobile-hero-toprow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
          }

          /* Linha da marca: logo + nome */
          .mobile-hero-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          }
          .mobile-hero-logobox {
            width: 32px; height: 32px;
            border-radius: 10px;
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.16);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .mobile-hero-appname {
            font-size: 1rem;
            font-weight: 600;
            color: rgba(255,255,255,0.95);
            font-family: 'Lora', serif;
          }
          .mobile-hero-subtitle {
            font-size: 11.5px;
            color: rgba(255,255,255,0.35);
            font-family: 'DM Sans', sans-serif;
            line-height: 1.5;
            margin-bottom: 12px;
          }

          /* Stats strip: 4 pills em linha */
          .mobile-hero-stats {
            display: flex;
            gap: 6px;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding-bottom: 2px;
          }
          .mobile-hero-stats::-webkit-scrollbar { display: none; }
          .mobile-stat-pill {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 9px;
            border-radius: 20px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.10);
            flex-shrink: 0;
          }
          .mobile-stat-pill-icon {
            color: rgba(255,255,255,0.45);
            display: flex; align-items: center;
          }
          .mobile-stat-pill-icon svg { width: 11px; height: 11px; }
          .mobile-stat-pill-label {
            font-size: 10px;
            font-weight: 500;
            color: rgba(255,255,255,0.55);
            font-family: 'DM Sans', sans-serif;
            white-space: nowrap;
          }
          .mobile-stat-pill-dot {
            width: 5px; height: 5px; border-radius: 50%;
            flex-shrink: 0;
          }

          /* ── Painel direito: card de login em destaque ── */
          .login-form-panel {
            border-radius: 0 0 22px 22px !important;
            padding: 24px 20px 22px !important;
            background: #f7f6f2 !important;
            flex: 1;
          }
          .login-form-card { max-width: none !important; }

          /* Form header */
          .login-form-header { margin-bottom: 18px !important; }
          .login-form-title { font-size: 1.55rem !important; }
          .login-form-copy { font-size: 12.5px !important; }

          /* Inputs generosos para toque */
          .login-form-body { gap: 12px !important; }
          .login-field-control { height: 48px !important; }
          .login-submit-button { height: 50px !important; font-size: 14px !important; }
          .login-form-footer { margin-top: 14px !important; }

          /* Warp bg desnecessário em mobile */
          .login-warp-bg { display: none; }
        }

        /* ══════════════════════════════════════════
           SMALL — ≤ 640px
        ══════════════════════════════════════════ */
        @media (max-width: 640px) {
            .login-page {
              align-items: center !important;
              justify-content: center !important;
              padding: 16px 10px !important;
            }
          .login-shell {
            border-radius: 18px !important;
            max-width: 100% !important;
          }
          .login-mobile-hero {
            padding: 14px 15px 13px !important;
            border-radius: 18px 18px 0 0 !important;
          }
          .mobile-hero-subtitle { display: none; }
          .login-form-panel {
            padding: 20px 16px 18px !important;
            border-radius: 0 0 18px 18px !important;
          }
          .login-field-control { height: 46px !important; }
          .login-submit-button { height: 48px !important; }
        }

        /* ══════════════════════════════════════════
           XS — ≤ 380px
        ══════════════════════════════════════════ */
        @media (max-width: 380px) {
        .login-page {
          align-items: center !important;
          justify-content: center !important;
          padding: 12px 8px !important;
        }
        .login-mobile-hero { padding: 12px 13px 11px !important; }
        .login-form-panel { padding: 18px 14px 16px !important; }
        .mobile-hero-toprow { margin-bottom: 10px; }
        .mobile-hero-brand { margin-bottom: 8px; }
        .mobile-hero-stats { gap: 5px; }
        .mobile-stat-pill { padding: 4px 8px; }
      }
      `}</style>

      <div
       className="login-shell relative z-10 w-full max-w-5xl animate-[loginFadeIn_0.35s_ease_forwards] lg:grid lg:grid-cols-[1fr_0.85fr]"
        style={{
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
          zIndex: 10,
        }}
      >

        {/* ════════════════════════════════════════
            MOBILE HERO — aparece só em ≤ 1023px
        ════════════════════════════════════════ */}
        <div className="login-mobile-hero text-white" aria-hidden="false">
          {/* Blob decorativo */}
          <div aria-hidden="true" style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,90,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Topo: voltar + badge */}
          <div className="mobile-hero-toprow">
            <button
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', cursor: 'pointer' }}
            >
              <MoveLeft className="h-3 w-3" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(212,175,90,0.10)', border: '1px solid rgba(212,175,90,0.22)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d4af5a', boxShadow: '0 0 5px rgba(212,175,90,0.6)' }} />
              <span className="text-[9.5px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'rgba(212,175,90,0.90)' }}>Plataforma ativa</span>
            </div>
          </div>

          {/* Marca */}
          <div className="mobile-hero-brand">
            <div className="mobile-hero-logobox">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="mobile-hero-appname">{appName}</span>
          </div>

          {/* Subtítulo */}
          <p className="mobile-hero-subtitle">
            Secretaria, direção e professores em uma plataforma única.
          </p>

          {/* Stats pills */}
          <div className="mobile-hero-stats">
            {[
              { icon: <Zap />, label: 'Backend ativo', dot: '#d4af5a' },
              { icon: <ShieldCheck />, label: 'JWT seguro', dot: '#7ab4e8' },
              { icon: <Users />, label: 'Turmas', dot: '#7ab4e8' },
              { icon: <BarChart3 />, label: 'Relatórios', dot: '#d4af5a' },
            ].map(({ icon, label, dot }, i) => (
              <div key={i} className="mobile-stat-pill">
                <span className="mobile-stat-pill-icon">{icon}</span>
                <span className="mobile-stat-pill-label">{label}</span>
                <span className="mobile-stat-pill-dot" style={{ background: dot, boxShadow: `0 0 4px ${dot}` }} />
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════
            DESKTOP INFO PANEL — aparece só em lg+
        ════════════════════════════════════════ */}
        <section
          className="login-desktop-info login-info-panel relative min-h-[600px] flex-col justify-between gap-8 overflow-hidden px-10 py-6 text-white"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px) saturate(1.1)', WebkitBackdropFilter: 'blur(10px) saturate(1.1)' }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.60)' }}
              >
                <MoveLeft className="h-3 w-3" /><span>Voltar</span>
              </button>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(212,175,90,0.10)', border: '1px solid rgba(212,175,90,0.22)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d4af5a', boxShadow: '0 0 6px rgba(212,175,90,0.65)' }} />
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'rgba(212,175,90,0.90)' }}>Plataforma ativa</span>
              </div>
            </div>

            <div>
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}>
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.95)' }}>{appName}</span>
              </div>
              <h1 className="mb-3 text-[2rem] font-semibold leading-[1.22] tracking-tight" style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.95)' }}>
                Gestão Escolar<br /><span style={{ color: 'rgba(255,255,255,0.45)' }}>Integrada</span>
              </h1>
              <p className="max-w-[300px] text-sm leading-[1.8]" style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.40)' }}>
                Secretaria, direção e professores em uma plataforma única com controle de acesso por perfil.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {[
                { icon: <FileText className="w-3.5 h-3.5" />, text: 'Turmas, alunos e matrículas com histórico completo' },
                { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Acesso segmentado por cargo e trilha de auditoria' },
                { icon: <GitMerge className="w-3.5 h-3.5" />, text: 'Relatórios e histórico escolar LGPD compliant' },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)' }}>{icon}</div>
                  <p className="text-[12.5px] leading-[1.65]" style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.50)' }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-2.5">
            <GlassStatusCard icon={<Zap className="w-3.5 h-3.5" />} label="Dados" value="Backend" detail="Sem credenciais locais" dot="green" />
            <GlassStatusCard icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Autenticação" value="JWT" detail="Sessão persistida" dot="blue" />
            <GlassStatusCard icon={<Users className="w-3.5 h-3.5" />} label="Turmas" value="Ativo" detail="Gestão completa" dot="blue" />
            <GlassStatusCard icon={<BarChart3 className="w-3.5 h-3.5" />} label="Relatórios" value="Em tempo real" detail="Exportação ativa" dot="green" />
          </div>
        </section>

        {/* ════════════════════════════════════════
            FORMULÁRIO — ambos desktop e mobile
        ════════════════════════════════════════ */}
        <section
          className="login-form-panel flex items-center justify-center px-8 py-5"
          style={{ background: '#f7f6f2' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="login-form-card w-full max-w-sm"
          >
            <div className="login-form-header mb-7">
              <p className="text-[10.5px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: '#b08d3a' }}>
                Acesso seguro
              </p>
              <h2 className="login-form-title mb-2 text-[1.65rem] font-semibold leading-[1.2] tracking-tight" style={{ fontFamily: "'Lora', serif", color: '#0e1117' }}>
                Entrar no sistema
              </h2>
              <p className="login-form-copy text-[13px] leading-[1.7]" style={{ fontFamily: "'DM Sans', sans-serif", color: '#a09e99' }}>
                Insira as credenciais cadastradas no sistema.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form-body flex flex-col gap-3.5" noValidate>
              <FieldShell
                label="E-mail, login ou matrícula"
                hint="Digite o e-mail, login cadastrado ou matrícula do aluno."
                error={fieldErrors.email}
              >
                <Mail className="h-4 w-4 shrink-0" style={{ color: '#bbb8b3' }} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setFieldErrors((current) => ({ ...current, email: undefined }))
                  }}
                  placeholder="Digite seu e-mail, login ou matrícula"
                  aria-invalid={Boolean(fieldErrors.email) || undefined}
                  className="h-full w-full bg-transparent text-sm font-medium outline-none"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: '#0e1117' }}
                />
              </FieldShell>

              <FieldShell label="Senha" hint="Digite a senha da sua conta." error={fieldErrors.password}>
                <KeyRound className="h-4 w-4 shrink-0" style={{ color: '#bbb8b3' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setFieldErrors((current) => ({ ...current, password: undefined }))
                  }}
                  placeholder="Digite sua senha"
                  aria-invalid={Boolean(fieldErrors.password) || undefined}
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
                <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium" style={{ border: '1px solid #f5c2c7', background: '#fff5f5', color: '#c23b22', fontFamily: "'DM Sans', sans-serif" }}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="login-submit-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{ fontFamily: "'DM Sans', sans-serif", background: '#0e1117', color: '#ffffff', opacity: isSubmitting ? 0.65 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}
                onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = '#1e2535' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0e1117' }}
              >
                {isSubmitting ? (
                  <><span>Entrando...</span><span className="h-4 w-4 rounded-sm border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#fff' }} /></>
                ) : (
                  <><span>Entrar no sistema</span><ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <div className="login-form-footer mt-5 flex items-center gap-2 text-[11.5px]" style={{ fontFamily: "'DM Sans', sans-serif", color: '#c4c2bb' }}>
              <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: '#d4d2ca' }} />
              Sessão protegida por JWT com controle de cargo.
            </div>
          </motion.div>
        </section>

      </div>
    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function FieldShell({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string | null
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium tracking-[0.04em]" style={{ fontFamily: "'DM Sans', sans-serif", color: '#706e6a' }}>
        {label}
      </span>
      <span
        className="login-field-control flex h-11 items-center gap-3 rounded-[10px] px-4 transition-all duration-200"
        style={{ border: `1px solid ${error ? '#f5c2c7' : '#d8d6cf'}`, background: error ? '#fff5f5' : '#ffffff' }}
        onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(201,169,78,0.14)' }}
        onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = error ? '#f5c2c7' : '#d8d6cf'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
      >
        {children}
      </span>
      <FieldMessage hint={hint} error={error} className="mt-1.5" />
    </label>
  )
}

function GlassStatusCard({ icon, label, value, detail, dot }: { icon: ReactNode; label: string; value: string; detail: string; dot: 'green' | 'blue' }) {
  const dotColor = dot === 'green' ? '#d4af5a' : '#7ab4e8'
  const dotGlow  = dot === 'green' ? 'rgba(212,175,90,0.65)' : 'rgba(122,180,232,0.6)'
  return (
    <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)' }}>{icon}</div>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 5px ${dotGlow}` }} />
      </div>
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      <p className="text-[15px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: 'rgba(255,255,255,0.88)' }}>{value}</p>
      <p className="text-[11px] leading-[1.5]" style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.32)' }}>{detail}</p>
    </div>
  )
}
