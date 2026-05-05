import { Redis } from '@upstash/redis';
import type { AssignmentsStore } from '@/types/config';
import StudentForm from './StudentForm';

export const dynamic = 'force-dynamic';

export interface AssignmentOption {
  name: string;
  pdfUrl: string;
}

export default async function Page() {
  let assignments: Record<string, AssignmentOption> = {};

  try {
    const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)?.trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)?.trim();
    if (url && token) {
      const redis = new Redis({ url, token });
      const store = await redis.get<AssignmentsStore>('assignments');
      if (store) {
        for (const [id, config] of Object.entries(store)) {
          if (config?.prompt?.trim() && config?.rubric?.trim()) {
            assignments[id] = {
              name: config.name || id,
              pdfUrl: config.assignmentPdfFilename ?? '',
            };
          }
        }
      }
    }
  } catch {
    // assignments stays empty
  }

  if (Object.keys(assignments).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Not Ready Yet</h1>
          <p className="text-slate-500">
            Your teacher hasn&apos;t configured any assignments yet. Please check back later or ask
            your teacher to set up the assignment.
          </p>
          <a
            href="/teacher"
            className="mt-6 inline-block text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Teacher login →
          </a>
        </div>
      </div>
    );
  }

  return <StudentForm assignments={assignments} />;
}
