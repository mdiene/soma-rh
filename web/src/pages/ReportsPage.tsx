import { useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { supabase, unwrap, type Views } from '../lib/supabase'
import { usePayrollEntries } from '../lib/queries'
import { fcfa, monthLabel, pct } from '../lib/format'
import { DataTable } from '../components/DataTable'
import { Empty, ErrorNote, PageHeader, SelectField, Spinner } from '../components/ui'

type Reg = Views<'v_payroll_register'>
type Contrib = Views<'v_contribution_summary'>
type Journal = Views<'v_accounting_journal'>

const TABS = [
  { id: 'livre', label: 'Livre de paie' },
  { id: 'cotisations', label: 'État résumé des cotisations' },
  { id: 'patronal', label: 'Charges patronales' },
  { id: 'compta', label: 'Écritures comptables' },
] as const
type Tab = (typeof TABS)[number]['id']

const rc = createColumnHelper<Reg>()
const sumOf = (rows: Reg[], k: keyof Reg) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0)
const m = (k: keyof Reg, header: string) => rc.accessor((r) => Number(r[k] ?? 0), {
  id: String(k), header, meta: { align: 'right' },
  cell: (c) => fcfa(c.getValue()),
  footer: (ctx) => fcfa(sumOf(ctx.table.getFilteredRowModel().rows.map((r) => r.original), k)),
})

const registerCols = [
  rc.accessor('employee_number', { header: 'Matricule', footer: 'Total' }),
  rc.accessor('employee_name', { header: 'Salarié' }),
  rc.accessor('grade_code', { header: 'Catégorie' }),
  m('base_salary', 'Salaire de base'), m('sursalaire', 'Sursalaire'), m('seniority_bonus', 'Prime anc.'),
  m('variable_gross', 'Primes'), m('leave_allowance', 'Alloc. congé'), m('overtime_amount', 'Heures sup.'),
  m('gross_pay', 'Brut'), m('income_tax', 'IR'), m('trimf', 'TRIMF'), m('ipres_rg_employee', 'IPRES RG'),
  m('ipres_rc_employee', 'IPRES RC'), m('ipm_employee', 'IPM'), m('brs', 'BRS'),
  m('total_employee_deductions', 'Total retenues'), m('net_remuneration', 'Rém. nette'),
  m('transport_allowance', 'Transport'), m('total_non_taxable', 'Indemnités'), m('total_net_deductions', 'Retenues diverses'),
  m('net_pay', 'Net à payer'), m('employer_charges', 'Charges patronales'), m('payroll_cost', 'Masse salariale'),
]
const employerCols = [
  rc.accessor('employee_number', { header: 'Matricule', footer: 'Total' }),
  rc.accessor('employee_name', { header: 'Salarié' }),
  m('css_af', 'Allocations familiales'), m('css_at', 'Accident du travail'), m('ipres_rg_employer', 'IPRES RG'),
  m('ipres_rc_employer', 'IPRES RC'), m('ipm_employer', 'IPM'), m('cfce', 'CFCE'), m('employer_charges', 'Total'),
]

const cc = createColumnHelper<Contrib>()
const csum = (rows: Contrib[], k: keyof Contrib) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0)
const contribCols = [
  cc.accessor('label', { header: 'Rubrique', footer: 'Total' }),
  cc.accessor('employee_rate', { header: 'Taux salarial', meta: { align: 'right' }, cell: (c) => c.getValue() ? pct(c.getValue()) : '' }),
  cc.accessor('employer_rate', { header: 'Taux patronal', meta: { align: 'right' }, cell: (c) => c.getValue() ? pct(c.getValue()) : '' }),
  cc.accessor('base_total', { header: 'Assiette', meta: { align: 'right' }, cell: (c) => fcfa(c.getValue()) }),
  ...(['employee_amount', 'employer_amount', 'total_amount'] as const).map((k, i) => cc.accessor(k, {
    header: ['Montant salarial', 'Montant patronal', 'Montant global'][i], meta: { align: 'right' },
    cell: (c) => fcfa(c.getValue()),
    footer: (ctx) => fcfa(csum(ctx.table.getFilteredRowModel().rows.map((r) => r.original), k)),
  })),
  cc.accessor('headcount', { header: 'Effectif', meta: { align: 'right' } }),
]

