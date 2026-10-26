import { Icon } from '../components/ui/Icon'
import { navItems } from './navigation'
import type { PageId } from './navigation'

interface SidebarProps {
  current: PageId
  collapsed: boolean
  mobileOpen: boolean
  onNavigate: (page: PageId) => void
  onToggleCollapsed: () => void
}

export function Sidebar({ current, collapsed, mobileOpen, onNavigate, onToggleCollapsed }: SidebarProps) {
  return (
    <aside className={`sidebar${mobileOpen ? ' is-open' : ''}`} id="app-sidebar" aria-label="Sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="wallet" />
        </span>
        <span className="brand-text">
          <span className="brand-name">Expense Management</span>
          <span className="brand-sub">AICC102 workspace</span>
        </span>
      </div>

      <nav aria-label="Main" className="nav">
        <span className="nav-label">Workspace</span>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav-item"
            aria-current={current === item.id ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} />
            <span className="nav-text">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-info" title={collapsed ? 'Local API on port 5200, data stored in SQLite' : undefined}>
          <span className="sidebar-info-icon">
            <Icon name="database" size={16} />
          </span>
          <span className="sidebar-info-text">
            <strong>Local workspace</strong>
            <span className="brand-sub">
              <span className="sidebar-info-dot" aria-hidden="true" />
              API on :5200 · SQLite
            </span>
          </span>
        </div>
        <button type="button" className="nav-item collapse-toggle" onClick={onToggleCollapsed} aria-expanded={!collapsed} aria-controls="app-sidebar">
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} />
          <span className="nav-text">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
      </div>
    </aside>
  )
}
