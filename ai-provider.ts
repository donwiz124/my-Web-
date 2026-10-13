const INSTRUCTIONS: Record<string, string> = {
  'prompt-generator': 'Write a high-quality, reusable AI prompt for the user\'s goal. Include role, context, constraints, output format and quality criteria.',
  'image-prompt-generator': 'Write a detailed image-generation prompt: subject, composition, lighting, camera, environment, style, and a negative prompt.',
  'video-script-generator': 'Write a short-form video script: hook, three value beats, call to action, and shot suggestions.',
  'ugc-script-generator': 'Write a natural-sounding UGC ad script: hook, problem, experience, proof, call to action.',
  'social-caption-generator': 'Write 5 social media captions, each with a distinct angle, hashtags and a call to action.',
  'ad-copy-generator': 'Write 3 ad variations, each with headline, primary text and call to action.',
  'business-name-generator': 'Suggest 15 memorable, brandable business names grouped by style, with a one-line rationale each.',
  'product-description-generator': 'Write a persuasive product description with benefits, key features and a call to action.',
  'website-copy-generator': 'Write homepage copy: hero headline and subheadline, value proposition, three benefits, trust section, call to action.',
};

export const aiConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

export async function generateWithProvider(tool: string, input: unknown): Promise<string> {
  if (!aiConfigured()) throw new Error('AI provider is not configured');
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': process.env.WEB_URL || 'http://localhost:3000', 'X-Title': 'DONWIZ HANDSOME Digital Skill Hub' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini', temperature: 0.7,
      messages: [
        { role: 'system', content: `You are an AI tool inside DONWIZ HANDSOME DIGITAL SKILL HUB. ${INSTRUCTIONS[tool] || 'Return useful, polished output only.'} Return only the finished result.` },
        { role: 'user', content: text.slice(0, 4000) },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`AI provider error ${r.status}`);
  const data: any = await r.json();
  const out = data.choices?.[0]?.message?.content || data.output_text;
  if (!out) throw new Error('AI provider returned no content');
  return String(out);
}
