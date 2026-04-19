
import React, { useEffect, useMemo, useState } from 'react';
import Landing from './components/Landing';
import MapContainer from './components/MapContainer';
import MapContainerOsm from './components/MapContainerOsm';
import Navbar from './components/Navbar';
import ReportsPage from './components/ReportsPage';
import ProfilePage from './components/ProfilePage';
import AlertsPage from './components/AlertsPage';
import { clearAuth, loadAuth, saveAuth } from './lib/auth';

export default function App() {
  const apiBaseUrl = useMemo(() => 'http://localhost:5000', []);
  const [auth, setAuth] = useState(() => loadAuth());
  const [view, setView] = useState('dashboard'); // dashboard | live | give | reports | alerts | profile
  const mapProvider = process.env.REACT_APP_MAP_PROVIDER || 'osm'; // 'osm' (no billing) | 'google'

  useEffect(() => {
    if (!auth) setView('dashboard');
  }, [auth]);

  const logout = () => {
    clearAuth();
    setAuth(null);
    setView('dashboard');
  };

  return (
    <div className="h-full w-full">
      <Navbar
        activeKey={view === 'give' ? 'live' : view}
        onNavigate={(key) => {
          if (key === 'live') setView('live');
          if (key === 'dashboard') setView('dashboard');
          if (key === 'reports') setView('reports');
          if (key === 'alerts') setView('alerts');
          if (key === 'profile') setView('profile');
        }}
      />

      {!auth ? (
        <Landing
          apiBaseUrl={apiBaseUrl}
          auth={auth}
          onAuthed={(data) => {
            saveAuth(data);
            setAuth(data);
          }}
          onPickMode={(m) => setView(m === 'give' ? 'give' : 'live')}
        />
      ) : view === 'dashboard' ? (
        <Landing
          apiBaseUrl={apiBaseUrl}
          auth={auth}
          onAuthed={(data) => {
            saveAuth(data);
            setAuth(data);
          }}
          onPickMode={(m) => setView(m === 'give' ? 'give' : 'live')}
        />
      ) : view === 'profile' ? (
        <ProfilePage auth={auth} onLogout={logout} onBack={() => setView('dashboard')} />
      ) : view === 'reports' ? (
        <ReportsPage
          apiBaseUrl={apiBaseUrl}
          auth={auth}
          onOpenLive={() => setView('live')}
          onGiveReport={() => setView('give')}
          onBack={() => setView('dashboard')}
        />
      ) : view === 'alerts' ? (
        <AlertsPage
          apiBaseUrl={apiBaseUrl}
          auth={auth}
          onOpenLive={() => setView('live')}
          onBack={() => setView('dashboard')}
        />
      ) : (
        mapProvider === 'google' ? (
          <MapContainer
            apiBaseUrl={apiBaseUrl}
            auth={auth}
            defaultOpenReportModal={view === 'give'}
            onExit={() => setView('dashboard')}
            onLogout={logout}
          />
        ) : (
          <MapContainerOsm
            apiBaseUrl={apiBaseUrl}
            auth={auth}
            defaultOpenReportModal={view === 'give'}
            onExit={() => setView('dashboard')}
            onLogout={logout}
          />
        )
      )}
    </div>
  );
}
