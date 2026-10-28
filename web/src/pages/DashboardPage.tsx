import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, unwrap } from '../lib/supabase'
import { fcfa, monthLabel, MONTHS } from '../lib/format'
import { useAuth } from '../lib/auth'
import { usePayrollEntries } from '../lib/queries'
import { DeletePayrollModal } from '../components/DeletePayrollModal'
import { Button, Empty, ErrorNote, PageHeader, Section, SelectField, Spinner } from '../components/ui'

type Dashboard = {
  period: string
  headcount_active: number
  headcount_by_contract: Record<string, number>
  headcount_by_status: Record<string, number>
  leaves_in_progress: number
  leave_requests_pending: number
  contracts_ending_60d: number
  payroll: { slips: number; validated: number; gross: number; net: number; employer_charges: number; payroll_cost: number; income_tax: number }
  trend: { period: string; gross: number; net: number; payroll_cost: number; slips: number }[]
}

export default function DashboardPage() {
  const { roles, can } = useAuth()
  const entries = usePayrollEntries()
  const [period, setPeriod] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    if (!period && entries.data) setPeriod(entries.data[0]?.period_start ?? new Date().toISOString().slice(0, 8) + '01')
  }, [entries.data, period])

  const q = useQuery({
    queryKey: ['dashboard', period],
    enabled: !!period,
    queryFn: async () => unwrap(await supabase.rpc('hr_dashboard', { p_period: period })) as unknown as Dashboard,
  })

  if (roles.length === 0) {
    return (
      <>
        <PageHeader title="Bienvenue" />
        <Empty title="Votre compte n'a pas encore de rôle" action={<Link to="/parametres" className="text-sm font-medium text-river hover:underline">Ouvrir les paramètres d'accès</Link>}>
          Si vous êtes le premier utilisateur, déclarez-vous administrateur depuis les paramètres. Sinon, demandez à un administrateur de vous attribuer le rôle RH, Paie ou Salarié.
        </Empty>
      </>
    )
  }

  const d = q.data
  const p = d?.payroll
  const entry = (entries.data ?? []).find((e) => e.period_start === period && e.status !== 'Annulée')
  const canDelete = !!entry && can('paie') && (entry.status !== 'Validée' || can('admin'))
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Situation du personnel et de la paie pour le mois sélectionné."
        actions={<>
          <SelectField label="Mois de paie" value={period} onChange={(e) => setPeriod(e.target.value)} className="min-w-[12rem]">
            {(entries.data ?? []).map((e) => <option key={e.id} value={e.period_start}>{monthLabel(e.period_start)}</option>)}
            {period && !(entries.data ?? []).some((e) => e.period_start === period) && <option value={period}>{monthLabel(period)}</option>}
          </SelectField>
          {canDelete && (
            <Button variant="ghost" className="self-end text-signal hover:bg-signal-light hover:text-signal" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
              Supprimer la paie de {monthLabel(period)}
            </Button>
          )}
        </>}
      />
      {entry && (
        <DeletePayrollModal
          open={confirmDelete}
          entry={entry}
          onClose={() => setConfirmDelete(false)}
          onDeleted={() => { setConfirmDelete(false); setPeriod('') }}
        />
      )}
      <ErrorNote error={q.error} />
      {q.isLoading || !d ? <Spinner /> : (
        <div className="space-y-6">
          <PayrollComposition d={d} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Section title="Effectif actif" className="lg:col-span-1">
              <p className="num text-4xl font-bold" style={{ fontStretch: '75%' }}>{d.headcount_active}</p>
              <Breakdown title="Par contrat" data={d.headcount_by_contract} />
              <Breakdown title="Par statut" data={d.headcount_by_status} />
            </Section>

            <Section title="À traiter" className="lg:col-span-1">
              <ul className="divide-y divide-line text-sm">
                <Todo n={d.leave_requests_pending} label="demande(s) de congé en attente" to="/conges" />
                <Todo n={d.leaves_in_progress} label="salarié(s) en congé aujourd'hui" to="/conges" />
                <Todo n={d.contracts_ending_60d} label="contrat(s) arrivant à échéance sous 60 jours" to="/salaries" />
                <Todo n={(p?.slips ?? 0) - (p?.validated ?? 0)} label={`bulletin(s) de ${monthLabel(d.period)} non validé(s)`} to="/paie" />
              </ul>
            </Section>

            <Section title="Masse salariale sur 12 mois" className="lg:col-span-1">
              {d.trend.length < 2 ? (
                <p className="text-sm text-ink-soft">La courbe apparaîtra dès que deux mois de paie seront calculés.</p>
              ) : (
                <div className="h-44">
                  <ResponsiveContainer>
                    <LineChart data={d.trend.map((t) => ({ ...t, label: MONTHS[Number(t.period.slice(5, 7)) - 1].slice(0, 3) }))}>
                      <CartesianGrid stroke="#DCE1DE" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7A84' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7A84' }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => `${Math.round(v / 1e6)} M`} />
                      <Tooltip formatter={(v: number) => `${fcfa(v)} F`} />
                      <Line type="monotone" dataKey="payroll_cost" name="Masse salariale" stroke="#0F6E6A" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="net" name="Net payé" stroke="#E0B000" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>
          </div>
        </div>
      )}
    </>
  )
}

