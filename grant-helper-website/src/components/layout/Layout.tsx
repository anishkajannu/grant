import { type ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  activeView: string;
  onNavigate: (viewId: string) => void;
}

export default function Layout({ children, activeView, onNavigate }: LayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <div className="main-container">
        <TopNav currentView={activeView} />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
