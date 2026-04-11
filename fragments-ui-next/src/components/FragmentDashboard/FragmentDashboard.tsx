import { useEffect, useState } from 'react';
import type { Fragment } from '../../types';
import './FragmentDashboard.css';

interface FragmentDashboardProps {
  fragments: Fragment[];
  isLoading: boolean;
  error: string | null;
  onLoad: () => Promise<void>;
  onCreate: (content: string | ArrayBuffer, contentType: string) => Promise<Fragment | null>;
  onDelete: (id: string) => Promise<boolean>;
  onSignOut: () => void;
  username: string;
}

export function FragmentDashboard({
  fragments,
  isLoading,
  error,
  onLoad,
  onCreate,
  onDelete,
  onSignOut,
  username,
}: FragmentDashboardProps) {
  const [newContent, setNewContent] = useState('');
  const [contentType, setContentType] = useState('text/plain');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    const result = await onCreate(newContent, contentType);
    if (result) {
      setNewContent('');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(`Delete fragment ${id.slice(0, 8)}...?`);
    if (!confirmed) return;
    await onDelete(id);
    if (selectedId === id) setSelectedId(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      'text/plain': 'TXT',
      'text/markdown': 'MD',
      'text/html': 'HTML',
      'text/csv': 'CSV',
      'application/json': 'JSON',
      'application/yaml': 'YAML',
      'image/png': 'PNG',
      'image/jpeg': 'JPEG',
      'image/webp': 'WEBP',
      'image/gif': 'GIF',
      'image/avif': 'AVIF',
    };
    return map[type] || type;
  };

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <header className="dashboard-header">
        <div className="header-left">
          <span className="header-logo">◈</span>
          <h1>Fragments</h1>
          <span className="header-badge">v2.0</span>
        </div>
        <div className="header-right">
          <span className="header-user">{username}</span>
          <button className="btn-ghost" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="dashboard-body">
        {/* Create Panel */}
        <section className="panel create-panel">
          <h2 className="panel-title">Create Fragment</h2>
          <form onSubmit={handleCreate} className="create-form">
            <div className="form-row">
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="type-select"
              >
                <option value="text/plain">Plain Text</option>
                <option value="text/markdown">Markdown</option>
                <option value="text/html">HTML</option>
                <option value="text/csv">CSV</option>
                <option value="application/json">JSON</option>
                <option value="application/yaml">YAML</option>
              </select>
              <button type="submit" className="btn-primary" disabled={isLoading || !newContent.trim()}>
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter your fragment content..."
              className="content-textarea"
              rows={4}
            />
          </form>
        </section>

        {/* Error Display */}
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        )}

        {/* Fragment List */}
        <section className="panel fragments-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              Fragments
              <span className="count-badge">{fragments.length}</span>
            </h2>
            <button className="btn-ghost" onClick={onLoad} disabled={isLoading}>
              {isLoading ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>

          {fragments.length === 0 && !isLoading ? (
            <div className="empty-state">
              <span className="empty-icon">📄</span>
              <p>No fragments yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="fragment-grid">
              {fragments.map((fragment) => (
                <div
                  key={fragment.id}
                  className={`fragment-card ${selectedId === fragment.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(fragment.id === selectedId ? null : fragment.id)}
                >
                  <div className="card-top">
                    <span className="type-badge">{getTypeLabel(fragment.type)}</span>
                    <span className="card-size">{fragment.size}B</span>
                  </div>
                  <div className="card-id" title={fragment.id}>
                    {fragment.id.slice(0, 8)}...
                  </div>
                  <div className="card-meta">
                    <span>{formatDate(fragment.created)}</span>
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn-danger-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(fragment.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
