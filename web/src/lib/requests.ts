export const REQUEST_TYPES: Record<string, string> = {
  attestation_travail: 'Attestation de travail',
  attestation_salaire: 'Attestation de salaire',
  acompte: 'Demande d’acompte',
  correction_presence: 'Correction de présence',
  donnees_personnelles: 'Modification de données personnelles',
  autre: 'Autre demande',
}

export type EmployeeRequest = {
  id: string; employee_id: string; request_type: string; amount: number | null; target_date: string | null
  message: string | null; status: 'Ouverte' | 'Approuvée' | 'Rejetée' | 'Annulée'
  decision_note: string | null; decided_at: string | null; created_at: string
  employee?: { employee_number: string; first_name: string; last_name: string; phone_personal: string | null; phone_work: string | null } | null
}
