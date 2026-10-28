import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { ArrowLeft, Ban, CheckCircle2, Play, Printer, Trash2 } from 'lucide-react'
import { DeletePayrollModal } from '../components/DeletePayrollModal'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap, type Views } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { date, fcfa, monthLabel } from '../lib/format'
import { DataTable } from '../components/DataTable'
import { Badge, Button, ErrorNote, Figure, Modal, PageHeader, Spinner } from '../components/ui'

type Reg = Views<'v_payroll_register'>
const col = createColumnHelper<Reg>()
const sum = (rows: Reg[], k: keyof Reg) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0)
const money = (k: keyof Reg, header: string, strong = false) =>
  col.accessor((r) => Number(r[k] ?? 0), {
    id: String(k), header, meta: { align: 'right' },
    cell: (c) => strong ? <strong>{fcfa(c.getValue())}</strong> : fcfa(c.getValue()),
    footer: (ctx) => fcfa(sum(ctx.table.getFilteredRowModel().rows.map((r) => r.original), k)),
  })

const columns = [
  col.accessor('employee_number', { header: 'Matricule', footer: 'Total' }),
  col.accessor('employee_name', { header: 'Salarié', cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
  col.accessor('employment_type', { header: 'Contrat' }),
  money('gross_pay', 'Brut'),
  money('income_tax', 'IR'),
  money('total_employee_deductions', 'Retenues'),
  money('total_non_taxable', 'Indemnités'),
  money('net_pay', 'Net à payer', true),
  money('employer_charges', 'Charges patronales'),
  money('payroll_cost', 'Masse salariale'),
  col.accessor('status', { header: 'État', cell: (c) => <Badge value={c.getValue() ?? ''} /> }),
]

type RunResult = { calculated: number; errors: { employee_number: string; name: string; error: string }[] }

export default function PayrollEntryPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { can } = useAuth()
  const [confirm, setConfirm] = useState<null | 'submit' | 'cancel' | 'delete'>(null)
  const [result, setResult] = useState<RunResult | null>(null)

  const entry = useQuery({
    queryKey: ['payroll_entry', id],
    queryFn: async () => unwrap(await supabase.from('payroll_entries').select('*').eq('id', id!).single()),
  })
  const slips = useQuery({
    queryKey: ['register', id],
    queryFn: async () => unwrap(await supabase.from('v_payroll_register').select('*').eq('payroll_entry_id', id!).order('employee_number')),
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['payroll_entry', id] })
    qc.invalidateQueries({ queryKey: ['register', id] })
    qc.invalidateQueries({ queryKey: ['payroll_entries'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const run = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('run_payroll_entry', { p_payroll_entry_id: id! })) as unknown as RunResult,
    onSuccess: (r) => { setResult(r); refresh() },
  })
  const submit = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('submit_payroll_entry', { p_payroll_entry_id: id! })),
    onSuccess: () => { setConfirm(null); refresh() },
  })
  const cancel = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('cancel_payroll_entry', { p_payroll_entry_id: id! })),
    onSuccess: () => { setConfirm(null); refresh() },
  })

  if (entry.isLoading) return <Spinner />
  const e = entry.data
  if (!e) return <ErrorNote error={entry.error ?? 'Traitement introuvable'} />
  const rows = slips.data ?? []
  const editable = e.status === 'Brouillon' || e.status === 'Calculée'

  return (
    <>
      <Link to="/paie" className="no-print mb-3 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-river"><ArrowLeft className="h-4 w-4" /> Traitements de paie</Link>
      <PageHeader
        title={`Paie de ${monthLabel(e.period_start)}`}
        description={<span className="inline-flex flex-wrap items-center gap-2">Du {date(e.period_start)} au {date(e.period_end)} · paiement par {e.payment_mode} <Badge value={e.status} /></span>}
        actions={<>
          {rows.length > 0 && <Button icon={<Printer className="h-4 w-4" />} onClick={() => nav(`/paie/${id}/imprimer`)}>Imprimer les bulletins</Button>}
          {can('paie') && editable && <Button icon={<Play className="h-4 w-4" />} loading={run.isPending} onClick={() => run.mutate()}>{rows.length ? 'Recalculer' : 'Calculer les bulletins'}</Button>}
          {can('paie') && e.status === 'Calculée' && <Button variant="primary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setConfirm('submit')}>Valider la paie</Button>}
          {can('admin') && e.status !== 'Annulée' && <Button variant="ghost" icon={<Ban className="h-4 w-4" />} onClick={() => setConfirm('cancel')}>Annuler</Button>}
          {can('paie') && (e.status !== 'Validée' || can('admin')) && (
            <Button variant="ghost" className="text-signal hover:bg-signal-light hover:text-signal" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')}>Supprimer</Button>
          )}
        </>}
      />
      <DeletePayrollModal open={confirm === 'delete'} entry={e} onClose={() => setConfirm(null)} onDeleted={() => nav('/paie', { replace: true })} />
      <ErrorNote error={slips.error || run.error} />

      {result && (
        <div className="mb-4 rounded border border-line bg-white px-4 py-3 text-sm">
          <p><strong>{result.calculated}</strong> bulletin(s) calculé(s).</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-signal">
              {result.errors.map((x) => <li key={x.employee_number}>{x.employee_number} {x.name} : {x.error}</li>)}
            </ul>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="panel mb-6 grid grid-cols-2 gap-x-6 gap-y-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Bulletins" value={rows.length} />
          <Figure label="Brut" value={`${fcfa(sum(rows, 'gross_pay'))} F`} />
          <Figure label="Retenues salariales" value={`${fcfa(sum(rows, 'total_employee_deductions'))} F`} />
          <Figure label="Net à payer" value={`${fcfa(sum(rows, 'net_pay'))} F`} />
          <Figure label="Charges patronales" value={`${fcfa(sum(rows, 'employer_charges'))} F`} />
          <Figure label="Masse salariale" value={`${fcfa(sum(rows, 'payroll_cost'))} F`} />
        </div>
      )}

      {slips.isLoading ? <Spinner /> : rows.length === 0 ? (
        <p className="panel px-4 py-6 text-sm text-ink-soft">Aucun bulletin pour ce traitement. Vérifiez les variables du mois puis lancez le calcul.</p>
      ) : (
        <DataTable data={rows} columns={columns} footer exportName={`livre-de-paie-${e.period_start.slice(0, 7)}`} onRowClick={(r) => nav(`/bulletins/${r.salary_slip_id}`)} />
      )}

      <Modal open={confirm === 'submit'} onClose={() => setConfirm(null)} title="Valider la paie"
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Revenir</Button><Button variant="primary" loading={submit.isPending} onClick={() => submit.mutate()}>Valider {rows.length} bulletin(s)</Button></>}>
        <p className="text-sm">Une fois validés, les bulletins de {monthLabel(e.period_start)} ne peuvent plus être recalculés et deviennent visibles par les salariés.</p>
        <div className="mt-3"><ErrorNote error={submit.error} /></div>
      </Modal>
      <Modal open={confirm === 'cancel'} onClose={() => setConfirm(null)} title="Annuler le traitement"
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Revenir</Button><Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Annuler le traitement</Button></>}>
        <p className="text-sm">Les bulletins de {monthLabel(e.period_start)} seront marqués « Annulé ». Un nouveau traitement pourra ensuite être créé pour ce mois.</p>
        <div className="mt-3"><ErrorNote error={cancel.error} /></div>
      </Modal>
    </>
  )
}
