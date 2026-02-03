export default [
  {
    jobKey: './src/cron/cronDbBackup.js',
    modulePath: './src/cron/cronDbBackup.js',
    bucket: 'always',
    description: 'Backup database dump to Google Drive using service account credentials.',
  },
  {
    jobKey: './src/cron/cronDirRequestFetchSosmed.js',
    modulePath: './src/cron/cronDirRequestFetchSosmed.js',
    bucket: 'always',
    description: 'Fetch Ditbinmas Instagram/TikTok posts, refresh engagement metrics, and broadcast status deltas.',
  },
  {
    jobKey: './src/cron/cronPremiumExpiry.js',
    modulePath: './src/cron/cronPremiumExpiry.js',
    bucket: 'always',
    description: 'Expire premium access for mobile users when premium_end_date has passed.',
  },
  {
    jobKey: './src/cron/cronOprRequestAmplifyRoutineUpdate.js',
    modulePath: './src/cron/cronOprRequestAmplifyRoutineUpdate.js',
    bucket: 'always',
    description: 'Refresh oprrequest tugas rutin amplification content for active org clients with amplification enabled during business hours.',
  },
];
