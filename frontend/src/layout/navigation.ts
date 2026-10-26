import type { IconName } from '../components/ui/Icon'

export type PageId = 'overview' | 'expenses' | 'categories' | 'budgets' | 'reports'

export interface NavItem {
  id: PageId
  label: string
  icon: IconName
}

export const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'expenses', label: 'Expenses', icon: 'expenses' },
  { id: 'categories', label: 'Categories', icon: 'categories' },
  { id: 'budgets', label: 'Budgets', icon: 'budgets' },
  { id: 'reports', label: 'Summary & Reports', icon: 'reports' },
]
