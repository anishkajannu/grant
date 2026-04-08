import './Sidebar.css';

type NavItem = {
  id: string;
  label: string;
  shortLabel: string;
};

const navItems: NavItem[] = [
  { id: 'profile', label: 'Organization Profile', shortLabel: '01' },
  { id: 'search', label: 'Find Grants', shortLabel: '02' },
  { id: 'workspace', label: 'Grant Workspace', shortLabel: '03' },
];

interface SidebarProps {
  activeView: string;
  onNavigate: (viewId: string) => void;
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <p className="sidebar-eyebrow">Grant workflow system</p>
        <h1 className="sidebar-logo">GrantFlow</h1>
        <p className="sidebar-tagline">Search, organize, and complete grant applications with less repeated work.</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">{item.shortLabel}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="footer-text">Built for nonprofit funding teams</p>
      </div>
    </aside>
  );
}
