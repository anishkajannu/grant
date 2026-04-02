import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import './TopNav.css';

interface TopNavProps {
  currentView: string;
}

const viewTitles: Record<string, string> = {
  profile: 'Organization Profile',
  search: 'Find Grants',
  workspace: 'Grant Workspace',
};

export default function TopNav({ currentView }: TopNavProps) {
  const [sessionLabel, setSessionLabel] = useState('Not connected');
  const [sessionReady, setSessionReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const userId = session?.user?.id || '';
        if (userId) {
          setSessionLabel(`Connected · ${userId.slice(0, 6)}`);
          setSessionReady(true);
        } else {
          setSessionLabel('Not connected');
          setSessionReady(false);
        }
      } catch {
        if (!mounted) return;
        setSessionLabel('Auth unavailable');
        setSessionReady(false);
      }
    };

    syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const userId = session?.user?.id || '';
      if (userId) {
        setSessionLabel(`Connected · ${userId.slice(0, 6)}`);
        setSessionReady(true);
      } else {
        setSessionLabel('Not connected');
        setSessionReady(false);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        setSessionLabel('Connection failed');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || '';
      if (userId) {
        localStorage.setItem('grantflow.userId', userId);
        setSessionLabel(`Connected · ${userId.slice(0, 6)}`);
        setSessionReady(true);
      }
    } catch {
      setSessionLabel('Connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="topnav">
      <div className="topnav-content">
        <h2 className="topnav-title">{viewTitles[currentView] || 'GrantFlow'}</h2>

        <div className="topnav-actions">
          <div className={`auth-status ${sessionReady ? 'auth-status--connected' : ''}`}>
            <div className="auth-status-copy">
              <span className="auth-status-label">Account</span>
              <span className="auth-status-value">{sessionLabel}</span>
            </div>
            {!sessionReady && (
              <button
                type="button"
                className="auth-status-button"
                onClick={handleConnect}
                disabled={busy}
              >
                {busy ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
          <button className="icon-button" title="Notifications">
            🔔
          </button>
          <button className="icon-button" title="Help">
            ❓
          </button>
        </div>
      </div>
    </header>
  );
}
