import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FilePlus2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase'
import { date, fcfa, monthLabel, num } from '../lib/format'
import { Badge, Button, ErrorNote, Modal, PageHeader, SelectField, Spinner, TextField } from '../components/ui'
import { REQUEST_TYPES, type EmployeeRequest } from '../lib/requests'

const db = supabase as unknown as SupabaseClient
const today = () => new Date().toISOString().slice(0, 10)

/** Mon espace : bulletin récent, soldes de congés, planning à venir et demandes du salarié. */
export default function MySpacePage() {
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ['my_employee_id'], queryFn: async () => unwrap(await supabase.rpc('my_employee_id')) as string | null })
  const meId = me.data ?? null
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ request_type: 'attestation_travail', amount: '', target_date: '', message: '' })

  const emp = useQuery({
    queryKey: ['my_employee', meId], enabled: !!meId,
    queryFn: async () => unwrap(await supabase.from('employees').select('first_name, last_name, employee_number').eq('id', meId!).maybeSingle()),
  })
  const slip = useQuery({
    queryKey: ['my_last_slip', meId], enabled: !!meId,
    queryFn: async () => unwrap(await supabase.from('salary_slips').select('id, period_start, net_pay, status').eq('employee_id', meId!).eq('status', 'Validé').order('period_start', { ascending: false }).limit(1)),
  })
  const balances = useQuery({
    queryKey: ['my_balances', meId], enabled: !!meId,
    queryFn: async () => unwrap(await supabase.from('v_leave_balances').select('leave_type_name, balance').eq('employee_id', meId!)),
  })
  const planning = useQuery({
    queryKey: ['my_planning', meId], enabled: !!meId,
    queryFn: async () => unwrap(await db.from('shift_assignments').select('work_date, shift_code').eq('employee_id', meId!).gte('work_date', today()).order('work_date').limit(7)) as { work_date: string; shift_code: string }[],
  })
  const requests = useQuery({
    queryKey: ['my_requests', meId], enabled: !!meId,
    queryFn: async () => unwrap(await db.from('employee_requests').select('*').eq('employee_id', meId!).order('created_at', { ascending: false }).limit(30)) as EmployeeRequest[],
  })

  const create = useMutation({
    mutationFn: async () => unwrap(await db.from('employee_requests').insert({
      employee_id: meId, request_type: f.request_type, amount: f.amount ? Number(f.amount.replace(',', '.')) : null,
      target_date: f.target_date || null, message: f.message.trim() || null,
    })),
    onSuccess: () => { setOpen(false); setF({ request_type: 'attestation_travail', amount: '', target_date: '', message: '' }); qc.invalidateQueries({ queryKey: ['my_requests'] }) },
  })
  const cancel = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.rpc('cancel_my_request' as never, { p_request_id: id } as never)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my_requests'] }),
  })

  if (me.isLoading) return <Spinner />
  if (!meId) return <p className="panel px-4 py-6 text-sm text-ink-soft">Votre compte n’est pas encore relié à une fiche salarié. Demandez au service RH de le rattacher.</p>

  const last = slip.data?.[0]
  const needsAmount = f.request_type === 'acompte'
  const invalid = needsAmount && !(Number(f.amount.replace(',', '.')) > 0)

  return (
    <>
      <PageHeader title={`Bonjour ${emp.data?.first_name ?? ''}`} description="Vos bulletins, congés, planning et demandes."
        actions={<Button variant="primary" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setOpen(true)}>Nouvelle demande</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <section className="panel p-4">
          <h2 className="text-base">Dernier bulletin</h2>
          {slip.isLoading ? <Spinner /> : last ? (
            <p className="mt-2 text-sm">{monthLabel(last.period_start)} · net <strong className="tabular-nums">{fcfa(last.net_pay)} F</strong><br />
              <Link className="text-river hover:underline" to={`/bulletins/${last.id}`}>Ouvrir le bulletin</Link> · <Link className="text-river hover:underline" to="/mes-bulletins">Tous mes bulletins</Link></p>
          ) : <p className="mt-2 text-sm text-ink-muted">Aucun bulletin validé pour l’instant.</p>}
        </section>
        <section className="panel p-4">
          <h2 className="text-base">Congés</h2>
          {(balances.data ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-muted">Aucun solde.</p> : (
            <ul className="mt-2 space-y-1 text-sm">{(balances.data ?? []).map((b) => <li key={b.leave_type_name}>{b.leave_type_name} : <strong className="tabular-nums">{num(b.balance, 1)} j</strong></li>)}</ul>
          )}
          <Link className="mt-2 inline-block text-sm text-river hover:underline" to="/conges">Demander un congé</Link>
        </section>
        <section className="panel p-4">
          <h2 className="text-base">Mon planning</h2>
          {(planning.data ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-muted">Aucun poste planifié à venir.</p> : (
            <ul className="mt-2 space-y-0.5 text-sm tabular-nums">{planning.data!.map((p) => <li key={p.work_date}>{date(p.work_date)} · <strong>{p.shift_code}</strong></li>)}</ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="border-b border-line px-4 py-3"><h2 className="text-base">Mes demandes</h2></div>
        <ErrorNote error={requests.error || cancel.error} />
        {(requests.data ?? []).length === 0 ? <p className="px-4 py-6 text-sm text-ink-muted">Aucune demande.</p> : (
          <ul className="divide-y divide-line/70">
            {requests.data!.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-52 font-medium">{REQUEST_TYPES[r.request_type] ?? r.request_type}</span>
                <span className="text-ink-soft">{date(r.created_at.slice(0, 10))}{r.amount ? ` · ${fcfa(r.amount)} F` : ''}</span>
                <Badge value={r.status} />
                {r.decision_note && <span className="text-xs text-ink-soft">« {r.decision_note} »</span>}
                {r.status === 'Ouverte' && <Button size="sm" variant="ghost" className="ml-auto" loading={cancel.isPending} onClick={() => cancel.mutate(r.id)}>Annuler</Button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle demande"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="primary" loading={create.isPending} disabled={invalid} onClick={() => create.mutate()}>Envoyer</Button></>}>
        <SelectField label="Type de demande" value={f.request_type} onChange={(e) => setF({ ...f, request_type: e.target.value })}>
          {Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectField>
        {needsAmount && <TextField className="mt-3" label="Montant demandé (F CFA)" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />}
        {f.request_type === 'correction_presence' && <TextField className="mt-3" label="Date concernée" type="date" value={f.target_date} onChange={(e) => setF({ ...f, target_date: e.target.value })} />}
        <TextField className="mt-3" label="Précisions (facultatif)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
        <div className="mt-3"><ErrorNote error={create.error} /></div>
      </Modal>
    </>
  )
}
