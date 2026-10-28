import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { ArrowRightLeft, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { supabase, unwrap, type Tables } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useEmployees } from '../lib/queries'
import { currentPeriod, date, monthBounds, monthLabel, num } from '../lib/format'
import { DataTable } from '../components/DataTable'
import { Button, ErrorNote, Modal, PageHeader, Section, SelectField, Spinner, TextField } from '../components/ui'

type Att = Tables<'attendance'> & { employee: { employee_number: string; first_name: string; last_name: string } | null }
const col = createColumnHelper<Att>()

export default function AttendancePage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [open, setOpen] = useState(false)
  const { can } = useAuth()
  const qc = useQueryClient()
  const { start, end } = monthBounds(period)

  const q = useQuery({
    queryKey: ['attendance', period],
    queryFn: async () => unwrap(await supabase.from('attendance')
      .select('*, employee:employees(employee_number, first_name, last_name)')
      .gte('attendance_date', start).lte('attendance_date', end).order('attendance_date')) as Att[],
  })
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('attendance').delete().eq('id', id).select()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', period] }),
  })
  const sync = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('sync_attendance_to_payroll_inputs', { p_period: period })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll_inputs'] }),
  })

  const summary = useMemo(() => {
    const m = new Map<string, { name: string; absence: number; sick: number; hs: number; days: number }>()
    for (const a of q.data ?? []) {
      const k = a.employee_id
      const s = m.get(k) ?? { name: a.employee ? `${a.employee.employee_number} — ${a.employee.first_name} ${a.employee.last_name}` : k, absence: 0, sick: 0, hs: 0, days: 0 }
      if (a.status === 'Maladie') s.sick += Number(a.absence_hours)
      else if (a.status === 'Absent' || a.status === 'Demi-journée') s.absence += Number(a.absence_hours)
      s.hs += Number(a.overtime_15) + Number(a.overtime_40) + Number(a.overtime_60) + Number(a.overtime_100)
      s.days += 1
      m.set(k, s)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [q.data])

  const columns = [
    col.accessor('attendance_date', { header: 'Date', cell: (c) => date(c.getValue()) }),
    col.accessor((a) => a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '', { id: 'emp', header: 'Salarié' }),
    col.accessor('status', { header: 'Statut' }),
    col.accessor('absence_hours', { header: 'H. absence', meta: { align: 'right' }, cell: (c) => num(c.getValue(), 2) }),
    col.accessor((a) => Number(a.overtime_15) + Number(a.overtime_40) + Number(a.overtime_60) + Number(a.overtime_100), { id: 'hs', header: 'H. sup.', meta: { align: 'right' }, cell: (c) => num(c.getValue(), 2) }),
    col.accessor('notes', { header: 'Observation' }),
    col.display({ id: 'actions', header: '', cell: ({ row }) => can('rh') && (
      <button aria-label="Supprimer" className="rounded p-1 text-ink-muted hover:bg-signal-light hover:text-signal" onClick={() => remove.mutate(row.original.id)}><Trash2 className="h-4 w-4" /></button>
    ) }),
  ]

  return (
    <>
      <PageHeader
        title="Présences"
        description="Saisissez les absences, arrêts maladie et heures supplémentaires. Reportez ensuite le cumul du mois dans les variables de paie."
        actions={<>
          <TextField label="Mois" type="month" value={period.slice(0, 7)} onChange={(e) => setPeriod(`${e.target.value}-01`)} className="w-44" />
          {can('paie') && <Button icon={<ArrowRightLeft className="h-4 w-4" />} loading={sync.isPending} onClick={() => sync.mutate()}>Reporter dans la paie</Button>}
          {can('rh') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Saisir une présence</Button>}
        </>}
      />
      <ErrorNote error={q.error || remove.error || sync.error} />
      {sync.isSuccess && <p className="mb-4 rounded border border-river/30 bg-river-light px-3 py-2 text-sm text-river-dark">{sync.data as number} salarié(s) mis à jour dans les variables de {monthLabel(period)}.</p>}
      {q.isLoading ? <Spinner /> : (
        <div className="space-y-6">
          {summary.length > 0 && (
            <Section title={`Cumul de ${monthLabel(period)}`}>
              <table className="w-full text-sm">
                <thead><tr className="table-head"><th className="px-2 py-1.5">Salarié</th><th className="px-2 py-1.5 text-right">Saisies</th><th className="px-2 py-1.5 text-right">Heures d'absence</th><th className="px-2 py-1.5 text-right">Heures maladie</th><th className="px-2 py-1.5 text-right">Heures sup.</th></tr></thead>
                <tbody>{summary.map((s) => (
                  <tr key={s.name} className="border-b border-line/70"><td className="px-2 py-1.5">{s.name}</td><td className="px-2 py-1.5 text-right">{s.days}</td><td className="px-2 py-1.5 text-right">{num(s.absence)}</td><td className="px-2 py-1.5 text-right">{num(s.sick)}</td><td className="px-2 py-1.5 text-right">{num(s.hs)}</td></tr>
                ))}</tbody>
              </table>
            </Section>
          )}
          <DataTable data={q.data ?? []} columns={columns} exportName={`presences-${period.slice(0, 7)}`} />
        </div>
      )}
      <AttendanceModal open={open} onClose={() => setOpen(false)} period={period} />
    </>
  )
}

function AttendanceModal({ open, onClose, period }: { open: boolean; onClose: () => void; period: string }) {
  const qc = useQueryClient()
  const employees = useEmployees()
  const [f, setF] = useState({ employee_id: '', attendance_date: period, status: 'Absent', absence_hours: 8, overtime_15: 0, overtime_40: 0, overtime_60: 0, overtime_100: 0, notes: '' })
  const save = useMutation({
    mutationFn: async () => unwrap(await supabase.from('attendance').upsert(f, { onConflict: 'employee_id,attendance_date' }).select()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); onClose() },
  })
  const n = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) })
  return (
    <Modal open={open} onClose={onClose} title="Saisir une présence"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" loading={save.isPending} disabled={!f.employee_id} onClick={() => save.mutate()}>Enregistrer</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Salarié" className="sm:col-span-2" value={f.employee_id} onChange={(e) => setF({ ...f, employee_id: e.target.value })}>
          <option value="">Choisir…</option>
          {(employees.data ?? []).filter((e) => e.status === 'Active').map((e) => <option key={e.id} value={e.id}>{e.employee_number} — {e.first_name} {e.last_name}</option>)}
        </SelectField>
        <TextField label="Date" type="date" value={f.attendance_date} onChange={(e) => setF({ ...f, attendance_date: e.target.value })} />
        <SelectField label="Statut" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, absence_hours: e.target.value === 'Présent' ? 0 : e.target.value === 'Demi-journée' ? 4 : 8 })}>
          {['Présent', 'Absent', 'Demi-journée', 'Congé', 'Maladie'].map((s) => <option key={s}>{s}</option>)}
        </SelectField>
        <TextField label="Heures d'absence" type="number" step="0.5" value={f.absence_hours} onChange={n('absence_hours')} />
        <TextField label="HS à 15 %" type="number" step="0.5" value={f.overtime_15} onChange={n('overtime_15')} />
        <TextField label="HS à 40 %" type="number" step="0.5" value={f.overtime_40} onChange={n('overtime_40')} />
        <TextField label="HS à 60 %" type="number" step="0.5" value={f.overtime_60} onChange={n('overtime_60')} />
        <TextField label="HS à 100 %" type="number" step="0.5" value={f.overtime_100} onChange={n('overtime_100')} />
        <TextField label="Observation" className="sm:col-span-2" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
      <div className="mt-3"><ErrorNote error={save.error} /></div>
    </Modal>
  )
}
