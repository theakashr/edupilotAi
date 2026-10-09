import { NextRequest, NextResponse } from 'next/server';
import { agnesClient } from '@/services/ai/agnes/agnesClient';
import { z } from 'zod';

const analyticsRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    topic: z.string(),
    issue: z.string(),
    suggestion: z.string(),
    practiceActivities: z.array(z.string()),
  }))
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId, topicStats } = body;

    if (!courseId || !topicStats) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert educational AI assistant.
Analyze the following class performance data for various topics.
Identify the weakest topics (lowest average scores or highest number of struggling students).
Provide targeted recommendations for the teacher on what topics to revise and specific practice activities to provide.`
      },
      {
        role: 'user' as const,
        content: `Class Performance Data:
${JSON.stringify(topicStats, null, 2)}

Provide actionable recommendations.`
      }
    ];

    const result = await agnesClient.completeChat(messages, analyticsRecommendationSchema, {
      responseFormat: 'json_object',
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: unknown) {
    console.error('Class analytics AI error:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
