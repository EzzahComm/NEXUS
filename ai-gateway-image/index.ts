import 'dotenv/config';
import { createOpenAI } from '@ai-sdk/openai';
import { experimental_generateImage as generateImage } from 'ai';
import * as fs from 'fs';

const gateway = createOpenAI({
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY,
  compatibility: 'compatible',
});

async function main() {
  const prompt = 'A futuristic city at sunset with glowing neon lights, photorealistic';
  console.log(`Generating image: "${prompt}"\n`);

  const { image } = await generateImage({
    model: gateway.image('google/gemini-3.1-flash-image-preview'),
    prompt,
  });

  const filename = 'output.png';
  fs.writeFileSync(filename, image.uint8Array);
  console.log(`Image saved to ${filename} (${image.uint8Array.length} bytes)`);
}

main().catch(console.error);
