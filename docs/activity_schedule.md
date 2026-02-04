# System Activity Schedule
*Last updated: 2026-02-04*

**Note**: This repository does NOT have a `/src/cron/` directory in the current version. The cron jobs referenced in this document are either:
- Managed by external system cron
- Handled by PM2 ecosystem configuration  
- Implemented as periodic checks within services
- Part of an older architecture that has been refactored

This document is maintained for reference purposes to understand the scheduled tasks that should be running in the system.

---

This document summarizes the automated jobs ("activity") that run inside Cicero_V2. All jobs use `node-cron` and execute in the **Asia/Jakarta** timezone unless stated otherwise.

## Runtime safeguards & configuration sync

The scheduler uses `src/utils/cronScheduler.js` to fetch the matching record in `cron_job_config`; jobs run only when `is_active=true` so operations can toggle tasks safely without redeploying. During prolonged database outages, disabled jobs may temporarily run because the safety check cannot be read—monitor `[CRON] Failed to check status...` logs to spot this scenario. The dirRequest group adds a higher-level toggle through `ENABLE_DIRREQUEST_GROUP` to pause all Ditbinmas schedules at once.

The configuration data lives in the migration `sql/migrations/20251022_create_cron_job_config.sql` and is surfaced in the cron configuration menu, keeping this schedule synchronized with the controls that ops staff use to enable or pause jobs.

dirRequest cron registration happens at system boot (subject to `ENABLE_DIRREQUEST_GROUP`). Every dirRequest job key is single-flight: if a previous run is still in-flight, the next scheduled run logs a skip message and exits early to prevent overlap.

## Cron Jobs

**Note**: The cron job files referenced below are part of the scheduled task system. The actual implementation may vary depending on deployment configuration.

### Core cron jobs

| Job Name | Schedule (Asia/Jakarta) | Description |
|------|-------------------------|-------------|
| `cronDbBackup.js` | `0 4 * * *` | Backup database dump to Google Drive using service account credentials. |
| `cronRekapLink.js` | `5 15,18,21 * * *` | Distribute amplification link recaps to all active amplification clients. |
| `cronAmplifyLinkMonthly.js` | `0 23 28-31 * *` | Generate and deliver monthly amplification spreadsheets on the last day of the month. |
| `cronDirRequestRekapUpdate.js` | `0 8-18/4 * * *` | Send Ditbinmas executive summaries and rekap updates to admins and broadcast groups. |
| `cronDirRequestRekapBelumLengkapDitsamapta.js` | `15 7-21 * * *` | Send Ditsamapta incomplete Instagram/TikTok data recaps to admin recipients only. |
| `cronDirRequestFetchSosmed.js` | `0,30 6-21 * * *<br>0 22 * * *` | Fetch Instagram/TikTok posts for all active clients (direktorat + org) with Instagram/TikTok enabled, refresh engagement metrics, and broadcast status deltas; delivery now triggers when the Instagram/TikTok link set changes even if post counts stay flat (pengiriman grup dikunci setelah 17:15 WIB, tetapi fetch post & refresh engagement tetap jalan supaya komentar malam memakai data terbaru). Fetch ini bersifat single-flight dengan antrean rerun: saat job masih berjalan, pemanggilan berikutnya dicatat sebagai **queued** dan otomatis dijalankan ulang setelah proses selesai (permintaan ganda digabung agar tidak menumpuk). |
| `cronOprRequestAbsensiUpdateDataUsername.js` | `45 8-15 * * *` | Send oprrequest absensi update data username recaps to active org clients with Instagram + TikTok enabled, delivered to each WhatsApp group. |
| `cronOprRequestAbsensiEngagement.js` | `5 15,18,20 * * *` | Send oprrequest engagement absensi Instagram (likes) and TikTok (comments) recaps with the "all" mode to each org WhatsApp group plus operator and super admin recipients. |
| `cronOprRequestAmplifyRoutineUpdate.js` | `0,30 8-21 * * *` | Refresh oprrequest tugas rutin amplification content for active org clients with amplification enabled. |
| `cronDashboardSubscriptionExpiry.js` | `*/30 * * * *` | Mark overdue dashboard subscriptions as expired and send WhatsApp reminders when a destination number is available. |
| `cronPremiumExpiry.js` | `0 0 * * *` | Expire mobile premium users when `premium_end_date` is in the past. |
| `cronDashboardPremiumRequestExpiry.js` | `0 * * * *` | Expire pending/confirmed dashboard premium requests after their `expired_at` deadline and send requester/admin WhatsApp notifications. |

### Ditbinmas dirRequest group

The schedules below are part of the dirRequest group and can be toggled together using the `ENABLE_DIRREQUEST_GROUP` environment variable. The cron expressions are staggered to avoid overlapping WhatsApp sends in the Asia/Jakarta timezone.

| Job Name | Schedule (Asia/Jakarta) | Description |
|------|-------------------------|-------------|
| `cronWaNotificationReminder.js` | `10 16 * * *<br>40 16 * * *<br>10 17 * * *<br>40 17 * * *` | Send WhatsApp task reminders to Ditbinmas and BIDHUMAS users who opted in. |
| `cronDirRequestSatbinmasOfficialMedia.js` | `5 23 * * *` | Share Satbinmas official media updates with Ditbinmas recipients. |
| `cronDirRequestDitbinmasGroupRecap.js` | `10 15 * * *<br>14 18 * * *` | Send Ditbinmas group-only recap (dirRequest menus 21 and 22). |
| `cronDirRequestDitbinmasSuperAdminDaily.js` | `10 18 * * *` | Send Ditbinmas super admin-only recaps (dirRequest menus 6, 9, 34, and 35). |
| `cronDirRequestDitbinmasOperatorDaily.js` | `12 18 * * *` | Send Ditbinmas operator-only reports by running dirRequest menu 30 with the "hari ini" period. |
| `cronDirRequestBidhumasEvening.js` | `30 20 * * *<br>0 22 * * *` | Send dirRequest menus 6, 9, 28, and 29 exclusively to the BIDHUMAS group and its super admin recipients at exactly 22:00 WIB (no fetch post/engagement step). |

#### Ditbinmas WA reminder persistence

- `cronWaNotificationReminder` writes the per-date, per-`chat_id` + `client_id` reminder state into the `wa_notification_reminder_state` table (primary key: `date_key`, `chat_id`, `client_id`) only after a successful WhatsApp delivery, so the worker can recover after restarts without re-sending completed users while failed deliveries are retried on the next run. Columns include `last_stage` (`initial`, `followup1`, `followup2`, `completed`) and `is_complete` to gate follow-up sends per recipient.
- On each run the job reads the stored state to pick the correct stage, skips rows where `is_complete=true`, and only advances the stage for recipients whose previously stored stage is behind the current run. This keeps once-per-day delivery guarantees for completions while still pushing pending recipients forward to their next follow-up slot.

Each job collects data from the database, interacts with RapidAPI or WhatsApp services, and updates the system accordingly. Refer to [docs/naming_conventions.md](naming_conventions.md) for code style guidelines.
