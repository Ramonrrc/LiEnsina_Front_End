import { CheckCircle2, Layers, School, Users } from 'lucide-react'

import {
  AlertBanner,
  CompactProgressMetric,
  InfoCard,
  SectionShell,
} from '../../components/role-portal/portal-components'
import type { RolePortalScreenModel } from './screen-model'

export function RolePortalFallbackView({ model }: { model: RolePortalScreenModel }) {
  const { currentRole, profile, schools, classes, students } = model

  return (
    <SectionShell
      label="Perfil"
      title={currentRole?.name ?? 'Visão do perfil'}
      description="Esta área respeita o escopo de dados permitido para o cargo logado."
      icon={<CheckCircle2 size={20} />}
    >
      <section className="grid gap-3 md:grid-cols-3">
        <InfoCard
          label="Escolas"
          value={schools.length}
          detail="Unidades visíveis"
          icon={<School size={18} />}
          delay={0}
        />
        <InfoCard
          label="Turmas"
          value={classes.length}
          detail="Turmas no escopo"
          icon={<Layers size={18} />}
          delay={60}
        />
        <InfoCard
          label="Alunos"
          value={students.length}
          detail="Alunos permitidos"
          icon={<Users size={18} />}
          delay={120}
        />
      </section>
      <AlertBanner
        message={`Visão em evolução para o perfil ${profile}.`}
        tone="amber"
      />
    </SectionShell>
  )
}
