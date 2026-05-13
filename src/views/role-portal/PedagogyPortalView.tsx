import { BarChart3 } from 'lucide-react'

import {
  LockedSchoolField,
  SectionShell,
} from '../../components/role-portal/portal-components'
import { PedagogicalDashboard } from './PedagogicalDashboard'
import type { RolePortalScreenModel } from './screen-model'

export function PedagogyPortalView({ model }: { model: RolePortalScreenModel }) {
  const {
    currentUser,
    classes,
    students,
    teachers,
    lessonRecords,
    evaluationsData,
    getSchoolName,
  } = model

  const linkedSchoolName = getSchoolName(currentUser.schoolId)
  const dashboardProps = {
    classes,
    students,
    teachers,
    lessonRecords,
    evaluationsData,
  }

  return (
    <SectionShell
      label="Pedagogico"
      title="Dashboard Pedagogico"
      description={`Escola vinculada: ${linkedSchoolName}`}
      icon={<BarChart3 size={20} />}
      headerActions={<LockedSchoolField value={linkedSchoolName} />}
    >
      <PedagogicalDashboard {...dashboardProps} />
    </SectionShell>
  )
}
