import { Redis } from '@upstash/redis';
import type { AssignmentConfig } from '@/types/config';
import StudentForm from './StudentForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let isReady = false;
  let pdfUrl = '';

  try {
    const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)?.trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)?.trim();
    if (url && token) {
      const redis = new Redis({ url, token });
      const config = await redis.get<AssignmentConfig>('assignment_config');
      isReady = !!(config?.prompt?.trim() && config?.rubric?.trim());
      pdfUrl = config?.assignmentPdfFilename ?? '';
    }
  } catch {
    // isReady stays false
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Not Ready Yet</h1>
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
        </div>
      </div>
    );
  }

  return <StudentForm pdfUrl={pdfUrl} />;
}
