import 'dotenv/config';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const gateway = createOpenAI({
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY,
  compatibility: 'compatible',
});

async function main() {
  console.log('Streaming from Vercel AI Gateway (openai/gpt-5.4)...\n');

  const result = streamText({
    model: gateway('openai/gpt-5.4'),
    prompt: 'Explain what Vercel AI Gateway is in two sentences.',
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  const usage = await result.usage;
  console.log('\n\nToken usage:', usage);
}

main().catch(console.error);
