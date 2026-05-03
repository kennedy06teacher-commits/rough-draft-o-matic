import { Redis } from '@upstash/redis';
import type { AssignmentConfig } from '@/types/config';
import StudentPageClient from './StudentPageClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let config: AssignmentConfig | null = null;
  let debugError = '';

  try {
    const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)?.trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)?.trim();
    if (!url || !token) {
      debugError = `Missing env vars — URL: ${url ? 'set' : 'MISSING'}, TOKEN: ${token ? 'set' : 'MISSING'}`;
    } else {
      const redis = new Redis({ url, token });
      config = await redis.get<AssignmentConfig>('assignment_config');
      if (!config) debugError = 'Redis returned null for key "assignment_config"';
    }
  } catch (err) {
    debugError = err instanceof Error ? err.message : String(err);
  }

  return <StudentPageClient config={config} debugError={debugError} />;
}
