import { useQuery } from '@tanstack/react-query'
import { supabase, unwrap } from './supabase'

/** Requêtes de référence partagées entre les écrans. */

export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: async () => unwrap(await supabase.from('companies').select('*').order('created_at').limit(1).single()),
  })
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () =>
      unwrap(await supabase
        .from('employees')
        .select('*, designation:designations(name), grade:employee_grades(code, staff_status, base_salary, hourly_rate)')
        .order('employee_number')),
  })
}

export function useDesignations() {
  return useQuery({
    queryKey: ['designations'],
    queryFn: async () => unwrap(await supabase.from('designations').select('*').order('name')),
  })
}

export function useAgreements() {
  return useQuery({
    queryKey: ['agreements'],
    queryFn: async () => unwrap(await supabase.from('collective_agreements').select('*').order('name')),
  })
}

export function useGrades(agreement?: string | null) {
  return useQuery({
    queryKey: ['grades', agreement],
    enabled: !!agreement,
    queryFn: async () =>
      unwrap(await supabase.from('employee_grades').select('*').eq('agreement_code', agreement!).order('base_salary')),
  })
}

export function useComponents() {
  return useQuery({
    queryKey: ['salary_components'],
    queryFn: async () => unwrap(await supabase.from('salary_components').select('*').order('rubric_number')),
  })
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave_types'],
    queryFn: async () => unwrap(await supabase.from('leave_types').select('*').order('name')),
  })
}

export function usePayrollEntries() {
  return useQuery({
    queryKey: ['payroll_entries'],
    queryFn: async () => unwrap(await supabase.from('payroll_entries').select('*').order('period_start', { ascending: false })),
  })
}

export function employeeName(e: { first_name: string; last_name: string } | null | undefined): string {
  return e ? `${e.first_name} ${e.last_name}` : ''
}
