import { LoginForm } from './components/LoginForm';
import { FragmentDashboard } from './components/FragmentDashboard';
import { useAuth } from './hooks/useAuth';
import { useFragments } from './hooks/useFragments';
import { config } from './config';
import './App.css';

function App() {
  const auth = useAuth(config.apiBaseUrl);
  const fragments = useFragments(config.apiBaseUrl, auth.user?.token ?? null);

  // Loading screen during session validation
  if (auth.isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-logo">◈</div>
        <div className="loading-text">Initializing...</div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!auth.isAuthenticated || !auth.user) {
    return (
      <LoginForm
        onSubmit={auth.signIn}
        isLoading={auth.isLoading}
        error={auth.error}
      />
    );
  }

  // Authenticated — show dashboard
  return (
    <FragmentDashboard
      fragments={fragments.fragments}
      isLoading={fragments.isLoading}
      error={fragments.error}
      onLoad={fragments.loadFragments}
      onCreate={fragments.createFragment}
      onDelete={fragments.deleteFragment}
      onSignOut={auth.signOut}
      username={auth.user.username}
    />
  );
}

export default App;