export default function ReportsPage() {
  const entries = usePayrollEntries()
  const [entryId, setEntryId] = useState('')
  const [tab, setTab] = useState<Tab>('livre')
  useEffect(() => { if (!entryId && entries.data?.length) setEntryId(entries.data.find((e) => e.status !== 'Annulée')?.id ?? '') }, [entries.data, entryId])
  const entry = entries.data?.find((e) => e.id === entryId)

  const reg = useQuery({
    queryKey: ['register', entryId], enabled: !!entryId,
    queryFn: async () => unwrap(await supabase.from('v_payroll_register').select('*').eq('payroll_entry_id', entryId).order('employee_number')),
  })
  const contrib = useQuery({
    queryKey: ['contrib', entryId], enabled: !!entryId && tab === 'cotisations',
    queryFn: async () => unwrap(await supabase.from('v_contribution_summary').select('*').eq('payroll_entry_id', entryId).order('sort_order')),
  })
  const journal = useQuery({
    queryKey: ['journal', entryId], enabled: !!entryId && tab === 'compta',
    queryFn: async () => unwrap(await supabase.from('v_accounting_journal').select('*').eq('payroll_entry_id', entryId).order('journal').order('line_no')),
  })
  const suffix = entry ? entry.period_start.slice(0, 7) : ''

  return (
    <>
      <PageHeader
        title="États et déclarations"
        description="Livre de paie, cotisations sociales et fiscales, charges patronales et écritures comptables du mois. Chaque état s'exporte en CSV pour Excel."
        actions={
          <SelectField label="Traitement" value={entryId} onChange={(e) => setEntryId(e.target.value)} className="min-w-[13rem]">
            {(entries.data ?? []).filter((e) => e.status !== 'Annulée').map((e) => <option key={e.id} value={e.id}>{monthLabel(e.period_start)} — {e.status}</option>)}
          </SelectField>
        }
      />
      <div className="no-print mb-4 flex flex-wrap gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={clsx('-mb-px border-b-2 px-3 py-2 text-sm', tab === t.id ? 'border-river font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink')}>
            {t.label}
          </button>
        ))}
      </div>
      <ErrorNote error={entries.error || reg.error || contrib.error || journal.error} />
      {!entryId ? <Empty title="Aucun traitement de paie">Les états apparaissent dès qu'un traitement est calculé.</Empty> : (
        <>
          {tab === 'livre' && (reg.isLoading ? <Spinner /> : <DataTable data={reg.data ?? []} columns={registerCols} footer dense exportName={`livre-de-paie-${suffix}`} />)}
          {tab === 'patronal' && (reg.isLoading ? <Spinner /> : <DataTable data={reg.data ?? []} columns={employerCols} footer exportName={`charges-patronales-${suffix}`} />)}
          {tab === 'cotisations' && (contrib.isLoading ? <Spinner /> : <DataTable data={contrib.data ?? []} columns={contribCols} footer exportName={`cotisations-${suffix}`} />)}
          {tab === 'compta' && (journal.isLoading ? <Spinner /> : <JournalView rows={journal.data ?? []} />)}
        </>
      )}
    </>
  )
}

function JournalView({ rows }: { rows: Journal[] }) {
  const journals = [...new Set(rows.map((r) => r.journal))]
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {journals.map((j) => {
        const lines = rows.filter((r) => r.journal === j)
        const d = lines.reduce((s, r) => s + Number(r.debit), 0)
        const c = lines.reduce((s, r) => s + Number(r.credit), 0)
        return (
          <section key={j} className="panel overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 text-base">{j?.replace(/^\d-/, '')}</h2>
            <table className="w-full text-sm">
              <thead><tr className="table-head"><th className="px-3 py-1.5">Compte</th><th className="px-3 py-1.5">Libellé</th><th className="px-3 py-1.5 text-right">Débit</th><th className="px-3 py-1.5 text-right">Crédit</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={`${l.journal}-${l.line_no}`} className="border-b border-line/70">
                    <td className="px-3 py-1.5 font-medium">{l.account}</td>
                    <td className="px-3 py-1.5">{l.label}</td>
                    <td className="px-3 py-1.5 text-right">{Number(l.debit) ? fcfa(l.debit) : ''}</td>
                    <td className="px-3 py-1.5 text-right">{Number(l.credit) ? fcfa(l.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-paper font-semibold">
                  <td className="px-3 py-1.5" colSpan={2}>Total {Math.abs(d - c) < 0.5 ? '— équilibré' : '— écart'}</td>
                  <td className="px-3 py-1.5 text-right">{fcfa(d)}</td>
                  <td className="px-3 py-1.5 text-right">{fcfa(c)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )
      })}
    </div>
  )
}
