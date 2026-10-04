import { AdminRole } from './types';

export type AdminAction = 'view' | 'create' | 'edit' | 'delete' | 'pipeline_update';

const ROLE_ACTIONS: Record<AdminRole, AdminAction[]> = {
  admin: ['view', 'create', 'edit', 'delete', 'pipeline_update'],
  manager: ['view', 'create', 'edit'],
  operations: ['view', 'create'],
  sales: ['view', 'create', 'pipeline_update'],
};

export const hasPermission = (role: AdminRole | string | null | undefined, action: AdminAction) => {
  const normalized = String(role || '').toLowerCase().trim() as AdminRole;
  return ROLE_ACTIONS[normalized]?.includes(action) ?? false;
};

export const canAccessView = (role: AdminRole | string | null | undefined, view: string) => {
  const normalized = String(role || '').toLowerCase().trim() as AdminRole;
  if (normalized === 'admin' || normalized === 'manager' || normalized === 'operations') {
    return ['dashboard', 'orders', 'inventory', 'sales', 'purchase', 'expenses', 'reports', 'products', 'product_master'].includes(view);
  }
  if (normalized === 'sales') {
    return view === 'orders' || view === 'sales';
  }
  return false;
};

export const canAccessMaster = (role: AdminRole | string | null | undefined) => {
  const normalized = String(role || '').toLowerCase().trim();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'operations';
};

export const isAdminOnlyView = (view: string) => view === 'staff' || view === 'gateways';
