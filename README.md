# DONWIZ HANDSOME Digital Skill Hub

Learn AI. Build Skills. Create. Earn. — Next.js 15 web app + Express/Prisma/PostgreSQL API.

## Run locally
```bash
cp .env.example .env          # fill in secrets (see comments in the file)
npm install
npx prisma migrate dev --name init   # creates prisma/migrations (commit them), applies to your DB
npm run db:seed               # AI tools, settings, super admin (ADMIN_EMAIL/ADMIN_PASSWORD) + starter catalog
npm run dev                   # web :3000, api :4000
```
Docker: `docker compose up --build` (set secrets in `.env`; the API applies migrations or syncs the schema on start).

## Services (see `.env.example`)
| Feature | Provider | Needs |
|---|---|---|
| AI tools | OpenRouter | `OPENROUTER_API_KEY` (+ optional `OPENROUTER_MODEL`). Without it tools return an error and charge nothing |
| Payments | Paystack / Flutterwave / Stripe | `PAYSTACK_SECRET_KEY`, `FLW_SECRET_KEY`, `STRIPE_SECRET_KEY` (any one or more). Webhooks: `{API}/api/payments/webhook/paystack`, `/flutterwave` (needs `FLW_SECRET_HASH`), `/stripe` (needs `STRIPE_WEBHOOK_SECRET`). Redirect-verify works without webhooks |
| Videos & files | Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Keep the bucket **private**. Add a CORS rule allowing `PUT` from your `WEB_URL` so admin uploads work from the browser |
| Email | Resend | `RESEND_API_KEY` and a verified sender in `MAIL_FROM`. In dev, links are printed to the API log |
| Google login | Google Cloud | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; authorized redirect URI `{API_PUBLIC_URL}/api/auth/google/callback` |

Public/publishable/encryption keys (`PAYSTACK_PUBLIC_KEY`, `FLW_PUBLIC_KEY`, `FLW_ENCRYPTION_KEY`, `STRIPE_PUBLISHABLE_KEY`) are accepted but unused: checkout is the providers' hosted page, so only server keys are needed. `CLOUDFLARE_API_TOKEN` is reserved and not called by the app.

## Money model
All prices are **integer USD cents** (course default `1500` = $15). Paystack/Flutterwave charge `usd × NGN_PER_USD` (editable in Admin → Settings); Stripe charges USD. The server always prices the order; the client only says *what* is being bought. Payments are verified with the provider (amount, currency, reference) and fulfilled exactly once, via redirect-verify or webhook.

## Notes
- Starter courses/products/jobs come from the seed (`SEED_CATALOG=false` to skip). Lessons have no video until you upload one.
- The founder photo is a placeholder; replace the `.ph` block on Home/About with your real image when ready.
- Referral commissions are approved at payment time; add a hold period in `fulfillment.ts` if you want a refund window.
