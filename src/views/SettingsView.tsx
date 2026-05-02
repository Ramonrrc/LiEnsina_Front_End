import { FormEvent, useState } from 'react'
import { Mail, Phone, Save, Settings, ShieldCheck, UserRound } from 'lucide-react'

import type { Role, UserAccount } from '../types'

interface SettingsViewProps {
  currentUser: UserAccount
  role: Role | null
  onSave: (draft: Partial<UserAccount>) => Promise<void>
}

export default function SettingsView({ currentUser, role, onSave }: SettingsViewProps) {
  const [draft, setDraft] = useState<Partial<UserAccount>>({ name: currentUser.name, phone: currentUser.phone, avatarUrl: currentUser.avatarUrl ?? '' })
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await onSave(draft) }

  return (
    <div className="page-stack">
      <section className="page-hero compact"><div><p className="eyebrow">Minha conta</p><h1>Perfil e preferencias</h1><span>Dados do usuario autenticado, cargo ativo e permissoes liberadas.</span></div><div className="hero-badge"><Settings size={20} />Conta institucional</div></section>
      <section className="settings-grid"><form className="form-panel" onSubmit={handleSubmit}><div className="panel-heading"><div><p className="eyebrow">Dados pessoais</p><h2>{currentUser.name}</h2></div><UserRound size={21} /></div><div className="form-grid"><label className="field-label wide">Nome<input value={draft.name ?? ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label><label className="field-label wide">Telefone<input value={draft.phone ?? ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label><label className="field-label wide">URL do avatar<input value={draft.avatarUrl ?? ''} onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })} placeholder="https://..." /></label></div><div className="form-actions"><button className="primary-button" type="submit"><Save size={17} />Salvar perfil</button></div></form><aside className="summary-panel profile-panel"><div className="profile-avatar">{currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt={currentUser.name} /> : currentUser.name.slice(0, 2).toUpperCase()}</div><h2>{currentUser.name}</h2><p>{role?.name ?? 'Cargo nao localizado'}</p><div className="summary-list"><span><Mail size={16} />{currentUser.email}</span><span><Phone size={16} />{currentUser.phone || 'Telefone nao informado'}</span><span><ShieldCheck size={16} />{role?.permissions.length ?? 0} permissoes ativas</span></div></aside></section>
      <section className="table-panel"><div className="panel-heading"><div><p className="eyebrow">Permissoes do cargo</p><h2>{role?.name ?? 'Cargo'}</h2></div></div><div className="tag-row large">{(role?.permissions ?? []).map((permission) => <span key={permission}>{permission}</span>)}</div></section>
    </div>
  )
}
