import { createClient } from '@/lib/supabase'

export const PLAN_FEATURES: Record<string, string[]> = {
  esencial: ['dashboard','approvals','fichas','alerts','acuerdos','team'],
  crecimiento: ['dashboard','approvals','fichas','alerts','acuerdos','team','reports','contract_alerts','history'],
  agencia: ['dashboard','approvals','fichas','alerts','acuerdos','team','reports','contract_alerts','history','white_label','reports'],
  estudio: ['dashboard','approvals','fichas','alerts','acuerdos','team','reports','contract_alerts','history','white_label','multi_brand','onboarding'],
}

export const PLAN_LIMITS: Record<string, { clients: number; users: number }> = {
  esencial: { clients: 3, users: 3 },
  crecimiento: { clients: 5, users: 5 },
  agencia: { clients: 10, users: 8 },
  estudio: { clients: 25, users: 999 },
}

export function hasFeature(plan: string, feature: string): boolean {
  return (PLAN_FEATURES[plan] || PLAN_FEATURES.esencial).includes(feature)
}

export function canAddClient(plan: string, currentCount: number): boolean {
  return currentCount < (PLAN_LIMITS[plan]?.clients || 3)
}

export function canAddUser(plan: string, currentCount: number): boolean {
  return currentCount < (PLAN_LIMITS[plan]?.users || 3)
}
