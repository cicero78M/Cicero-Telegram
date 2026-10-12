const DEFAULT_POLL_INTERVAL_MS = 6000;
const DEFAULT_LONG_POLL_TIMEOUT_SECONDS = 25;
const ERROR_LOG_COOLDOWN_MS = 60000;

function getNumberEnv(name, fallback, minimum) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

export function getTelegramPollingOptions() {
  return {
    interval: getNumberEnv(
      'TELEGRAM_POLLING_INTERVAL_MS',
      DEFAULT_POLL_INTERVAL_MS,
      1000
    ),
    params: {
      timeout: getNumberEnv(
        'TELEGRAM_LONG_POLL_TIMEOUT_SECONDS',
        DEFAULT_LONG_POLL_TIMEOUT_SECONDS,
        0
      ),
    },
  };
}

function getErrorCode(error) {
  return error?.response?.error_code || error?.code || 'UNKNOWN';
}

function getRetryAfterSeconds(error) {
  return Number(error?.response?.parameters?.retry_after) || 0;
}

function isTransientPollingError(error) {
  const code = Number(getErrorCode(error));
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 429 ||
    code === 502 ||
    code === 503 ||
    code === 504 ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('socket hang up')
  );
}

/**
 * node-telegram-bot-api emits polling errors and otherwise writes them to
 * stderr when no listener exists. Attach one listener per bot so provider
 * throttling/network blips are rate-limited and do not look like crashes.
 */
export function attachTelegramPollingErrorHandler(bot, label) {
  let lastLoggedAt = 0;
  let lastSignature = '';

  bot.on('polling_error', (error) => {
    const code = getErrorCode(error);
    const retryAfter = getRetryAfterSeconds(error);
    const signature = `${code}:${retryAfter}:${error?.message || ''}`;
    const now = Date.now();

    if (isTransientPollingError(error)) {
      if (
        signature !== lastSignature ||
        now - lastLoggedAt >= ERROR_LOG_COOLDOWN_MS
      ) {
        console.log(
          `[${label}] Telegram polling transient error code=${code}` +
            (retryAfter ? ` retry_after=${retryAfter}s` : '') +
            '; polling library will retry with backoff interval'
        );
        lastLoggedAt = now;
        lastSignature = signature;
      }
      return;
    }

    console.error(`[${label}] Telegram polling error code=${code}:`, error?.message || error);
  });
}
