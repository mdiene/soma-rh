import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase'
import { usePayrollEntries } from '../lib/queries'
import { monthLabel } from '../lib/format'
import { Badge, Empty, ErrorNote, PageHeader, SelectField, Spinner } from '../components/ui'

type Check = { niveau: 'erreur' | 'alerte' | 'info'; code: string; salarie: string; message: string }
const label = { erreur: 'Erreur', alerte: 'Alerte', info: 'Info' } as const
const tone = { erreur: 'text-signal', alerte: 'text-phosphate', info: 'text-ink-soft' } as const

/** Contrôle avant clôture : anomalies d'un traitement ; la validation se fait depuis le traitement (administrateur). */
export default function PayrollGovernancePage() {
  const entries = usePayrollEntries()
  const [picked, setPicked] = useState('')
  const entry = (entries.data ?? []).find((e) => e.id === picked) ?? entries.data?.[0]

  const checks = useQuery({
    queryKey: ['payroll_entry_checks', entry?.id],
    enabled: !!entry,
    queryFn: async () => (unwrap(await supabase.rpc('payroll_entry_checks', { p_payroll_entry_id: entry!.id })) ?? []) as unknown as Check[],
  })

  return (
    <>
      <PageHeader title="Contrôle et clôture" description="Anomalies à corriger avant la validation définitive d'un traitement de paie. Seul un administrateur peut valider." />
      <ErrorNote error={entries.error || checks.error} />
      {entries.isLoading ? <Spinner /> : !entry ? <Empty title="Aucun traitement de paie">Créez d'abord un traitement.</Empty> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField label="Traitement" value={entry.id} onChange={(e) => setPicked(e.target.value)}>
              {entries.data!.map((e) => <option key={e.id} value={e.id}>{monthLabel(e.period_start)} — {e.status}</option>)}
            </SelectField>
            <Badge value={entry.status} />
            <Link className="text-sm text-river underline" to={`/paie/${entry.id}`}>Ouvrir le traitement</Link>
          </div>
          {checks.isLoading ? <Spinner /> : (checks.data ?? []).length === 0 ? (
            <p className="panel px-4 py-3 text-sm">Aucune anomalie détectée.</p>
          ) : (
            <ul className="panel divide-y divide-line text-sm">
              {checks.data!.map((c, i) => (
                <li key={i} className="px-4 py-2"><span className={`font-medium ${tone[c.niveau]}`}>{label[c.niveau]}</span> · {c.salarie} : {c.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
