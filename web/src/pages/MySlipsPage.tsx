import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase'
import { fcfa, monthLabel } from '../lib/format'
import { Empty, ErrorNote, PageHeader, Spinner } from '../components/ui'

/** Espace salarié : bulletins validés du salarié connecté (filtrés par la RLS). */
export default function MySlipsPage() {
  const q = useQuery({
    queryKey: ['my-slips'],
    queryFn: async () => unwrap(await supabase.from('salary_slips').select('id, period_start, net_pay, gross_pay').eq('status', 'Validé').order('period_start', { ascending: false })),
  })
  return (
    <>
      <PageHeader title="Mes bulletins" description="Vos bulletins de paie validés, à consulter et imprimer." />
      <ErrorNote error={q.error} />
      {q.isLoading ? <Spinner /> : (q.data ?? []).length === 0 ? (
        <Empty title="Aucun bulletin disponible">Vos bulletins apparaîtront ici dès que la paie du mois aura été validée. Si rien n'apparaît, demandez au service RH de relier votre compte à votre fiche.</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {q.data!.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3">
              <Link to={`/bulletins/${s.id}`} className="font-medium text-river hover:underline">{monthLabel(s.period_start)}</Link>
              <span className="num text-sm">Net {fcfa(s.net_pay)} F</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
