import { Redis } from '@upstash/redis';
import type { AssignmentConfig } from '@/types/config';
import StudentPageClient from './StudentPageClient';

export const dynamic = 'force-dynamic';

async function getConfig(): Promise<AssignmentConfig | null> {
  try {
    const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)?.trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)?.trim();
    if (!url || !token) return null;
    const redis = new Redis({ url, token });
    return await redis.get<AssignmentConfig>('assignment_config');
  } catch {
    return null;
  }
}

export default async function Page() {
  const config = await getConfig();
  return <StudentPageClient config={config} />;
}
