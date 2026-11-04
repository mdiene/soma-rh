import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Check, FileText, MessageCircle, X } from 'lucide-react'
import { useState } from 'react'
import { supabase, unwrap } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { date, fcfa } from '../lib/format'
import { whatsappLink } from '../lib/whatsapp'
import { Badge, Button, ErrorNote, Modal, PageHeader, SelectField, Spinner, TextField } from '../components/ui'
import { AttestationModal, type AttestationKind } from '../components/AttestationModal'
import { REQUEST_TYPES, type EmployeeRequest } from '../lib/requests'

const db = supabase as unknown as SupabaseClient

/** Demandes des salariés (attestations, acomptes, corrections…) : traitement par le service RH. */
export default function RequestsPage() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const [status, setStatus] = useState('Ouverte')
  const [target, setTarget] = useState<{ r: EmployeeRequest; decision: 'Approuvée' | 'Rejetée' } | null>(null)
  const [note, setNote] = useState('')
  const [att, setAtt] = useState<{ employeeId: string; kind: AttestationKind } | null>(null)

  const q = useQuery({
    queryKey: ['employee_requests', status],
    queryFn: async () => {
      let req = db.from('employee_requests')
        .select('*, employee:employees(employee_number, first_name, last_name, phone_personal, phone_work)')
        .order('created_at', { ascending: false }).limit(200)
      if (status) req = req.eq('status', status)
      return unwrap(await req) as EmployeeRequest[]
    },
  })
  const decide = useMutation({
    mutationFn: async () => unwrap(await db.from('employee_requests').update({
      status: target!.decision, decision_note: note.trim() || null, decided_by: session!.user.id, decided_at: new Date().toISOString(),
    }).eq('id', target!.r.id).eq('status', 'Ouverte')),
    onSuccess: () => { setTarget(null); setNote(''); qc.invalidateQueries({ queryKey: ['employee_requests'] }) },
  })

  return (
    <>
      <PageHeader title="Demandes des salariés" description="Attestations, acomptes, corrections de présence et autres demandes à traiter." />
      <div className="mb-3 max-w-48">
        <SelectField label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Ouverte">À traiter</option><option value="Approuvée">Approuvées</option>
          <option value="Rejetée">Rejetées</option><option value="Annulée">Annulées</option><option value="">Toutes</option>
        </SelectField>
      </div>
      <ErrorNote error={q.error} />
      {q.isLoading ? <Spinner /> : (q.data ?? []).length === 0 ? <p className="panel px-4 py-6 text-sm text-ink-muted">Aucune demande.</p> : (
        <ul className="panel divide-y divide-line/70">
          {q.data!.map((r) => {
            const e = r.employee
            const name = e ? `${e.first_name} ${e.last_name}` : '—'
            const wa = r.status !== 'Ouverte' && r.status !== 'Annulée'
              ? whatsappLink(e?.phone_personal || e?.phone_work, `Bonjour ${e?.first_name ?? ''}, votre demande « ${REQUEST_TYPES[r.request_type] ?? r.request_type} » est ${r.status === 'Approuvée' ? 'acceptée' : 'refusée'}.${r.decision_note ? ` ${r.decision_note}` : ''}`)
              : null
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-56">
                  <p className="font-medium">{REQUEST_TYPES[r.request_type] ?? r.request_type}</p>
                  <p className="text-xs text-ink-muted">{e?.employee_number} · {name} · {date(r.created_at.slice(0, 10))}</p>
                </div>
                <div className="flex-1 text-ink-soft">
                  {r.amount ? <span className="tabular-nums">{fcfa(r.amount)} F</span> : null}
                  {r.target_date ? <span> · jour concerné : {date(r.target_date)}</span> : null}
                  {r.message ? <p className="text-xs">{r.message}</p> : null}
                  {r.decision_note ? <p className="text-xs">Réponse : {r.decision_note}</p> : null}
                </div>
                <Badge value={r.status} />
                {r.status === 'Ouverte' && (
                  <>
                    <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => { setNote(''); setTarget({ r, decision: 'Approuvée' }) }}>Approuver</Button>
                    <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => { setNote(''); setTarget({ r, decision: 'Rejetée' }) }}>Rejeter</Button>
                  </>
                )}
                {r.status === 'Approuvée' && (r.request_type === 'attestation_travail' || r.request_type === 'attestation_salaire') && (
                  <Button size="sm" icon={<FileText className="h-4 w-4" />} onClick={() => setAtt({ employeeId: r.employee_id, kind: r.request_type as AttestationKind })}>Attestation</Button>
                )}
                {wa && <a className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper hover:text-ink" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
              </li>
            )
          })}
        </ul>
      )}
      <AttestationModal employeeId={att?.employeeId ?? null} kind={att?.kind ?? 'attestation_travail'} onClose={() => setAtt(null)} />
      <Modal open={!!target} onClose={() => setTarget(null)} title={target?.decision === 'Approuvée' ? 'Approuver la demande' : 'Rejeter la demande'}
        footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Revenir</Button>
          <Button variant={target?.decision === 'Rejetée' ? 'danger' : 'primary'} loading={decide.isPending} onClick={() => decide.mutate()}>Confirmer</Button></>}>
        <TextField label="Réponse au salarié (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} />
        {target?.r.request_type === 'acompte' && target.decision === 'Approuvée' && (
          <p className="mt-3 text-xs text-ink-soft">L’acompte n’est pas encore retenu automatiquement en paie : saisissez-le comme retenue du mois (le prêt et l’échéancier viennent au lot 5).</p>
        )}
        <div className="mt-3"><ErrorNote error={decide.error} /></div>
      </Modal>
    </>
  )
}
