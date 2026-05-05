'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssignmentConfig, AssignmentsStore } from '@/types/config';

const PASSWORD = 'teacher2024';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'assignment';
}

export default function TeacherPage() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentsStore>({});
  const [selectedId, setSelectedId] = useState('');

  // Form fields for the selected assignment
  const [assignmentName, setAssignmentName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [rubric, setRubric] = useState('');
  const [exemplars, setExemplars] = useState<string[]>(['']);
  const [pdfFilename, setPdfFilename] = useState('');
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // New assignment creation
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch('/api/config')
      .then((r) => r.json())
      .then(({ assignments: store }: { assignments: AssignmentsStore }) => {
        const data = store ?? {};
        setAssignments(data);
        const ids = Object.keys(data);
        if (ids.length > 0) populateForm(ids[0], data);
      })
      .finally(() => setLoading(false));
  }, [authed]);

  function populateForm(id: string, store: AssignmentsStore) {
    setSelectedId(id);
    const config = store[id];
    if (config) {
      setAssignmentName(config.name || id);
      setPrompt(config.prompt ?? '');
      setRubric(config.rubric ?? '');
      setExemplars(config.exemplars?.length ? config.exemplars : ['']);
      setPdfFilename(config.assignmentPdfFilename ?? '');
    } else {
      setAssignmentName('');
      setPrompt('');
      setRubric('');
      setExemplars(['']);
      setPdfFilename('');
    }
    setSaveState('idle');
    setSaveError('');
    setPdfUploadError('');
  }

  function handleSelectAssignment(id: string) {
    populateForm(id, assignments);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthed(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  }

  function addExemplar() {
    setExemplars((prev) => [...prev, '']);
  }

  function removeExemplar(index: number) {
    setExemplars((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExemplar(index: number, value: string) {
    setExemplars((prev) => prev.map((ex, i) => (i === index ? value : ex)));
  }

  async function handlePdfUpload(file: File) {
    setPdfUploading(true);
    setPdfUploadError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setPdfFilename(data.filename);
    } catch (err) {
      setPdfUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setPdfUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSaveState('saving');
    setSaveError('');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId,
          name: assignmentName || selectedId,
          prompt,
          rubric,
          exemplars,
          assignmentPdfFilename: pdfFilename,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignments((prev) => ({ ...prev, [selectedId]: data.config }));
        setAssignmentName(data.config.name);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2500);
      } else {
        setSaveState('error');
        setSaveError(data.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setCreateError('Please enter a name.');
      return;
    }
    setCreateError('');

    // Generate a unique ID
    const base = slugify(name);
    let id = base;
    let counter = 2;
    while (assignments[id]) {
      id = `${base}-${counter}`;
      counter++;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, prompt: '', rubric: '', exemplars: [] }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...assignments, [id]: data.config };
        setAssignments(updated);
        populateForm(id, updated);
        setNewName('');
        setCreatingNew(false);
      } else {
        setCreateError(data.error || 'Failed to create assignment.');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create assignment.');
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const name = assignments[selectedId]?.name || selectedId;
    if (!confirm(`Delete assignment "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/config?id=${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const updated = { ...assignments };
        delete updated[selectedId];
        setAssignments(updated);
        const ids = Object.keys(updated);
        if (ids.length > 0) {
          populateForm(ids[0], updated);
        } else {
          setSelectedId('');
          setAssignmentName('');
          setPrompt('');
          setRubric('');
          setExemplars(['']);
          setPdfFilename('');
        }
      } else {
        alert(data.error || 'Failed to delete assignment.');
      }
    } catch {
      alert('Failed to delete assignment. Please try again.');
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Teacher Login</h1>
          <p className="text-sm text-slate-500 mb-6">Enter the teacher password to configure assignments.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-red-600">Incorrect password. Try again.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 text-sm transition-colors"
            >
              Log In
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/" className="text-xs text-slate-400 hover:text-slate-600 underline">
              ← Back to student view
            </a>
          </div>
        </div>
      </div>
    );
  }

  const assignmentIds = Object.keys(assignments);
  const hasAssignments = assignmentIds.length > 0;

  return (
    <div className="min-h-screen py-10 px-4 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">Teacher Config</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage assignments and their rubrics</p>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Lock
          </button>
        </header>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading assignments…</div>
        ) : (
          <>
            {/* Assignment selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Assignment
                  </label>
                  {hasAssignments ? (
                    <select
                      value={selectedId}
                      onChange={(e) => handleSelectAssignment(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {assignmentIds.map((id) => (
                        <option key={id} value={id}>
                          {assignments[id].name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-slate-400 py-2">No assignments yet.</p>
                  )}
                </div>
                <div className="flex gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => { setCreatingNew(true); setNewName(''); setCreateError(''); }}
                    className="rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-sm font-medium px-3 py-2 transition-colors whitespace-nowrap"
                  >
                    + New
                  </button>
                  {hasAssignments && selectedId && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium px-3 py-2 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {creatingNew && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    New Assignment Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
                      placeholder="e.g. Persuasive Essay Unit 3"
                      autoFocus
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreatingNew(false); setNewName(''); setCreateError(''); }}
                      className="rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm px-3 py-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {createError && (
                    <p className="mt-1 text-xs text-red-600">{createError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Assignment config form */}
            {selectedId ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="assignmentName">
                      Assignment Name
                    </label>
                    <input
                      id="assignmentName"
                      type="text"
                      value={assignmentName}
                      onChange={(e) => setAssignmentName(e.target.value)}
                      placeholder="e.g. Persuasive Essay Unit 3"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="prompt">
                      Assignment Prompt
                    </label>
                    <p className="text-xs text-slate-400 mb-2">What students are being asked to write.</p>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. Write a 5-paragraph persuasive essay arguing for or against school uniforms..."
                      rows={5}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="rubric">
                      Scoring Rubric
                    </label>
                    <p className="text-xs text-slate-400 mb-2">
                      Paste your full rubric with criteria names and score descriptions.
                    </p>
                    <textarea
                      id="rubric"
                      value={rubric}
                      onChange={(e) => setRubric(e.target.value)}
                      placeholder="e.g.&#10;Thesis (4 pts): 4 - Clear, arguable thesis... 3 - Thesis present but...&#10;Evidence (4 pts): ..."
                      rows={8}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700">Exemplar Responses</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Paste one or more high-quality example responses to help calibrate scoring.
                    </p>
                  </div>

                  {exemplars.map((ex, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Exemplar {i + 1}</span>
                        {exemplars.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExemplar(i)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <textarea
                        value={ex}
                        onChange={(e) => updateExemplar(i, e.target.value)}
                        placeholder={`Paste exemplar response ${i + 1} here...`}
                        rows={6}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addExemplar}
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline transition-colors"
                  >
                    + Add another exemplar
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Assignment PDF <span className="font-normal text-slate-400">(optional)</span>
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    Upload a PDF and students will see a &ldquo;View Assignment&rdquo; link on the submission page.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={pdfUploading}
                      className="rounded-lg border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 text-sm font-medium px-4 py-2 transition-colors"
                    >
                      {pdfUploading ? 'Uploading…' : pdfFilename ? 'Replace PDF' : 'Upload PDF'}
                    </button>
                    {pdfFilename && !pdfUploading && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span>📄</span> {pdfFilename.split('/').pop() ?? pdfFilename}
                        <button
                          type="button"
                          onClick={() => setPdfFilename('')}
                          className="ml-1 text-slate-300 hover:text-red-400 transition-colors"
                          aria-label="Remove PDF"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePdfUpload(f);
                        e.target.value = '';
                      }}
                    />
                  </div>
                  {pdfUploadError && (
                    <p className="mt-2 text-xs text-red-600">{pdfUploadError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saveState === 'saving'}
                    className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 text-sm transition-colors"
                  >
                    {saveState === 'saving'
                      ? 'Saving…'
                      : saveState === 'saved'
                      ? '✓ Saved!'
                      : saveState === 'error'
                      ? 'Error — try again'
                      : 'Save Configuration'}
                  </button>
                </div>
                {saveState === 'error' && saveError && (
                  <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs text-red-700 font-mono break-all">
                    Error: {saveError}
                  </p>
                )}
              </form>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                Create a new assignment to get started.
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-slate-400 hover:text-slate-600 underline">
            ← Student view
          </a>
        </div>
      </div>
    </div>
  );
}
