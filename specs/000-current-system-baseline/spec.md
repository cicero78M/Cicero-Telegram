# Current System Baseline: Cicero Telegram

**Status**: Baseline — audit 2026-10-24  
**Runtime**: PM2 `telegram`, online  
**Entry**: `app.js` → Telegram bot/client services and menu handlers

## Purpose and topology

The worker provides Telegram-facing operator, directorate, user, dashboard-adjacent, data-mining, attendance, social-media, and reporting workflows.

```text
Telegram services → handler/menu + handler/fetch* → service
                  → model/repository → PostgreSQL/Redis
```

Key modules: `src/service/telegram*`, `src/handler/menu/`, `src/handler/fetch*`, `src/service/`, `src/model/`, `src/db/`.

## Current capabilities

- Multi-bot Telegram routing with operator/directorate/user roles.
- Social-media collection, engagement, attendance, recaps, amplification, and data-mining workflows.
- Client/user scoping, OTP/access flows, scheduled notifications, and Excel exports.

## Safety invariants

- Preserve bot identity/routing and role authorization; never broaden a handler to all chats by default.
- Preserve client scoping and Jakarta operational dates.
- Keep external API failures isolated and observable; do not fabricate engagement data.
- Use existing model/service/database boundaries and parameterized queries.

## Acceptance checks

- `npm run lint` and `npm test` pass or failures are recorded.
- Role, client-scope, and duplicate-message regression tests pass for runtime changes.
- PM2 `telegram` stays online; documentation changes require no process restart.
