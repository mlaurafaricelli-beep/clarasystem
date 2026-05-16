// Todas las funciones están disponibles en todos los planes
// La única diferencia es la cantidad de clientes y usuarios

export const PLAN_LIMITS: Record<string, { clients: number; users: number }> = {
  esencial: { clients: 3, users: 3 },
  crecimiento: { clients: 5, users: 5 },
  agencia: { clients: 10, users: 8 },
  estudio: { clients: 25, users: 999 },
}

export function hasFeature(plan: string, feature: string): boolean {
  // Todas las funciones disponibles en todos los planes
  return true
}

export function canAddClient(plan: string, currentCount: number): boolean {
  return currentCount < (PLAN_LIMITS[plan]?.clients || 3)
}

export function canAddUser(plan: string, currentCount: number): boolean {
  return currentCount < (PLAN_LIMITS[plan]?.users || 3)
}
