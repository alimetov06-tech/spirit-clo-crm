import type { Role } from "@/types/domain";

export function canManageFinance(role: Role) {
  return role === "owner";
}

export function canManageSettings(role: Role) {
  return role === "owner";
}

export function canManageOrders(role: Role) {
  return role === "owner" || role === "manager";
}

export function canViewAssignedProduction(role: Role) {
  return role === "owner" || role === "manager" || role === "seamstress";
}
