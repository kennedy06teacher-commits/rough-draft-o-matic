'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AssignmentConfig } from '@/types/config';

type AppState = 'form' | 'generating' | 'complete' | 'error';

export default function StudentPageClient({ config, debugError }: { config: AssignmentConfig | null; debugError?: string }) {
  const [appState, setAppState] = useState<AppState>('form');
  const [studentName, setStudentName] = useState('');
  const [essay, setEssay] = useState('');
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!config?.prompt?.trim() || !config?.rubric?.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Not Ready Yet [v2]</h1>
          <p className="text-slate-500">
            Your teacher hasn&apos;t configured the assignment yet. Please check back later or ask
            your teacher to set up the assignment.
          </p>
          <a
            href="/teacher"
            className="mt-6 inline-block text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Teacher login →
          </a>
          {debugError && (
            <pre className="mt-4 text-left text-xs bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 break-all whitespace-pre-wrap">
              {debugError}
            </pre>
          )}
          {!debugError && (
            <pre className="mt-4 text-left text-xs bg-slate-100 rounded-lg p-3 text-slate-500 break-all whitespace-pre-wrap">
              config: {JSON.stringify(config)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim() || !essay.trim()) return;

    setAppState('generating');
    setFeedback('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, essay }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong.');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setFeedback(accumulated);
      }

      setAppState('complete');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setAppState('error');
    }
  }

  function handleNewSubmission() {
    setStudentName('');
    setEssay('');
    setFeedback('');
    setErrorMessage('');
    setAppState('form');
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-700">Rough Draft-o-Matic</h1>
          <p className="mt-1 text-slate-500">Paste your draft below and get rubric-based feedback</p>
          {config.assignmentPdfFilename && (
            <a
              href={config.assignmentPdfFilename}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 underline"
            >
              <span>📄</span> View Assignment
            </a>
          )}
        </header>

        {(appState === 'form' || appState === 'generating' || appState === 'complete' || appState === 'error') && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="name">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="First and last name"
                required
                disabled={appState === 'generating'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="essay">
                Your Essay Draft
              </label>
              <textarea
                id="essay"
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="Paste your essay draft here..."
                required
                rows={12}
                disabled={appState === 'generating'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-400 resize-y"
              />
            </div>

            {appState === 'error' && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {appState !== 'complete' && (
              <button
                type="submit"
                disabled={appState === 'generating' || !studentName.trim() || !essay.trim()}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 text-sm transition-colors"
              >
                {appState === 'generating' ? 'Generating feedback…' : 'Get Feedback'}
              </button>
            )}
          </form>
        )}

        {(appState === 'generating' || appState === 'complete') && feedback && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-indigo-600">✦</span>
              Feedback for {studentName}
              {appState === 'generating' && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </h2>
            <div className="prose prose-slate prose-sm max-w-none prose-headings:text-indigo-700 prose-blockquote:border-indigo-300 prose-blockquote:bg-indigo-50 prose-blockquote:rounded prose-blockquote:py-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback}</ReactMarkdown>
            </div>
          </div>
        )}

        {appState === 'complete' && (
          <div className="mt-4 text-center">
            <button
              onClick={handleNewSubmission}
              className="text-sm text-indigo-600 hover:text-indigo-800 underline"
            >
              Submit another draft
            </button>
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-slate-400">
          <a href="/teacher" className="hover:text-slate-600 underline">
            Teacher login
          </a>
        </footer>
      </div>
    </div>
  );
}
