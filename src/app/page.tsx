import { Redis } from '@upstash/redis';
import type { AssignmentConfig } from '@/types/config';
import StudentPageClient from './StudentPageClient';

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

  return (
    <>
      <div id="sv" style={{display:'none'}}>SERVER-V3-READY={String(isReady)}</div>
      <StudentPageClient isReady={isReady} pdfUrl={pdfUrl} />
    </>
  );
}
