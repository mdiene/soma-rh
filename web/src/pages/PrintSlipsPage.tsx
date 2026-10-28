import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase'
import { useCompany } from '../lib/queries'
import { monthLabel } from '../lib/format'
import { SalarySlipDocument } from '../components/SalarySlipDocument'
import { Button, ErrorNote, Spinner } from '../components/ui'

/** Tous les bulletins d'un traitement, un par page A4 (remplace la macro Export_BulletinSalaire). */
export default function PrintSlipsPage() {
  const { id } = useParams()
  const company = useCompany()
  const q = useQuery({
    queryKey: ['print-slips', id],
    queryFn: async () => {
      const slips = unwrap(await supabase.from('salary_slips').select('*').eq('payroll_entry_id', id!).neq('status', 'Annulé').order('employee_number'))
      const ids = slips.map((s) => s.id)
      const [details, ytd] = await Promise.all([
        supabase.from('salary_slip_details').select('*').in('salary_slip_id', ids),
        supabase.from('v_salary_slip_ytd').select('*').in('salary_slip_id', ids),
      ])
      return { slips, details: unwrap(details), ytd: unwrap(ytd) }
    },
  })
  if (q.isLoading) return <Spinner label="Préparation des bulletins…" />
  if (!q.data) return <ErrorNote error={q.error} />
  const { slips, details, ytd } = q.data
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/paie/${id}`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-river"><ArrowLeft className="h-4 w-4" /> Retour au traitement</Link>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-soft">{slips.length} bulletin(s) — {slips[0] ? monthLabel(slips[0].period_start) : ''}</p>
          <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimer ou enregistrer en PDF</Button>
        </div>
      </div>
      <div className="space-y-8 print:space-y-0">
        {slips.map((s) => (
          <SalarySlipDocument key={s.id} slip={s} details={details.filter((d) => d.salary_slip_id === s.id)} ytd={ytd.find((y) => y.salary_slip_id === s.id)} company={company.data} />
        ))}
      </div>
    </>
  )
}
