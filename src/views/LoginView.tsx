import { FormEvent, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { z } from 'zod'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
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
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { appName } from '../data'
import { FieldMessage, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'

const loginBg = '/Fundo_Login.png'

const loginSchema = z.object({
  email: z.string().trim().min(3, 'Informe e-mail, login ou matrícula.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
type LoginFormField = keyof z.infer<typeof loginSchema>

/* ─── Floating particles ───────────────────────────────────────────────── */
const DOTS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: 5 + Math.random() * 90,
  y: 5 + Math.random() * 90,
  r: 1.2 + Math.random() * 2.2,
  dur: 9 + Math.random() * 13,
  delay: Math.random() * 7,
  dx: (Math.random() - 0.5) * 28,
  dy: -(18 + Math.random() * 28),
}))

function Particles() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}
    >
      {DOTS.map(d => (
        <circle key={d.id} cx={`${d.x}%`} cy={`${d.y}%`} r={d.r} fill="rgba(167,139,250,0.40)">
          <animate
            attributeName="opacity"
            values="0;0.8;0"
            dur={`${d.dur}s`}
            begin={`${d.delay}s`}
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0,0; ${d.dx},${d.dy}; 0,0`}
            dur={`${d.dur}s`}
            begin={`${d.delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  )
}

/* ─── Neon orbs ────────────────────────────────────────────────────────── */
function NeonOrbs() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes lv-o1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(28px,-22px) scale(1.09)}75%{transform:translate(-14px,16px) scale(0.94)}}
        @keyframes lv-o2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-36px,18px) scale(1.11)}75%{transform:translate(22px,-10px) scale(0.91)}}
        @keyframes lv-o3{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,28px)}}
      `}</style>
      <div style={{ position:'absolute', top:'-14%', left:'-12%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle, rgba(109,91,206,0.26) 0%, rgba(99,102,241,0.10) 42%, transparent 70%)', animation:'lv-o1 21s ease-in-out infinite', filter:'blur(2px)' }} />
      <div style={{ position:'absolute', bottom:'-16%', right:'-12%', width:540, height:540, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.20) 0%, rgba(79,70,229,0.07) 46%, transparent 70%)', animation:'lv-o2 27s ease-in-out infinite', filter:'blur(2px)' }} />
      <div style={{ position:'absolute', top:'32%', right:'6%', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,175,90,0.14) 0%, transparent 70%)', animation:'lv-o3 19s ease-in-out infinite', filter:'blur(7px)' }} />
    </div>
  )
}

/* ─── Props ─────────────────────────────────────────────────────────────── */
interface LoginViewProps {
  errorMessage: string | null
  isSubmitting: boolean
  onBackToLanding: () => void
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
export default function LoginView({ errorMessage, isSubmitting, onBackToLanding, onSubmit }: LoginViewProps) {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors<LoginFormField>>({})
  const [focused, setFocused]           = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) { setFieldErrors(zodFieldErrors<LoginFormField>(result.error)); return }
    setFieldErrors({})
    await onSubmit(result.data)
  }

  return (
    <div className="lv-root">
      {/* Fixed bg layers */}
      <div className="lv-bg-photo" />
      <div className="lv-bg-overlay" />
      <NeonOrbs />
      <Particles />
      <div className="lv-grain" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

        .lv-root{
          position:relative; min-height:100svh; width:100%;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:24px 20px; overflow:hidden;
        }

        /* ── bg ── */
        .lv-bg-photo{position:fixed;inset:0;background-image:url(${loginBg});background-size:cover;background-position:center;z-index:0;}
        .lv-bg-overlay{
          position:fixed;inset:0;z-index:1;
          background:
            radial-gradient(ellipse 80% 65% at 15% 8%, rgba(79,70,229,0.30) 0%, transparent 55%),
            radial-gradient(ellipse 65% 55% at 85% 88%, rgba(139,92,246,0.24) 0%, transparent 55%),
            rgba(7,7,16,0.50);
        }
        .lv-grain{position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:2;opacity:.45;}

        /* ══════════════════════════════════
           SHELL — two-column on desktop
        ══════════════════════════════════ */
        .lv-shell{
          position:relative; z-index:10;
          width:100%; max-width:980px;
          border-radius:24px; overflow:hidden;
          border:1px solid rgba(255,255,255,0.10);
          box-shadow:0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset;
          display:grid;
          grid-template-columns:1fr 0.82fr;
        }

        /* ── Left info panel (desktop only) ── */
        .lv-info{
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          gap:18px;
          padding:22px 30px;
          min-height:0;
          background:rgba(255,255,255,0.03);
          backdrop-filter:blur(10px) saturate(1.1);
          -webkit-backdrop-filter:blur(10px) saturate(1.1);
          border-right:1px solid rgba(255,255,255,0.07);
          position:relative; overflow:hidden;
          color:#fff;
        }

        /* ── Mobile hero (hidden on desktop) ── */
        .lv-mobile-hero{display:none;}

        /* ── Right form panel ── */
        .lv-form-panel{
          display:flex; align-items:center; justify-content:center;
          padding:28px 30px;
          background:#f7f6f2;
        }

        /* accent dot pulse */
        @keyframes lv-p{0%,100%{box-shadow:0 0 5px rgba(212,175,90,.7);}50%{box-shadow:0 0 11px rgba(212,175,90,1.0);}}

        /* back button */
        .lv-back{
          display:inline-flex;align-items:center;gap:5px;
          padding:5px 11px;border-radius:8px;
          background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);
          color:rgba(255,255,255,0.60);font-size:12px;font-weight:500;
          font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .17s;
        }
        .lv-back:hover{background:rgba(255,255,255,0.14);color:rgba(255,255,255,0.90);}

        /* badge */
        .lv-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;background:rgba(212,175,90,0.10);border:1px solid rgba(212,175,90,0.22);}
        .lv-dot{width:6px;height:6px;border-radius:50%;background:#d4af5a;box-shadow:0 0 6px rgba(212,175,90,.8);animation:lv-p 2.5s ease-in-out infinite;}
        .lv-badge span{font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:rgba(212,175,90,.90);font-family:'DM Sans',sans-serif;}

        /* feature cards strip */
        .lv-features{display:flex;flex-direction:column;gap:7px;}
        .lv-feat{display:flex;align-items:center;gap:12px;border-radius:14px;padding:10px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07);}
        .lv-feat-icon{width:28px;height:28px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.10);color:rgba(255,255,255,0.65);}
        .lv-feat p{font-size:12.5px;line-height:1.65;font-family:'DM Sans',sans-serif;color:rgba(255,255,255,0.50);}

        /* status grid */
        .lv-stats{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
        .lv-stat{border-radius:14px;padding:11px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.10);backdrop-filter:blur(8px);}
        .lv-stat-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
        .lv-stat-icon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.10);color:rgba(255,255,255,0.55);}
        .lv-stat-dot{width:6px;height:6px;border-radius:50%;}
        .lv-stat-label{font-size:9.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-family:'DM Sans',sans-serif;color:rgba(255,255,255,0.35);margin-bottom:3px;}
        .lv-stat-value{font-size:15px;font-weight:600;font-family:'Cormorant Garamond','Lora',Georgia,serif;color:rgba(255,255,255,0.88);margin-bottom:4px;}
        .lv-stat-detail{font-size:10.5px;line-height:1.5;font-family:'DM Sans',sans-serif;color:rgba(255,255,255,0.32);}

        /* ── Form card ── */
        .lv-form-card{width:100%;max-width:340px;}
        .lv-eyebrow{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#b08d3a;margin-bottom:6px;}
        .lv-title{font-family:'Cormorant Garamond','Lora',Georgia,serif;font-size:1.65rem;font-weight:700;line-height:1.18;color:#0b0d18;margin-bottom:6px;letter-spacing:.01em;}
        .lv-subtitle{font-size:13px;line-height:1.7;font-family:'DM Sans',sans-serif;color:#a09e99;margin-bottom:16px;}

        /* fields */
        .lv-field{margin-bottom:9px;}
        .lv-flabel{display:block;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;color:#706e6a;margin-bottom:5px;letter-spacing:.04em;}
        .lv-fwrap{display:flex;align-items:center;gap:10px;height:46px;border-radius:11px;padding:0 14px;background:#fff;border:1.5px solid #d8d6cf;transition:border-color .17s,box-shadow .17s,background .17s;}
        .lv-fwrap.foc{border-color:#6d5bce;box-shadow:0 0 0 3px rgba(109,91,206,.09);}
        .lv-fwrap.err{border-color:#f5c2c7;background:#fff5f5;}
        .lv-fwrap input{flex:1;height:100%;border:none;outline:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#0b0d18;}
        .lv-fwrap input::placeholder{color:#c5c3bc;font-weight:400;}
        .lv-ficon{color:#bbb8b3;display:flex;align-items:center;flex-shrink:0;}
        .lv-eye{background:none;border:none;cursor:pointer;padding:0;color:#bbb8b3;display:flex;align-items:center;transition:color .15s;}
        .lv-eye:hover{color:#888;}

        /* error banner */
        .lv-err{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-radius:11px;margin-bottom:12px;background:#fff5f5;border:1px solid #f5c2c7;font-family:'DM Sans',sans-serif;font-size:12.5px;color:#c23b22;font-weight:500;}

        /* submit */
        .lv-sub{
          width:100%;height:48px;border-radius:12px;border:none;
          display:flex;align-items:center;justify-content:center;gap:7px;
          font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:600;
          color:#fff;cursor:pointer;
          background:linear-gradient(135deg,#5b4fd4 0%,#4338CA 100%);
          box-shadow:0 4px 14px rgba(67,56,202,.30),0 1px 0 rgba(255,255,255,.10) inset;
          position:relative;overflow:hidden;transition:transform .17s,box-shadow .17s,background .17s;
        }
        .lv-sub::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.09) 0%,transparent 55%);pointer-events:none;}
        .lv-sub:hover:not(:disabled){background:linear-gradient(135deg,#4f43c2 0%,#3a2e9e 100%);transform:translateY(-1px);box-shadow:0 8px 20px rgba(67,56,202,.36),0 1px 0 rgba(255,255,255,.10) inset;}
        .lv-sub:active:not(:disabled){transform:translateY(0);}
        .lv-sub:disabled{opacity:.63;cursor:wait;}

        .lv-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.24);border-top-color:#fff;animation:lv-s .65s linear infinite;}
        @keyframes lv-s{to{transform:rotate(360deg);}}

        /* footer */
        .lv-form-foot{display:flex;align-items:center;gap:6px;margin-top:10px;font-family:'DM Sans',sans-serif;font-size:11px;color:#c4c2bb;}

        /* ══════════════════════════════════
           MOBILE — ≤ 1023px
        ══════════════════════════════════ */
        @media(max-width:1023px){
          .lv-root{padding:18px 14px;}

          .lv-shell{
            max-width:420px;
            grid-template-columns:1fr;
            border-radius:22px;
          }

          /* Hide desktop info, show mobile hero */
          .lv-info{display:none;}
          .lv-mobile-hero{
            display:flex;
            flex-direction:column;
            padding:18px 20px 16px;
            background:rgba(255,255,255,0.03);
            backdrop-filter:blur(10px) saturate(1.1);
            -webkit-backdrop-filter:blur(10px) saturate(1.1);
            border-bottom:1px solid rgba(255,255,255,0.08);
            border-radius:22px 22px 0 0;
            position:relative; overflow:hidden;
            color:#fff;
          }

          .lv-form-panel{
            border-radius:0 0 22px 22px;
            padding:24px 22px 22px;
          }
          .lv-form-card{max-width:none;}
          .lv-title{font-size:1.50rem;}
          .lv-fwrap{height:48px;}
          .lv-sub{height:50px;}
        }

        /* ══════════════════════════════════
           SMALL — ≤ 640px
        ══════════════════════════════════ */
        @media(max-width:640px){
          .lv-root{padding:14px 10px;}
          .lv-shell{border-radius:18px;max-width:100%;}
          .lv-mobile-hero{border-radius:18px 18px 0 0;padding:15px 16px 14px;}
          .lv-form-panel{border-radius:0 0 18px 18px;padding:20px 18px 20px;}
          .lv-fwrap{height:46px;}
          .lv-sub{height:48px;}
        }

        /* ══════════════════════════════════
           XS — ≤ 380px
        ══════════════════════════════════ */
        @media(max-width:380px){
          .lv-root{padding:10px 8px;}
          .lv-mobile-hero{padding:13px 14px 12px;}
          .lv-form-panel{padding:18px 15px 18px;}
        }

        /* ── Mobile hero internals ── */
        .lv-mh-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
        .lv-mh-brand{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
        .lv-mh-logobox{width:32px;height:32px;border-radius:10px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.16);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .lv-mh-appname{font-family:'Cormorant Garamond','Lora',Georgia,serif;font-size:1.05rem;font-weight:600;color:rgba(255,255,255,0.95);}
        .lv-mh-sub{font-size:11.5px;color:rgba(255,255,255,0.38);font-family:'DM Sans',sans-serif;line-height:1.5;margin-bottom:9px;}
        .lv-pills{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;}
        .lv-pills::-webkit-scrollbar{display:none;}
        .lv-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:99px;flex-shrink:0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);}
        .lv-pill-icon{color:rgba(255,255,255,0.45);display:flex;align-items:center;}
        .lv-pill-icon svg{width:11px;height:11px;}
        .lv-pill-label{font-size:10px;font-weight:500;color:rgba(255,255,255,0.55);font-family:'DM Sans',sans-serif;white-space:nowrap;}
        .lv-pill-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}

        @media(max-width:640px){.lv-mh-sub{display:none;}}
      `}</style>

      <motion.div
        className="lv-shell"
        initial={{ opacity: 1, y: 0, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
      >

        {/* ════════════════════════════════════════
            MOBILE HERO — visible only ≤ 1023px
        ════════════════════════════════════════ */}
        <div className="lv-mobile-hero" aria-hidden="false">
          <div aria-hidden="true" style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,175,90,0.10) 0%, transparent 70%)', pointerEvents:'none' }} />

          <div className="lv-mh-top">
            <button type="button" className="lv-back" onClick={onBackToLanding}>
              <MoveLeft size={11} /><span>Voltar</span>
            </button>
            <div className="lv-badge">
              <span className="lv-dot" />
              <span>Plataforma ativa</span>
            </div>
          </div>

          <div className="lv-mh-brand">
            <div className="lv-mh-logobox">
              <GraduationCap size={16} color="white" />
            </div>
            <span className="lv-mh-appname">{appName}</span>
          </div>

          <p className="lv-mh-sub">Secretaria, direção e professores em uma plataforma única.</p>

          <div className="lv-pills">
            {([
              { icon: <Zap />, label: 'Backend ativo', dot: '#d4af5a' },
              { icon: <ShieldCheck />, label: 'JWT seguro', dot: '#7ab4e8' },
              { icon: <Users />, label: 'Turmas', dot: '#7ab4e8' },
              { icon: <BarChart3 />, label: 'Relatórios', dot: '#d4af5a' },
            ]).map(({ icon, label, dot }, i) => (
              <div key={i} className="lv-pill">
                <span className="lv-pill-icon">{icon}</span>
                <span className="lv-pill-label">{label}</span>
                <span className="lv-pill-dot" style={{ background: dot, boxShadow: `0 0 4px ${dot}` }} />
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════
            DESKTOP INFO PANEL — visible only lg+
        ════════════════════════════════════════ */}
        <section className="lv-info" aria-label="Informações do sistema">
          <div aria-hidden="true" style={{ position:'absolute', top:'-20%', right:'-20%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
          <div aria-hidden="true" style={{ position:'absolute', bottom:'-14%', left:'-12%', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', pointerEvents:'none' }} />

          {/* Top: back + badge + branding */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.44 }}
            style={{ position:'relative', zIndex:1 }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <button type="button" className="lv-back" onClick={onBackToLanding}>
                <MoveLeft size={11} /><span>Voltar</span>
              </button>
              <div className="lv-badge">
                <span className="lv-dot" />
                <span>Plataforma ativa</span>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.16)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <GraduationCap size={20} color="white" />
              </div>
              <span className="font-DMSans">{appName}</span>
            </div>

            <h1 className="font-DMSans" style={{ fontSize:'2.1rem', fontWeight:600, lineHeight:1.22, letterSpacing:'-.01em', color:'rgba(255,255,255,0.95)', marginBottom:8 }}>
              Gestão Escolar<br />
              <span style={{ color:'rgba(255,255,255,0.40)' }}>Integrada</span>
            </h1>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.8, color:'rgba(255,255,255,0.40)', maxWidth:300 }}>
              Secretaria, direção e professores em uma plataforma única com controle de acesso por perfil.
            </p>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            className="lv-features"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.44 }}
            style={{ position:'relative', zIndex:1 }}
          >
            {[
              { icon: <FileText size={15} />, text: 'Turmas, alunos e matrículas com histórico completo' },
              { icon: <ShieldCheck size={15} />, text: 'Acesso segmentado por cargo e trilha de auditoria' },
              { icon: <GitMerge size={15} />, text: 'Relatórios e histórico escolar LGPD compliant' },
            ].map(({ icon, text }, i) => (
              <motion.div
                key={i}
                className="lv-feat"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + i * 0.08, duration: 0.34 }}
              >
                <div className="lv-feat-icon">{icon}</div>
                <p>{text}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Status grid */}
          <motion.div
            className="lv-stats"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.40 }}
            style={{ position:'relative', zIndex:1 }}
          >
            {([
              { icon: <Zap size={14} />, label: 'Criação de Provas', value: 'Automaticamente', detail: 'Criação de Questões', dot: '#d4af5a', glow: 'rgba(212,175,90,0.65)' },
              { icon: <ShieldCheck size={14} />, label: 'Correção de Provas', value: 'Lançamento de Notas', detail: 'Sistema de correção', dot: '#7ab4e8', glow: 'rgba(122,180,232,0.6)' },
            ]).map(({ icon, label, value, detail, dot, glow }, i) => (
              <div key={i} className="lv-stat">
                <div className="lv-stat-head">
                  <div className="lv-stat-icon">{icon}</div>
                  <span className="lv-stat-dot" style={{ background: dot, boxShadow: `0 0 5px ${glow}` }} />
                </div>
                <p className="lv-stat-label">{label}</p>
                <p className="lv-stat-value font-DMSans">{value}</p>
                <p className="lv-stat-detail">{detail}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
            FORM PANEL — both desktop and mobile
        ════════════════════════════════════════ */}
        <section className="lv-form-panel" aria-label="Formulário de login">
          <motion.div
            className="lv-form-card"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="lv-eyebrow">Acesso seguro</p>
            <h2 className="lv-title font-DMSans">Entrar no sistema</h2>
            <p className="lv-subtitle">Insira as credenciais cadastradas no sistema.</p>

            <form onSubmit={handleSubmit} noValidate>
              {/* E-mail */}
              <motion.div
                className="lv-field"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22, duration: 0.36 }}
              >
                <label className="lv-flabel">E-mail, login ou matrícula</label>
                <div className={`lv-fwrap ${focused === 'email' ? 'foc' : ''} ${fieldErrors.email ? 'err' : ''}`}>
                  <span className="lv-ficon"><Mail size={14} /></span>
                  <input
                    type="text"
                    value={email}
                    placeholder="E-mail, login ou matrícula"
                    onChange={e => { setEmail(e.target.value); setFieldErrors(c => ({ ...c, email: undefined })) }}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    aria-invalid={Boolean(fieldErrors.email) || undefined}
                  />
                </div>
                <FieldMessage hint="Digite o e-mail, login cadastrado ou matrícula do aluno." error={fieldErrors.email} />
              </motion.div>

              {/* Senha */}
              <motion.div
                className="lv-field"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28, duration: 0.36 }}
              >
                <label className="lv-flabel">Senha</label>
                <div className={`lv-fwrap ${focused === 'password' ? 'foc' : ''} ${fieldErrors.password ? 'err' : ''}`}>
                  <span className="lv-ficon"><KeyRound size={14} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder="Digite sua senha"
                    onChange={e => { setPassword(e.target.value); setFieldErrors(c => ({ ...c, password: undefined })) }}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    aria-invalid={Boolean(fieldErrors.password) || undefined}
                  />
                  <button type="button" className="lv-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <FieldMessage hint="Digite a senha da sua conta." error={fieldErrors.password} />
              </motion.div>

              {/* Erro geral */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    className="lv-err"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p>{errorMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botão */}
              <motion.button
                type="submit"
                className="lv-sub"
                disabled={isSubmitting}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, duration: 0.34 }}
                whileTap={{ scale: 0.984 }}
              >
                {isSubmitting
                  ? <><span>Entrando…</span><span className="lv-spin" /></>
                  : <><span>Entrar no sistema</span><ArrowRight size={15} /></>}
              </motion.button>
            </form>

            <motion.div
              className="lv-form-foot"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42, duration: 0.34 }}
            >
              <ShieldCheck size={11} style={{ color: '#d4d2ca', flexShrink: 0 }} />
              <span>Sessão protegida por JWT com controle de cargo.</span>
            </motion.div>
          </motion.div>
        </section>

      </motion.div>
    </div>
  )
}
