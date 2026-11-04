import { AuditLogView } from '../components/ReferentialManager'
import { PageHeader } from '../components/ui'

/** Journal des modifications : qui a changé quoi, quand (lecture seule, alimenté par la base). */
export default function JournalPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Journal des modifications" description="Traçabilité des changements sur les données de paie et de personnel." />
      <AuditLogView />
    </div>
  )
}
