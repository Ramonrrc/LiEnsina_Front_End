import { useState, useEffect, useRef, type ReactNode } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  FileCheck2,
  LockKeyhole,
  Menu,
  ScanLine,
  ShieldCheck,
  X,
  GraduationCap,
  Users,
  Zap,
  ChevronDown,
  Flag,
  BookOpen,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const appName = 'LiEnsina'

const IMAGES = {
  biblioteca: '/biblioteca.jpg',
  gestao: '/gestao.jpg',
  dashboard: '/dashboard.jpg',
  conversa: '/conversa.jpg',
}

const navLinks = [
  { label: 'Simulados', href: '#simulados' },
  { label: 'Secretaria', href: '#secretaria' },
  { label: 'Relatórios', href: '#relatorios' },
  { label: 'Sobre', href: '#sobre' },
]

// ─── Hook: reveal on scroll ───────────────────────────────────────────────────

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[.14em] uppercase text-stone-400 font-['DM_Sans']">
      {children}
    </p>
  )
}

function FeatureCard({
  icon, title, description, delay = 0,
}: {
  icon: ReactNode; title: string; description: string; delay?: number
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className="group relative bg-white rounded-2xl border border-stone-300 p-7 shadow-sm hover:shadow-lg hover:border-stone-400 transition-all duration-300 overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms, box-shadow 0.25s ease, border-color 0.25s ease`,
      }}
    >
      <div className="w-11 h-11 rounded-xl bg-stone-900 flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-['Lora'] text-lg font-semibold text-stone-900 mb-2">{title}</h3>
      <p className="font-['DM_Sans'] text-stone-500 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function InsightCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center bg-white border border-stone-300 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-stone-400 transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.55s ease, transform 0.55s ease, box-shadow 0.25s ease',
      }}
    >
      <div className="w-12 h-12 rounded-xl bg-stone-900 flex items-center justify-center text-white mb-4">
        {icon}
      </div>
      <strong className="font-['Lora'] text-3xl font-semibold text-stone-900 mb-1">{value}</strong>
      <span className="font-['DM_Sans'] text-stone-500 text-sm">{label}</span>
    </div>
  )
}

function MetricCard({
  label, value, sub, icon,
}: {
  label: string; value: string; sub: string; icon: ReactNode
}) {
  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-5 flex flex-col gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-px hover:border-stone-400 transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-stone-400 font-['DM_Sans']">{label}</span>
        <span className="w-8 h-8 rounded-md bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-600 flex-shrink-0">
          {icon}
        </span>
      </div>
      <strong className="font-['Lora'] text-[32px] font-semibold text-stone-900 leading-none">{value}</strong>
      <span className="font-['DM_Sans'] text-[12px] text-stone-400">{sub}</span>
    </div>
  )
}

function OperationBadge({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl px-5 py-3.5 border border-stone-300 text-stone-700 text-sm font-medium font-['DM_Sans'] hover:border-stone-400 hover:shadow-sm transition-all duration-200">
      <ShieldCheck size={15} className="text-stone-500 shrink-0" />
      {children}
    </div>
  )
}

