import { createColumnHelper } from '@tanstack/react-table'
import { UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEmployees } from '../lib/queries'
import { useAuth } from '../lib/auth'
import { date } from '../lib/format'
import { DataTable } from '../components/DataTable'
import { Badge, Button, ErrorNote, PageHeader, Spinner } from '../components/ui'

type Emp = NonNullable<ReturnType<typeof useEmployees>['data']>[number]
const col = createColumnHelper<Emp>()

const columns = [
  col.accessor('employee_number', { header: 'Matricule' }),
  col.accessor((e) => `${e.first_name} ${e.last_name}`, { id: 'name', header: 'Prénom et nom', cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
  col.accessor((e) => e.designation?.name ?? '', { id: 'designation', header: 'Emploi' }),
  col.accessor((e) => e.grade?.code ?? '', { id: 'grade', header: 'Catégorie' }),
  col.accessor((e) => e.grade?.staff_status ?? '', { id: 'staff', header: 'Statut' }),
  col.accessor('employment_type', { header: 'Contrat' }),
  col.accessor('date_of_joining', { header: "Date d'entrée", cell: (c) => date(c.getValue()) }),
  col.accessor('contract_end', { header: 'Fin de contrat', cell: (c) => date(c.getValue()) }),
  col.accessor('status', { header: 'État', cell: (c) => <Badge value={c.getValue()} /> }),
]

export default function EmployeesPage() {
  const q = useEmployees()
  const nav = useNavigate()
  const { can } = useAuth()
  return (
    <>
      <PageHeader
        title="Salariés"
        description="Fiches du personnel : identité, contrat, catégorie conventionnelle et situation familiale."
        actions={can('rh') && <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => nav('/salaries/nouveau')}>Nouveau salarié</Button>}
      />
      <ErrorNote error={q.error} />
      {q.isLoading ? <Spinner /> : (
        <DataTable data={q.data ?? []} columns={columns} searchPlaceholder="Nom, matricule, emploi…" exportName="salaries" onRowClick={(e) => nav(`/salaries/${e.id}`)} />
      )}
    </>
  )
}
