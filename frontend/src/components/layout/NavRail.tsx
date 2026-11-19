import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Upload, Wrench, BarChart3, FlaskConical,
  TrendingUp, Target, Lightbulb, Map, FileText
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'

const sections = [
  {
    label: 'DATA',
    color: '#E36B4B',
    items: [
      { to: '/intake', icon: Upload, label: 'Intake' },
      { to: '/preparation', icon: Wrench, label: 'Preparation' },
    ],
  },
  {
    label: 'ANALYSIS',
    color: '#377E75',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/mining', icon: FlaskConical, label: 'Mining Lab' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    color: '#C5D66B',
    items: [
      { to: '/signals', icon: TrendingUp, label: 'Emerging Signals' },
      { to: '/opportunities', icon: Target, label: 'Opportunities' },
      { to: '/features', icon: Lightbulb, label: 'Feature Requests' },
      { to: '/roadmap', icon: Map, label: 'Roadmap' },
    ],
  },
  {
    label: 'OUTPUT',
    color: '#596662',
    items: [
      { to: '/reports', icon: FileText, label: 'Reports' },
    ],
  },
]

export default function NavRail() {
  const { activeDatasetName } = useAppStore()

  return (
    <aside
      style={{ backgroundColor: '#182D29', width: 220, flexShrink: 0 }}
      className="flex flex-col h-screen"
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <NavLink to="/" className="flex items-center gap-2">
          <div
            style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: '#E36B4B', flexShrink: 0 }}
          />
          <span style={{ fontFamily: 'Fraunces, Georgia, serif', color: '#F3F0E6', fontSize: 18, fontWeight: 700 }}>
            SignalWeave
          </span>
        </NavLink>
      </div>

      {/* Overview */}
      <div className="px-3 pt-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
          }
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard size={16} style={{ color: isActive ? '#377E75' : '#D9D8CC' }} />
              <span>Overview</span>
            </>
          )}
        </NavLink>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="flex items-center gap-2 px-2 py-1 mb-1">
              <div style={{ width: 20, height: 2, backgroundColor: section.color, borderRadius: 1 }} />
              <span className="section-label">{section.label}</span>
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={15} style={{ color: isActive ? '#377E75' : '#D9D8CC', flexShrink: 0 }} />
                      <span style={{ fontSize: 13 }}>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Dataset indicator */}
      <div className="px-4 py-3 border-t border-white/10">
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#596662', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Active Dataset
        </p>
        <p style={{ color: '#D9D8CC', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeDatasetName ?? '— none selected —'}
        </p>
      </div>
    </aside>
  )
}
