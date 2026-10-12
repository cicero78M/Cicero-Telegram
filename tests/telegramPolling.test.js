import {
  attachTelegramPollingErrorHandler,
  getTelegramPollingOptions,
} from '../src/utils/telegramPolling.js';
import { jest } from '@jest/globals';

describe('Telegram polling safeguards', () => {
  const originalInterval = process.env.TELEGRAM_POLLING_INTERVAL_MS;
  const originalTimeout = process.env.TELEGRAM_LONG_POLL_TIMEOUT_SECONDS;

  afterEach(() => {
    if (originalInterval === undefined) delete process.env.TELEGRAM_POLLING_INTERVAL_MS;
    else process.env.TELEGRAM_POLLING_INTERVAL_MS = originalInterval;
    if (originalTimeout === undefined) delete process.env.TELEGRAM_LONG_POLL_TIMEOUT_SECONDS;
    else process.env.TELEGRAM_LONG_POLL_TIMEOUT_SECONDS = originalTimeout;
  });

  test('uses conservative long-poll defaults and allows safe overrides', () => {
    delete process.env.TELEGRAM_POLLING_INTERVAL_MS;
    delete process.env.TELEGRAM_LONG_POLL_TIMEOUT_SECONDS;
    expect(getTelegramPollingOptions()).toEqual({
      interval: 6000,
      params: { timeout: 25 },
    });

    process.env.TELEGRAM_POLLING_INTERVAL_MS = '9000';
    process.env.TELEGRAM_LONG_POLL_TIMEOUT_SECONDS = '30';
    expect(getTelegramPollingOptions()).toEqual({
      interval: 9000,
      params: { timeout: 30 },
    });
  });

  test('handles transient polling errors without writing stderr', () => {
    const handler = jest.fn();
    const bot = { on: handler };
    const originalLog = console.log;
    const originalError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();

    try {
      attachTelegramPollingErrorHandler(bot, 'Test Bot');
      expect(handler).toHaveBeenCalledWith('polling_error', expect.any(Function));
      const pollingError = handler.mock.calls[0][1];
      pollingError({
        code: 429,
        message: 'Too Many Requests',
        response: { parameters: { retry_after: 5 } },
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('retry_after=5s')
      );
      expect(console.error).not.toHaveBeenCalled();
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });
});
