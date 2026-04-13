import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import type { Fragment } from '../../types';
import { createApiClient } from '../../services';
import './FragmentDashboard.css';

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb); window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
}
function getOnlineSnapshot() { return navigator.onLine; }
function useOnlineStatus() { return useSyncExternalStore(subscribeOnline, getOnlineSnapshot); }

const CONVERSION_MAP: Record<string, string[]> = {
  'text/plain': ['text/plain'], 'text/markdown': ['text/markdown', 'text/html', 'text/plain'],
  'text/html': ['text/html', 'text/plain'], 'text/csv': ['text/csv', 'text/plain', 'application/json'],
  'application/json': ['application/json', 'application/yaml', 'text/plain'],
  'application/yaml': ['application/yaml', 'text/plain'],
  'image/png': ['image/png','image/jpeg','image/webp','image/avif','image/gif'],
  'image/jpeg': ['image/png','image/jpeg','image/webp','image/avif','image/gif'],
  'image/webp': ['image/png','image/jpeg','image/webp','image/avif','image/gif'],
  'image/gif': ['image/png','image/jpeg','image/webp','image/avif','image/gif'],
  'image/avif': ['image/png','image/jpeg','image/webp','image/avif','image/gif'],
};
const MIME_TO_EXT: Record<string, string> = {
  'text/plain':'txt','text/markdown':'md','text/html':'html','text/csv':'csv',
  'application/json':'json','application/yaml':'yaml',
  'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/avif':'avif',
};
const TYPE_LABELS: Record<string, string> = {
  'text/plain':'TXT','text/markdown':'MD','text/html':'HTML','text/csv':'CSV',
  'application/json':'JSON','application/yaml':'YAML',
  'image/png':'PNG','image/jpeg':'JPEG','image/webp':'WEBP','image/gif':'GIF','image/avif':'AVIF',
};
const TYPE_CLASSES: Record<string, string> = {
  'text/plain':'tag--stone','text/markdown':'tag--sky','text/html':'tag--amber',
  'text/csv':'tag--teal','application/json':'tag--mint','application/yaml':'tag--violet',
  'image/png':'tag--emerald','image/jpeg':'tag--rose','image/webp':'tag--coral',
  'image/gif':'tag--gold','image/avif':'tag--plum',
};
const IMAGE_TYPES = ['image/png','image/jpeg','image/webp','image/gif','image/avif'];
const TEXT_TYPES = ['text/plain','text/markdown','text/html','text/csv','application/json','application/yaml'];

interface Props {
  fragments: Fragment[]; isLoading: boolean; error: string | null;
  onLoad: () => Promise<void>;
  onCreate: (content: string | ArrayBuffer, contentType: string) => Promise<Fragment | null>;
  onUpdate: (id: string, content: string | ArrayBuffer, contentType: string) => Promise<Fragment | null>;
  onDelete: (id: string) => Promise<boolean>;
  onSignOut: () => void; username: string; token: string; apiBaseUrl: string;
}