/** Décomposition de la masse salariale du mois : où va chaque franc. */
function PayrollComposition({ d }: { d: Dashboard }) {
  const p = d.payroll
  if (!p || p.slips === 0) {
    return (
      <Empty title={`Aucune paie calculée pour ${monthLabel(d.period)}`} action={<Link to="/paie" className="text-sm font-medium text-river hover:underline">Lancer le traitement du mois</Link>}>
        Saisissez les variables du mois puis lancez le traitement pour obtenir les bulletins.
      </Empty>
    )
  }
  const employeeDeductions = p.gross - (p.net - (p.payroll_cost - p.gross - p.employer_charges))
  const nonTaxable = p.payroll_cost - p.gross - p.employer_charges
  const segs = [
    { label: 'Net versé aux salariés', value: p.net, color: '#0F6E6A' },
    { label: 'Retenues salariales (IR, TRIMF, IPRES, IPM)', value: employeeDeductions, color: '#3A4A55' },
    { label: 'Charges patronales', value: p.employer_charges, color: '#E0B000' },
  ]
  const total = segs.reduce((s, x) => s + x.value, 0)
  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">Masse salariale de {monthLabel(d.period)}</h2>
        <p className="num text-2xl font-bold" style={{ fontStretch: '78%' }}>{fcfa(p.payroll_cost)} F CFA</p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {p.slips} bulletin(s), dont {p.validated} validé(s). Brut {fcfa(p.gross)} F, indemnités non imposables {fcfa(nonTaxable)} F.
      </p>
      <div className="mt-4 flex h-4 w-full overflow-hidden rounded" role="img" aria-label="Répartition de la masse salariale">
        {segs.map((s) => <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />)}
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {segs.map((s) => (
          <div key={s.label} className="flex items-start gap-2">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden />
            <div>
              <dt className="text-xs text-ink-soft">{s.label}</dt>
              <dd className="num font-semibold">{fcfa(s.value)} F <span className="font-normal text-ink-muted">· {Math.round((s.value / total) * 100)} %</span></dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map((e) => e[1]))
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs text-ink-muted">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {entries.map(([k, v]) => (
          <li key={k} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2">
            <span className="truncate text-ink-soft">{k}</span>
            <span className="h-1.5 rounded bg-river/80" style={{ width: `${(v / max) * 100}%` }} />
            <span className="num text-right">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Todo({ n, label, to }: { n: number; label: string; to: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={`num w-8 text-right text-lg font-bold ${n > 0 ? 'text-ink' : 'text-ink-muted'}`}>{n}</span>
      <Link to={to} className="flex-1 text-ink-soft hover:text-river">{label}</Link>
    </li>
  )
}
