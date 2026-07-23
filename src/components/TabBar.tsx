import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

const tabs: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Train', icon: 'dumbbell', end: true },
  { to: '/plans', label: 'Plans', icon: 'clipboard' },
  { to: '/progress', label: 'Progress', icon: 'chart' },
  { to: '/library', label: 'Library', icon: 'book' },
]

export function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          <Icon name={t.icon} className="tab-icon" />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
