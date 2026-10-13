import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './services/prisma.js';
import { DEFAULT_SETTINGS } from './services/config.js';

// AI tools & settings are required for the platform. Catalog content (courses/products/jobs) is starter content the admin can edit in the dashboard.
const tools: [string, string, string, string, number, boolean][] = [
  ['prompt-generator', 'AI Prompt Generator', 'Generate high-quality prompts', 'PROMPT', 1, false],
  ['image-prompt-generator', 'AI Image Prompt Generator', 'Create detailed image prompts', 'IMAGE', 2, true],
  ['video-script-generator', 'AI Video Script Generator', 'Generate video scripts that convert', 'VIDEO', 3, true],
  ['ugc-script-generator', 'UGC Script Generator', 'Create UGC ad scripts', 'UGC', 3, true],
  ['social-caption-generator', 'Social Media Caption Generator', 'Create engaging captions', 'SOCIAL', 2, true],
  ['ad-copy-generator', 'Advertisement Copy Generator', 'Marketing copy for your ads', 'MARKETING', 3, true],
  ['business-name-generator', 'Business Name Generator', 'Generate brandable business names', 'BUSINESS', 2, false],
  ['product-description-generator', 'Product Description Generator', 'Write persuasive product descriptions', 'COPY', 2, false],
  ['website-copy-generator', 'Website Copy Generator', 'Create homepage and landing page copy', 'COPY', 3, true],
];
const OUT = ['Understand the fundamentals', 'Build real projects step by step', 'Use professional AI tools confidently', 'Create work you can sell or show clients'];
const REQ = ['Basic computer skills', 'Internet connection', 'No prior experience required'];
const courses: [string, string, string, string, string, number, string[]][] = [
  ['AI Image Generation', 'ai-image-generation', 'Learn how to create stunning images using AI tools like Midjourney, DALL·E and Stable Diffusion. From prompts to commercial-ready visuals.', 'AI', 'BEGINNER', 12, ['AI image generation fundamentals', 'Writing effective prompts', 'Using Midjourney, DALL·E and Stable Diffusion', 'Creating commercial-quality images']],
  ['AI Video Creation', 'ai-video-creation', 'Turn ideas into scroll-stopping videos with AI video generators, voice-overs and editing workflows.', 'AI', 'INTERMEDIATE', 15, []],
  ['Prompt Engineering', 'prompt-engineering', 'Master the craft of prompting large language models for writing, research, coding and automation.', 'AI', 'ADVANCED', 10, []],
  ['AI Music Creation', 'ai-music-creation', 'Compose, produce and release original tracks using AI music tools.', 'Content Creation', 'BEGINNER', 12, []],
  ['AI Graphic Design', 'ai-graphic-design', 'Design logos, social graphics and brand kits faster with Canva and AI design tools.', 'Design', 'INTERMEDIATE', 14, []],
  ['AI Content Creation', 'ai-content-creation', 'Build a content engine: ideas, scripts, captions and repurposing — all accelerated by AI.', 'Content Creation', 'BEGINNER', 12, []],
];
const covers = ['ai', 'video', 'prompt', 'music', 'design', 'content'];
const products: [string, string, string, string, number][] = [
  ['ChatGPT Prompt Pack', 'chatgpt-prompt-pack', 'Over 200 tested prompts for writing, marketing and business.', 'PROMPT', 1000],
  ['Canva Template Bundle', 'canva-template-bundle', 'Editable social, brand and presentation templates.', 'TEMPLATE', 1200],
  ['Digital Marketing E-book', 'digital-marketing-ebook', 'A practical guide to selling online with digital marketing.', 'EBOOK', 1500],
  ['Social Media Templates', 'social-media-templates', 'A month of ready-to-post designs for any niche.', 'TEMPLATE', 1000],
  ['Video Editing Presets', 'video-editing-presets', 'Cinematic presets and transitions for short-form video.', 'VIDEO', 1200],
  ['Business Plan Template', 'business-plan-template', 'A complete business plan template with financial sheets.', 'TEMPLATE', 1500],
];
const jobs: [string, string, string, string, string][] = [
  ['AI Content Writer', 'Creategy', '$300 - $500 / project', 'FREELANCE', 'Write AI-assisted blog posts and social copy for creator brands.'],
  ['Social Media Manager', 'Trendgrid', '$200 - $500 / month', 'PART_TIME', 'Plan and schedule content across platforms using AI tools.'],
  ['UI/UX Designer', 'Pixelforge', '$400 - $900 / month', 'FULL_TIME', 'Design clean interfaces for web and mobile products.'],
];

async function main() {
  for (const [slug, name, description, category, creditCost, premium] of tools.map(t => [t[0], t[1], t[2], t[3], t[4], t[5]] as const)) {
    await prisma.aiTool.upsert({ where: { slug }, update: { name, description, category, creditCost, premium, active: true }, create: { slug, name, description, category, creditCost, premium } });
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: String(value) } });

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    await prisma.user.upsert({ where: { email }, update: { role: 'SUPER_ADMIN' }, create: { email, name: 'Wisdom C Chibuike', role: 'SUPER_ADMIN', emailVerified: true, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12) } });
    console.log('Super admin ready:', email);
  } else console.log('Set ADMIN_EMAIL and ADMIN_PASSWORD to create the super admin.');

  if (process.env.SEED_CATALOG !== 'false') {
    for (let i = 0; i < courses.length; i++) {
      const [title, slug, description, category, level, mins, outcomes] = courses[i];
      const data = { title, description, category, level, cover: covers[i], price: 1500, durationMinutes: mins * 15, outcomes: outcomes.length ? outcomes : OUT, requirements: REQ, published: true };
      const c = await prisma.course.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
      if (!(await prisma.lesson.count({ where: { courseId: c.id } })))
        await prisma.lesson.createMany({ data: Array.from({ length: mins }, (_, n) => ({ courseId: c.id, order: n + 1, title: ['Introduction', 'Core concepts', 'Tools & setup', 'Hands-on project', 'Workflow', 'Advanced techniques'][n % 6] + (n >= 6 ? ` ${Math.floor(n / 6) + 1}` : ''), videoKey: '', isPreview: n === 0 })) });
    }
    for (const [title, slug, description, type, price] of products) await prisma.product.upsert({ where: { slug }, update: {}, create: { title, slug, description, type, price, published: true } });
    if (!(await prisma.job.count())) for (const [title, company, payment, type, description] of jobs) await prisma.job.create({ data: { title, company, payment, type: type as any, description, requirements: 'Portfolio or sample work', published: true } });
  }
  console.log('Seed complete'); await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
