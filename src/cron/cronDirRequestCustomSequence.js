import { sendDebug } from '../middleware/debugHandler.js';
import { runDirRequestAction } from '../handler/menu/dirRequestHandlers.js';
import { findClientById } from '../service/clientService.js';
import { splitRecipientField } from '../repository/clientContactRepository.js';
// WhatsApp functionality removed
// import {
//   sendWithClientFallback,
//   getAdminWAIds,
//   normalizeUserWhatsAppId,
//   minPhoneDigitLength,
// } from '../utils/waHelper.js';
// import waClient, { waGatewayClient, waUserClient } from '../service/waService.js';
import { delayAfterSend } from './dirRequestThrottle.js';
import {
  normalizeGroupId,
  runCron as runDirRequestFetchSosmed,
} from './cronDirRequestFetchSosmed.js';

const DITBINMAS_CLIENT_ID = 'DITBINMAS';
const BIDHUMAS_CLIENT_ID = 'BIDHUMAS';
export const JOB_KEY = './src/cron/cronDirRequestCustomSequence.js';
export const BIDHUMAS_2030_JOB_KEY = `${JOB_KEY}#bidhumas-20-30`;
export const DITBINMAS_RECAP_AND_CUSTOM_JOB_KEY = `${JOB_KEY}#ditbinmas-recap-and-custom`;
// WhatsApp functionality removed
// const waFallbackClients = [
//   { client: waGatewayClient, label: 'WA-GATEWAY' },
//   { client: waClient, label: 'WA' },
//   { client: waUserClient, label: 'WA-USER' },
// ];

// WhatsApp functionality removed
// function buildOrderedFallbackClients(primaryLabel) {
//   if (!primaryLabel) return waFallbackClients;
//   const primary = waFallbackClients.find((entry) => entry.label === primaryLabel);
//   if (!primary) return waFallbackClients;
//   return [primary, ...waFallbackClients.filter((entry) => entry.label !== primaryLabel)];
// }

function logFallbackEvent(message) {
  sendDebug({ tag: 'CRON DIRREQ CUSTOM', msg: message });
  console.warn(message);
}

// WhatsApp functionality removed - all WA client resolution and sending removed
// async function resolveReadyWaClient({ action, clientId, chatId }) {
//   ...
// }
// function logInvalidRecipient(value) {
//   ...
// }
// function normalizeUserRecipient(value) {
//   ...
// }
// function toWAid(id) {
//   ...
// }

// WhatsApp functionality removed - recipient building functions removed
// function getGroupRecipient(client) {
//   return normalizeGroupId(client?.client_group);
// }
// function getRecipientsFromField(rawValue) {
//   return splitRecipientField(rawValue).map(toWAid).filter(Boolean);
// }
// function getSuperAdminRecipients(client) {
//   return getRecipientsFromField(client?.client_super);
// }
// function getOperatorRecipients(client) {
//   return getRecipientsFromField(client?.client_operator);
// }
// function buildRecipients(
//   client,
//   { includeGroup = false, includeSuperAdmins = false, includeOperators = false } = {}
// ) {
//   ...
// }
// const adminRecipients = new Set(
//   getAdminWAIds().map((wid) => normalizeUserRecipient(wid)).filter(Boolean)
// );
// async function logToAdmins(message) {
//   ...
// }

function normalizeActionEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { action: entry, context: undefined };
  }
  if (typeof entry === 'object' && entry.action) {
    return { action: String(entry.action), context: entry.context };
  }
  return null;
}

// WhatsApp functionality removed - all menu action execution functions disabled
// async function executeMenuActions({...}) { ... }
// export async function runBidhumasMenuSequence({...}) { ... }
// export async function runCron({...}) { ... }
// export async function runDitbinmasRecapAndCustomSequence(...) { ... }
// export async function runDitbinmasSuperAdminDailyRecap(...) { ... }
// export async function runDitbinmasOperatorDailyReport(...) { ... }
// export async function runDitbinmasRecapSequence(...) { ... }

function isLastDayOfMonth(date = new Date()) {
  const checkDate = new Date(date);
  const nextDay = new Date(checkDate);
  nextDay.setDate(checkDate.getDate() + 1);
  return checkDate.getMonth() !== nextDay.getMonth();
}

function buildDitbinmasRecapPlan(referenceDate = new Date()) {
  const recapPeriods = new Set(['daily']);
  const kasatkerPeriods = new Set(['today']);

  if (referenceDate.getDay() === 0) {
    recapPeriods.add('weekly');
    kasatkerPeriods.add('this_week');
  }

  if (isLastDayOfMonth(referenceDate)) {
    recapPeriods.add('monthly');
    kasatkerPeriods.add('this_month');
  }

  const contextByPeriod = (period) => ({ period, referenceDate });

  return {
    recapPeriods: Array.from(recapPeriods),
    kasatkerPeriods: Array.from(kasatkerPeriods),
    superActions: [
      { action: '6' },
      { action: '9' },
      ...Array.from(recapPeriods).map((period) => ({
        action: '34',
        context: contextByPeriod(period),
      })),
      ...Array.from(recapPeriods).map((period) => ({
        action: '35',
        context: contextByPeriod(period),
      })),
    ],
    operatorActions: Array.from(kasatkerPeriods).map((period) => ({
      action: '30',
      context: { period },
    })),
  };
}

// WhatsApp functionality removed - cron execution functions disabled
/*
export async function runCron({
  includeFetch = true,
  includeDitbinmas = true,
  includeBidhumas = true,
  summaryTitle = '[CRON DIRREQ CUSTOM] Ringkasan',
} = {}) {
  // ... (function body removed)
}

export async function runDitbinmasRecapAndCustomSequence(referenceDate = new Date()) {
  // ... (function body removed)
}

export async function runDitbinmasSuperAdminDailyRecap(referenceDate = new Date()) {
  // ... (function body removed)
}

export async function runDitbinmasOperatorDailyReport(referenceDate = new Date()) {
  // ... (function body removed)
}

export async function runDitbinmasRecapSequence(
  referenceDate = new Date(),
  {
    includeSuperAdmins = true,
    includeOperators = true,
    superAdminDelayMs,
    operatorDelayMs,
  } = {},
) {
  // ... (function body removed)
}
*/

export default null;