function FeatureRow({
  eyebrow, title, description, image, imageAlt, reverse = false,
}: {
  eyebrow: string; title: string; description: string
  image: string; imageAlt: string; reverse?: boolean
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-14 lg:gap-20 items-center`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(36px)',
        transition: 'opacity 0.65s ease, transform 0.65s ease',
      }}
    >
      <div className="flex-1 space-y-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="font-['Lora'] text-3xl lg:text-4xl font-semibold text-stone-900 leading-tight">
          {title}
        </h3>
        <p className="font-['DM_Sans'] text-stone-500 text-lg leading-relaxed">{description}</p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 font-['DM_Sans'] text-stone-900 font-semibold text-sm border-b border-stone-400 hover:border-stone-900 pb-0.5 transition-all duration-200 hover:gap-3"
        >
          Conhecer módulo <ArrowRight size={15} />
        </a>
      </div>
      <div className="flex-1 w-full">
        <div className="relative rounded-3xl overflow-hidden border border-stone-300 shadow-lg aspect-[4/3] group hover:border-stone-400 transition-colors duration-300">
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/10 to-transparent" />
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-['DM_Sans'] antialiased">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-stone-300 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            scrolled ? 'bg-stone-900' : 'bg-white/15 border border-white/20'
          }`}>
            <GraduationCap size={17} className="text-white" />
          </div>
            <span className={`font-['Lora'] font-semibold text-xl transition-colors ${
            scrolled ? 'text-stone-900' : 'text-white'
          }`}>
            {appName}
          </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a  
              key={l.href}
              href={l.href}
              className={`text-[13px] font-semibold py-1 px-2 rounded-full tracking-wide transition-colors ${
                scrolled
                  ? 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

          <a
            href="/login"
            className="hidden md:inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-700 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-colors duration-200"
          >
            Entrar <ArrowRight size={14} />
          </a>

          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-stone-300 hover:bg-stone-100 hover:border-stone-400 transition-colors text-stone-600"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-stone-300 px-6 py-5 flex flex-col gap-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-stone-700 font-semibold text-sm"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="bg-stone-900 text-white font-semibold text-center py-3 rounded-lg text-sm"
            >
              Entrar no sistema
            </a>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-stone-900">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-stone-700/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-stone-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-stone-300 text-[11px] font-semibold tracking-[.14em] uppercase mb-7">
              <Zap size={11} /> Sistema Educacional Inteligente
            </div>
            <h1 className="font-['Lora'] text-6xl lg:text-7xl font-semibold text-white leading-[1.05] tracking-tight mb-6">
              Li<span className="text-stone-400">Ensina</span>
            </h1>
            <p className="font-['DM_Sans'] text-stone-400 text-xl leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              Gestão escolar com secretaria central, diário do professor, simulados com leitura automática de gabaritos e diagnósticos pedagógicos para decisão rápida.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-14">
              <a
                href="/login"
                className="inline-flex items-center gap-2 bg-white hover:bg-stone-100 text-stone-900 font-semibold px-8 py-4 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Acessar painel <ArrowRight size={16} />
              </a>
              <a
                href="#simulados"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                Ver módulos <ChevronDown size={16} />
              </a>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-8">
              {[
                { value: 'TRI', label: 'Diagnóstico pedagógico' },
                { value: 'QR Code', label: 'Gabaritos individualizados' },
                { value: 'LGPD', label: 'Auditoria por cargo' },
              ].map((s) => (
                <div key={s.value} className="flex items-center gap-2.5">
                  <span className="font-['Lora'] text-white font-semibold text-lg">{s.value}</span>
                  <span className="font-['DM_Sans'] text-stone-500 text-sm">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full max-w-xl lg:max-w-none">
            <div className="relative">
              <div className="absolute -inset-3 bg-white/5 rounded-3xl blur-xl" />
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <img src={IMAGES.dashboard} alt="Dashboard LiEnsina" className="w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone-300 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center items-center gap-8 text-stone-400 text-[13px] font-semibold tracking-wide">
          {['Secretarias de Educação', 'Escolas Públicas', 'Redes Privadas', 'Municípios do Brasil'].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── METRICS ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Eventos" value="Agenda" sub="Criados pela equipe escolar" icon={<Flag size={16} />} />
          <MetricCard label="Feriados" value="Brasil" sub="Sincronizados automaticamente" icon={<ShieldCheck size={16} />} />
          <MetricCard label="Simulados" value="TRI" sub="Diagnóstico pedagógico" icon={<BookOpen size={16} />} />
          <MetricCard label="Relatórios" value="BNCC" sub="Mapa de lacunas por habilidade" icon={<BarChart3 size={16} />} />
        </div>
      </section>

      {/* ── FEATURE ROWS ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-24 space-y-28">
        <FeatureRow
          eyebrow="Banco de questões"
          title="Biblioteca completa alinhada à BNCC"
          description="Questões organizadas por descritores, disciplinas e nível de dificuldade. Professores montam provas em minutos com questões locais e globais, garantindo alinhamento curricular."
          image={IMAGES.biblioteca}
          imageAlt="Biblioteca de questões LiEnsina"
        />
        <FeatureRow
          eyebrow="Gestão administrativa"
          title="Secretaria central para toda a rede"
          description="Escolas, matrículas, turmas, calendário e documentos em uma visão única. Gestão de usuários por cargo, enturmação, transferências e auditoria completa de ações."
          image={IMAGES.gestao}
          imageAlt="Gestão escolar"
          reverse
        />
        <FeatureRow
          eyebrow="Relatórios e diagnóstico"
          title="Indicadores que mostram onde intervir"
          description="Diagnóstico TRI com 4 níveis de proficiência, mapa de lacunas por habilidade e taxa de erro por descritor. Dados que embasam decisões pedagógicas rápidas e precisas."
          image={IMAGES.dashboard}
          imageAlt="Dashboard de relatórios"
        />
        <FeatureRow
          eyebrow="Família e escola"
          title="Plataforma para pais, mães e responsáveis"
          description="Acompanhamento em tempo real do desempenho escolar, comunicados, boletins e histórico disponíveis para toda a comunidade escolar."
          image={IMAGES.conversa}
          imageAlt="Comunicação escola família"
          reverse
        />
      </section>

      {/* ── SIMULADOS ────────────────────────────────────────────────── */}
      <section id="simulados" className="bg-white border-y border-stone-300 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <Eyebrow>Simulados e provas</Eyebrow>
            <h2 className="font-['Lora'] text-4xl lg:text-5xl font-semibold text-stone-900 leading-tight mt-3">
              Da montagem da prova<br />ao boletim atualizado.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <FeatureCard
              icon={<BookOpenCheck size={18} />}
              title="Banco de questões"
              description="Questões locais e globais com descritores BNCC, disciplinas e dificuldade."
              delay={0}
            />
            <FeatureCard
              icon={<FileCheck2 size={18} />}
              title="Gabarito inteligente"
              description="Folhas de resposta com aluno, turma e QR Code para reduzir trocas e erros."
              delay={80}
            />
            <FeatureCard
              icon={<ScanLine size={18} />}
              title="Captura em lote"
              description="Upload de fotos ou digitalizações da turma para leitura óptica assistida."
              delay={160}
            />
            <FeatureCard
              icon={<ClipboardCheck size={18} />}
              title="Nota automática"
              description="Resultado consolidado no diário, com pendências e rasuras sinalizadas."
              delay={240}
            />
          </div>
        </div>
      </section>

      {/* ── SECRETARIA ───────────────────────────────────────────────── */}
      <section id="secretaria" className="bg-stone-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1">
              <p className="text-[11px] font-semibold tracking-[.14em] uppercase text-stone-500 font-['DM_Sans'] mb-4">
                Central da secretaria
              </p>
              <h2 className="font-['Lora'] text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
                Escolas, matrículas e turmas em uma visão única.
              </h2>
              <p className="font-['DM_Sans'] text-stone-400 text-lg leading-relaxed">
                Calendário, documentos, merenda escolar, transporte e gestão global de usuários por cargo — tudo integrado, com trilha completa de auditoria.
              </p>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {[
                'Gestão global de usuários por cargo',
                'Enturmação e transferências',
                'Boletins, declarações e históricos',
                'Calendário, aulas e prazos',
                'Merenda escolar e transporte',
                'Auditoria completa de ações',
              ].map((item) => (
                <OperationBadge key={item}>{item}</OperationBadge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RELATORIOS ───────────────────────────────────────────────── */}
      <section id="relatorios" className="bg-stone-50 border-b border-stone-300 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <Eyebrow>Direção e coordenação</Eyebrow>
            <h2 className="font-['Lora'] text-4xl lg:text-5xl font-semibold text-stone-900 leading-tight mt-3">
              Indicadores que mostram<br />onde intervir.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <InsightCard
              icon={<BarChart3 size={22} />}
              value="4 níveis"
              label="Abaixo do básico, básico, adequado e avançado"
            />
            <InsightCard
              icon={<ClipboardCheck size={22} />}
              value="BNCC"
              label="Mapa de lacunas por habilidade e taxa de erro"
            />
            <InsightCard
              icon={<LockKeyhole size={22} />}
              value="LGPD"
              label="Acesso limitado ao cargo e trilha de auditoria"
            />
          </div>
        </div>
      </section>

      {/* ── SOBRE ────────────────────────────────────────────────────── */}
      <section id="sobre" className="bg-white border-b border-stone-300 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden aspect-square border border-stone-300 shadow-sm hover:border-stone-400 transition-colors duration-200">
                <img src={IMAGES.gestao} alt="Equipe LiEnsina" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl overflow-hidden aspect-square border border-stone-300 shadow-sm mt-8 hover:border-stone-400 transition-colors duration-200">
                <img src={IMAGES.conversa} alt="Colaboração" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <Eyebrow>Nossa missão</Eyebrow>
              <h2 className="font-['Lora'] text-4xl font-semibold text-stone-900 leading-tight">
                Tecnologia a serviço da aprendizagem real.
              </h2>
              <p className="font-['DM_Sans'] text-stone-500 text-lg leading-relaxed">
                O LiEnsina nasceu para simplificar a rotina de diretores, coordenadores, professores e secretarias, entregando dados acionáveis e eliminando trabalho manual.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { icon: <Users size={16} />, label: 'Toda a rede conectada' },
                  { icon: <GraduationCap size={16} />, label: 'Foco no aprendizado' },
                  { icon: <ShieldCheck size={16} />, label: 'Conformidade LGPD' },
                  { icon: <Zap size={16} />, label: 'Decisões em tempo real' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-stone-700 font-semibold text-[13px] font-['DM_Sans']">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-600 shrink-0 hover:border-stone-400 transition-colors">
                      {item.icon}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative bg-stone-900 py-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold tracking-[.14em] uppercase text-stone-500 font-['DM_Sans'] mb-4">
            Comece agora
          </p>
          <h2 className="font-['Lora'] text-4xl lg:text-5xl font-semibold text-white mb-6 leading-tight">
            Pronto para transformar<br />sua escola?
          </h2>
          <p className="font-['DM_Sans'] text-stone-400 text-xl mb-10">
            Acesse o painel e comece agora. Sem complicação.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-3 bg-white hover:bg-stone-100 text-stone-900 font-semibold px-10 py-4 rounded-lg text-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
          >
            Acessar o LiEnsina <ArrowRight size={17} />
          </a>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-stone-950 border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-800 border border-white/10 flex items-center justify-center">
              <GraduationCap size={15} className="text-white" />
            </div>
            <span className="font-['Lora'] font-semibold text-lg text-white">{appName}</span>
          </div>
          <span className="font-['DM_Sans'] text-stone-500 text-[13px] text-center">
            LiEnsina — Sistema Educacional Inteligente para Escolas
          </span>
          <a
            href="/login"
            className="font-['DM_Sans'] text-[13px] text-stone-400 font-semibold hover:text-white transition-colors flex items-center gap-1.5"
          >
            Entrar no sistema <ArrowRight size={13} />
          </a>
        </div>
      </footer>

    </div>
  )
}
