export default {
  apps: [
    {
      name: 'cicero_telegram',
      script: 'app.js',
      env: {
        WA_SERVICE_SKIP_INIT: 'false'
      },
      env_production: {
        WA_SERVICE_SKIP_INIT: 'false'
      },
      watch: process.env.NODE_ENV === 'production' ? false : ['app.js', 'src'],
      ignore_watch: [
        'laphar',
        'logs',
        'uploads',
        'backups',
        '*.txt',
        '*.csv',
        '*.tsv',
        '*.log',
        '*.json',
        '*.xlsx',
        '*.xls',
        '*.zip'
      ]
    }
  ]
};