export function FragmentDashboard({ fragments, isLoading, error, onLoad, onCreate, onUpdate, onDelete, onSignOut, username, token, apiBaseUrl }: Props) {
  const isOnline = useOnlineStatus();
  const [newContent, setNewContent] = useState('');
  const [contentType, setContentType] = useState('text/plain');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);
  const [fragmentContent, setFragmentContent] = useState<string | null>(null);
  const [fragmentBlobUrl, setFragmentBlobUrl] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [convertTarget, setConvertTarget] = useState('');
  const [convertedContent, setConvertedContent] = useState<string | null>(null);
  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const api = createApiClient({ baseUrl: apiBaseUrl });
  useEffect(() => { onLoad(); }, [onLoad]);
  useEffect(() => { return () => { if (fragmentBlobUrl) URL.revokeObjectURL(fragmentBlobUrl); if (convertedBlobUrl) URL.revokeObjectURL(convertedBlobUrl); if (imagePreview) URL.revokeObjectURL(imagePreview); }; }, [fragmentBlobUrl, convertedBlobUrl, imagePreview]);

  const isImg = (t: string) => IMAGE_TYPES.includes(t);

  const loadContent = useCallback(async (f: Fragment) => {
    setContentLoading(true); setFragmentContent(null);
    if (fragmentBlobUrl) { URL.revokeObjectURL(fragmentBlobUrl); setFragmentBlobUrl(null); }
    try {
      const r = await api.getFragmentData(token, f.id);
      if (isImg(f.type)) setFragmentBlobUrl(URL.createObjectURL(await r.blob()));
      else setFragmentContent(await r.text());
    } catch { setFragmentContent('[Failed to load]'); }
    setContentLoading(false);
  }, [token, api, fragmentBlobUrl]);

  const handleSelect = async (f: Fragment) => {
    if (selectedFragment?.id === f.id) { setSelectedFragment(null); setFragmentContent(null); setFragmentBlobUrl(null); setIsEditing(false); setConvertedContent(null); setConvertedBlobUrl(null); setConvertTarget(''); return; }
    setSelectedFragment(f); setIsEditing(false); setConvertedContent(null); setConvertedBlobUrl(null); setConvertTarget('');
    await loadContent(f);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImg(contentType)) {
      if (!imageFile) return;
      const r = await onCreate(await imageFile.arrayBuffer(), contentType);
      if (r) { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
    } else {
      if (!newContent.trim()) return;
      if (await onCreate(newContent, contentType)) setNewContent('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null; setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleTypeChange = (t: string) => {
    setContentType(t);
    if (isImg(t) && !isImg(contentType)) setNewContent('');
    if (!isImg(t) && isImg(contentType)) { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Delete ${id.slice(0, 8)}...?`)) return;
    await onDelete(id);
    if (selectedFragment?.id === id) { setSelectedFragment(null); setFragmentContent(null); setFragmentBlobUrl(null); }
  };

  const handleSaveEdit = async () => {
    if (!selectedFragment) return;
    const r = await onUpdate(selectedFragment.id, editContent, selectedFragment.type);
    if (r) { setIsEditing(false); setSelectedFragment(r); setFragmentContent(editContent); }
  };

  const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFragment) return; const file = e.target.files?.[0]; if (!file) return;
    const r = await onUpdate(selectedFragment.id, await file.arrayBuffer(), selectedFragment.type);
    if (r) { setSelectedFragment(r); await loadContent(r); }
  };

  const handleConvert = async () => {
    if (!selectedFragment || !convertTarget) return; setConverting(true);
    if (convertedBlobUrl) { URL.revokeObjectURL(convertedBlobUrl); setConvertedBlobUrl(null); }
    setConvertedContent(null);
    try {
      const r = await api.convertFragment(token, selectedFragment.id, MIME_TO_EXT[convertTarget] || convertTarget);
      if (isImg(convertTarget)) setConvertedBlobUrl(URL.createObjectURL(await r.blob()));
      else setConvertedContent(await r.text());
    } catch { setConvertedContent('[Conversion failed]'); }
    setConverting(false);
  };

  const handleDownload = () => {
    if (!selectedFragment || !convertTarget) return;
    const a = document.createElement('a');
    a.download = `${selectedFragment.id.slice(0, 8)}.${MIME_TO_EXT[convertTarget] || 'bin'}`;
    if (convertedBlobUrl) a.href = convertedBlobUrl;
    else if (convertedContent) { const u = URL.createObjectURL(new Blob([convertedContent], { type: convertTarget })); a.href = u; setTimeout(() => URL.revokeObjectURL(u), 100); }
    else return;
    a.click();
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
  const lbl = (t: string) => TYPE_LABELS[t] || t;
  const cls = (t: string) => TYPE_CLASSES[t] || 'tag--stone';
  const convTargets = (t: string) => (CONVERSION_MAP[t] || []).filter(x => x !== t);
  const canCreate = isImg(contentType) ? !!imageFile : !!newContent.trim();
  const totalSize = fragments.reduce((s, f) => s + f.size, 0);
  const typeCount = new Set(fragments.map(f => f.type)).size;

  return (
    <div className="nx">
      {/* ═══ HEADER ═══ */}
      <header className="nx-header">
        <div className="nx-header-left">
          <div className="nx-logo">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none"><path d="M24 4L40 14V34L24 44L8 34V14L24 4Z" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="24" cy="22" r="4" fill="currentColor"/></svg>
          </div>
          <div className="nx-header-title">
            <span className="nx-header-name">FRAGMENTS</span>
            <span className="nx-header-sub">NEXUS // ARCHIVE ENGINE</span>
          </div>
        </div>
        <div className="nx-header-center">
          {!isOnline && <div className="nx-offline-pill"><span className="nx-pulse nx-pulse--warn" />OFFLINE MODE</div>}
        </div>
        <div className="nx-header-right">
          <div className="nx-header-stat">
            <span className="nx-header-stat-val">{fragments.length}</span>
            <span className="nx-header-stat-lbl">Fragments</span>
          </div>
          <div className="nx-header-stat">
            <span className="nx-header-stat-val">{fmtSize(totalSize)}</span>
            <span className="nx-header-stat-lbl">Total Size</span>
          </div>
          <div className="nx-header-stat">
            <span className="nx-header-stat-val">{typeCount}</span>
            <span className="nx-header-stat-lbl">Types</span>
          </div>
          <div className="nx-header-sep" />
          <span className="nx-header-user"><span className="nx-pulse nx-pulse--ok" />{username}</span>
          <button className="nx-btn-ghost" onClick={onSignOut}>Disconnect</button>
        </div>
      </header>

      <div className="nx-body">
        {/* ═══ STATS BAR ═══ */}
        <div className="nx-stats">
          {TEXT_TYPES.concat(IMAGE_TYPES).map(t => {
            const count = fragments.filter(f => f.type === t).length;
            if (count === 0) return null;
            return <div key={t} className="nx-stat-chip"><span className={`nx-tag ${cls(t)}`}>{lbl(t)}</span><span className="nx-stat-chip-count">{count}</span></div>;
          })}
          {fragments.length === 0 && <span className="nx-stats-empty">No fragments in archive</span>}
        </div>

        {/* ═══ MAIN GRID ═══ */}
        <div className={`nx-grid ${selectedFragment ? 'nx-grid--split' : ''}`}>

          {/* LEFT COLUMN: Create + List */}
          <div className="nx-col-main">
            {/* ── Create Card ── */}
            <div className="nx-card" style={{ animationDelay: '0.1s' }}>
              <div className="nx-card-bar"><span className="nx-card-bar-label">NEW FRAGMENT</span><span className="nx-card-bar-accent" /></div>
              <form onSubmit={handleCreate} className="nx-card-body">
                <div className="nx-form-row">
                  <div className="nx-form-field nx-form-field--grow">
                    <label className="nx-form-label">FORMAT</label>
                    <select value={contentType} onChange={e => handleTypeChange(e.target.value)} className="nx-select">
                      <optgroup label="Text & Data">{TEXT_TYPES.map(t => <option key={t} value={t}>{lbl(t)} &mdash; {t}</option>)}</optgroup>
                      <optgroup label="Images">{IMAGE_TYPES.map(t => <option key={t} value={t}>{lbl(t)} &mdash; {t}</option>)}</optgroup>
                    </select>
                  </div>
                  <button type="submit" className="nx-btn-action" disabled={isLoading || !canCreate}>
                    {isLoading ? 'Creating...' : '+ Create'}
                  </button>
                </div>
                {isImg(contentType) ? (
                  <div className="nx-upload">
                    <input ref={fileInputRef} type="file" accept={contentType} onChange={handleFileChange} className="nx-sr-only" id="img-up" />
                    <label htmlFor="img-up" className="nx-upload-zone">
                      {imageFile ? <span className="nx-upload-name">{imageFile.name}</span> : <><span className="nx-upload-icon">&#8679;</span><span>Drop or click to upload {lbl(contentType)}</span></>}
                    </label>
                    {imagePreview && <div className="nx-upload-thumb"><img src={imagePreview} alt="Preview" /></div>}
                  </div>
                ) : (
                  <div className="nx-form-field">
                    <label className="nx-form-label">CONTENT</label>
                    <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Enter fragment data..." className="nx-textarea" rows={4} />
                  </div>
                )}
              </form>
            </div>

            {/* ── Error ── */}
            {error && <div className="nx-alert nx-alert--err"><span className="nx-alert-tag">ERROR</span>{error}</div>}

            {/* ── Fragment List ── */}
            <div className="nx-card" style={{ animationDelay: '0.2s' }}>
              <div className="nx-card-bar">
                <span className="nx-card-bar-label">ARCHIVE</span>
                <button className="nx-btn-ghost nx-btn-ghost--sm" onClick={onLoad} disabled={isLoading}>{isLoading ? 'Syncing...' : 'Refresh'}</button>
              </div>
              {fragments.length === 0 && !isLoading ? (
                <div className="nx-empty"><div className="nx-empty-hex">&#x2B21;</div><p>Archive is empty</p><p className="nx-empty-sub">Create your first fragment above</p></div>
              ) : (
                <div className="nx-table">
                  <div className="nx-table-head"><span>Type</span><span>ID</span><span>Size</span><span>Date</span><span></span></div>
                  {fragments.map((f, i) => (
                    <div key={f.id} className={`nx-table-row ${selectedFragment?.id === f.id ? 'nx-table-row--active' : ''}`} onClick={() => handleSelect(f)} style={{ animationDelay: `${0.03 * i}s` }}>
                      <span className={`nx-tag ${cls(f.type)}`}>{lbl(f.type)}</span>
                      <span className="nx-table-id">{f.id.slice(0, 10)}...</span>
                      <span className="nx-table-size">{fmtSize(f.size)}</span>
                      <span className="nx-table-date">{fmtDate(f.created)}{f.updated !== f.created && <span className="nx-edited">MOD</span>}</span>
                      <button className="nx-btn-x" onClick={e => { e.stopPropagation(); handleDelete(f.id); }} title="Delete">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Detail Inspector */}
          {selectedFragment && (
            <div className="nx-col-side">
              <div className="nx-card nx-card--accent">
                <div className="nx-card-bar nx-card-bar--accent">
                  <span className="nx-card-bar-label">INSPECTOR</span>
                  <button className="nx-btn-ghost nx-btn-ghost--sm" onClick={() => { setSelectedFragment(null); setFragmentContent(null); setFragmentBlobUrl(null); setIsEditing(false); setConvertedContent(null); setConvertedBlobUrl(null); }}>Close</button>
                </div>

                {/* Meta */}
                <div className="nx-meta">
                  <div className="nx-meta-main">
                    <span className={`nx-tag nx-tag--lg ${cls(selectedFragment.type)}`}>{lbl(selectedFragment.type)}</span>
                    <span className="nx-meta-id">{selectedFragment.id}</span>
                  </div>
                  <div className="nx-meta-grid">
                    <div className="nx-meta-cell"><span className="nx-meta-k">SIZE</span><span className="nx-meta-v">{fmtSize(selectedFragment.size)}</span></div>
                    <div className="nx-meta-cell"><span className="nx-meta-k">CREATED</span><span className="nx-meta-v">{fmtDate(selectedFragment.created)}</span></div>
                    <div className="nx-meta-cell"><span className="nx-meta-k">MODIFIED</span><span className="nx-meta-v">{fmtDate(selectedFragment.updated)}</span></div>
                    <div className="nx-meta-cell"><span className="nx-meta-k">MIME</span><span className="nx-meta-v">{selectedFragment.type}</span></div>
                  </div>
                </div>

                {/* Content */}
                <div className="nx-inspector-section">
                  <div className="nx-inspector-bar">
                    <span>CONTENT</span>
                    {!isImg(selectedFragment.type) && !isEditing && <button className="nx-btn-ghost nx-btn-ghost--sm" onClick={() => { setEditContent(fragmentContent || ''); setIsEditing(true); }}>Edit</button>}
                    {isImg(selectedFragment.type) && <><input type="file" accept={selectedFragment.type} onChange={handleImageUpdate} className="nx-sr-only" id="img-rep" /><label htmlFor="img-rep" className="nx-btn-ghost nx-btn-ghost--sm" style={{ cursor: 'pointer' }}>Replace</label></>}
                  </div>
                  {contentLoading ? <div className="nx-content-placeholder">Loading...</div>
                  : isEditing ? (
                    <div className="nx-edit"><textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="nx-textarea nx-textarea--lg" rows={10} /><div className="nx-edit-actions"><button className="nx-btn-action nx-btn-action--sm" onClick={handleSaveEdit} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</button><button className="nx-btn-ghost nx-btn-ghost--sm" onClick={() => setIsEditing(false)}>Cancel</button></div></div>
                  ) : isImg(selectedFragment.type) && fragmentBlobUrl ? (
                    <div className="nx-content-img"><img src={fragmentBlobUrl} alt="Fragment" /></div>
                  ) : <pre className="nx-content-pre">{fragmentContent}</pre>}
                </div>

                {/* Convert */}
                {convTargets(selectedFragment.type).length > 0 && (
                  <div className="nx-inspector-section">
                    <div className="nx-inspector-bar"><span>CONVERT</span></div>
                    <div className="nx-convert-row">
                      <select value={convertTarget} onChange={e => { setConvertTarget(e.target.value); setConvertedContent(null); if (convertedBlobUrl) URL.revokeObjectURL(convertedBlobUrl); setConvertedBlobUrl(null); }} className="nx-select nx-select--sm">
                        <option value="">Target format...</option>
                        {convTargets(selectedFragment.type).map(t => <option key={t} value={t}>{lbl(t)} (.{MIME_TO_EXT[t]})</option>)}
                      </select>
                      <button className="nx-btn-action nx-btn-action--sm" onClick={handleConvert} disabled={!convertTarget || converting}>{converting ? '...' : 'Go'}</button>
                    </div>
                    {(convertedContent !== null || convertedBlobUrl) && (
                      <div className="nx-convert-result">
                        <div className="nx-convert-result-bar"><span className={`nx-tag ${cls(convertTarget)}`}>{lbl(convertTarget)}</span><button className="nx-btn-ghost nx-btn-ghost--sm" onClick={handleDownload}>Download</button></div>
                        {convertedBlobUrl ? <div className="nx-content-img"><img src={convertedBlobUrl} alt="Converted" /></div> : <pre className="nx-content-pre nx-content-pre--sm">{convertedContent}</pre>}
                      </div>
                    )}
                  </div>
                )}

                {/* Danger */}
                <div className="nx-inspector-section nx-inspector-section--danger">
                  <button className="nx-btn-danger" onClick={() => handleDelete(selectedFragment.id)}>Delete Fragment</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
