import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import type { AssignmentConfig, AssignmentsStore } from '@/types/config';

const ASSIGNMENTS_KEY = 'assignments';

function getRedis() {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)?.trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)?.trim();
  if (!url || !token) throw new Error('Missing Redis env vars');
  return new Redis({ url, token });
}

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { studentName, essay, assignmentId } = await req.json();

  if (!studentName?.trim() || !essay?.trim()) {
    return NextResponse.json({ error: 'Name and essay are required.' }, { status: 400 });
  }

  if (!assignmentId?.trim()) {
    return NextResponse.json({ error: 'Please select an assignment.' }, { status: 400 });
  }

  let config: AssignmentConfig | null = null;
  try {
    const redis = getRedis();
    const assignments = await redis.get<AssignmentsStore>(ASSIGNMENTS_KEY);
    config = assignments?.[assignmentId] ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to load config: ${message}` }, { status: 500 });
  }

  if (!config?.prompt?.trim() || !config?.rubric?.trim()) {
    return NextResponse.json(
      { error: 'Assignment not configured. Please ask your teacher to set up the assignment.' },
      { status: 400 }
    );
  }

  const exemplarsSection = config.exemplars?.length
    ? `\n\n---\n\n## EXEMPLAR RESPONSES\n\nThe following are high-quality exemplar responses for this assignment. Use them to calibrate your scoring and understand what strong work looks like:\n\n${config.exemplars.map((ex, i) => `### Exemplar ${i + 1}\n\n${ex}`).join('\n\n')}`
    : '';

  const systemPrompt = `You are an expert writing instructor providing detailed, constructive feedback on student essay drafts.

## ASSIGNMENT PROMPT

${config.prompt}

## SCORING RUBRIC

${config.rubric}${exemplarsSection}

---

## YOUR TASK

Analyze the student's essay draft against the rubric above. Provide feedback organized **by each rubric criterion**. For each criterion:

1. Start with a level-2 heading: \`## [Criterion Name]\`
2. Give a **Predicted Score:** line (use the exact score labels from the rubric)
3. Write 1–2 sentences explaining the score with specific reference to the student's text
4. Provide **2–3 Revision Suggestions** as a numbered list. Each suggestion must:
   - Be specific and actionable (not generic advice)
   - Quote or closely reference actual text from the student's draft using a blockquote (\`>\`)
   - Explain exactly what to change and why it will strengthen the score

End with a brief \`## Overall Impression\` section (3–4 sentences) that names the essay's greatest strength and its single highest-priority revision focus.

Use markdown formatting throughout. Be encouraging but honest — students benefit most from specific, targeted feedback tied to their actual writing.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Please provide feedback on this essay draft by **${studentName}**:\n\n---\n\n${essay}\n\n---`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
