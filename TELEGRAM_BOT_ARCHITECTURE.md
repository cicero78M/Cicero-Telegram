# Telegram Bot Architecture

**Last updated: 2026-02-04**

## Overview

Cicero-Telegram uses **four independent Telegram bots** as the primary user interface, replacing traditional web endpoints. Each bot serves a specific role with its own token, menu system, and access controls.

This document provides a comprehensive guide to the Telegram bot architecture, implementation patterns, and best practices for extending the bot functionality.

## Bot Types & Responsibilities

### 1. Bot Direktorat (Directorate Bot)

**Purpose**: Serves directorate-level administrators with high-level reporting and analytics

**Service File**: `src/service/telegramDirektoratBotService.js`  
**Menu Handler**: `src/handler/menu/dirRequestHandlers.js`  
**Environment Variables**:
- `TELEGRAM_DIREKTORAT_BOT_TOKEN` - Bot token from BotFather
- `TELEGRAM_DIREKTORAT_BOT_ENABLED` - Enable/disable flag (true/false)

**Key Features**:
- **20+ menu options** for comprehensive reporting
- Executive summaries and data recaps
- Instagram/TikTok attendance reports
- Engagement rankings and analytics
- Satker update matrices
- Weekly/monthly report generation
- Link amplification status
- Compliance metrics

**Typical Users**:
- Directorate administrators (Ditbinmas, Ditlantas, Bidhumas)
- Senior management
- Executive decision-makers

**Menu Examples**:
1. Data user recap
2. Executive summaries  
3. Instagram likes attendance
4. TikTok comments attendance
5. Satker update matrix
6. Engagement rankings by date range
7. Comment/likes recaps
8. Weekly/monthly reports
9. Link amplification tracking
10. User compliance metrics

### 2. Bot Operator (Operator Bot)

**Purpose**: Administrative operations for organizational operators

**Service File**: `src/service/telegramOperatorBotService.js`  
**Menu Handler**: `src/handler/menu/oprRequestHandlers.js`  
**Environment Variables**:
- `TELEGRAM_OPERATOR_BOT_TOKEN` - Bot token from BotFather
- `TELEGRAM_OPERATOR_BOT_ENABLED` - Enable/disable flag (true/false)

**Key Features**:
- **15+ menu options** for operational management
- User account management
- Amplification tracking and reporting
- Engagement monitoring
- Data exports and reports
- Organization-level analytics

**Typical Users**:
- Organizational operators
- System administrators
- Data managers
- Support staff

**Menu Examples**:
1. User management (create/update/deactivate)
2. Amplification link tracking
3. Engagement monitoring
4. Report generation
5. Data export requests
6. Organization analytics
7. User activity logs

### 3. Bot User (User Bot)

**Purpose**: Personal data management for end users (police personnel)

**Service File**: `src/service/telegramUserBotService.js`  
**Menu Handler**: `src/handler/menu/userMenuHandlers.js`  
**Environment Variables**:
- `TELEGRAM_USER_BOT_TOKEN` - Bot token from BotFather
- `TELEGRAM_USER_BOT_ENABLED` - Enable/disable flag (true/false)

**Key Features**:
- **10+ menu options** for personal account management
- Profile updates
- Social media account linking (Instagram/TikTok)
- Personal task status
- Individual statistics
- Data claim flows (OTP-protected)

**Typical Users**:
- Police personnel (end users)
- Social media operators
- Field staff
- Content creators

**Menu Examples**:
1. Update profile information
2. Link Instagram account
3. Link TikTok account
4. View personal statistics
5. Check task completion status
6. Request data access (OTP)
7. Update contact information

### 4. Bot Client (Client Bot)

**Purpose**: Client administrator operations

**Service File**: `src/service/telegramClientBotService.js`  
**Menu Handlers**: 
- `src/handler/menu/clientRequestHandlers.js`
- `src/handler/menu/clientRequestTelegramHandlers.js`

**Environment Variables**:
- `TELEGRAM_CLIENT_BOT_TOKEN` - Bot token from BotFather
- `TELEGRAM_CLIENT_BOT_ENABLED` - Enable/disable flag (true/false)

**Key Features**:
- **10+ menu options** for client management
- Client organization management
- User roster management
- Client-level reporting
- Configuration updates

**Typical Users**:
- Client administrators
- Organization leads
- Regional coordinators

**Menu Examples**:
1. Manage client information
2. User roster operations
3. Client-level reports
4. Configuration management
5. Access control settings

## Architecture Layers

### Layer 1: Entry Point (app.js)

**Responsibilities**:
- Initialize bot instances
- Conditional activation based on environment flags
- Set up polling for message reception
- Handle graceful shutdown

**Example Initialization**:
```javascript
// Bot Direktorat
if (env.TELEGRAM_DIREKTORAT_BOT_ENABLED) {
  const direktoratBot = new TelegramBot(env.TELEGRAM_DIREKTORAT_BOT_TOKEN, {
    polling: true
  });
  initializeDirektoratBot(direktoratBot);
  console.log('[TELEGRAM] Bot Direktorat initialized');
}

// Bot Operator
if (env.TELEGRAM_OPERATOR_BOT_ENABLED) {
  const operatorBot = new TelegramBot(env.TELEGRAM_OPERATOR_BOT_TOKEN, {
    polling: true
  });
  initializeOperatorBot(operatorBot);
  console.log('[TELEGRAM] Bot Operator initialized');
}

// Similar for User and Client bots...
```

### Layer 2: Bot Service Layer

**Location**: `src/service/telegram*BotService.js`

**Responsibilities**:
- Message parsing and routing
- Command handling
- Menu rendering
- User session management
- Error handling
- Response formatting

**Key Functions**:
- `initializeBot(bot)` - Set up message handlers
- `handleMessage(msg)` - Process incoming messages
- `handleCommand(msg, command)` - Route commands to handlers
- `sendMenu(chatId, menuData)` - Display menus to users
- `handleError(chatId, error)` - Handle and log errors

**Example Service Structure**:
```javascript
// src/service/telegramDirektoratBotService.js

export function initializeDirektoratBot(bot) {
  bot.on('message', async (msg) => {
    try {
      await handleDirektoratMessage(bot, msg);
    } catch (error) {
      logger.error('[BOT_DIREKTORAT] Error:', error);
      await bot.sendMessage(msg.chat.id, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  });
}

async function handleDirektoratMessage(bot, msg) {
  const text = msg.text?.trim();
  const chatId = msg.chat.id;
  
  // Route to appropriate handler based on message content
  if (text?.startsWith('/')) {
    await handleCommand(bot, msg, text);
  } else {
    await handleMenuSelection(bot, msg, text);
  }
}
```

### Layer 3: Menu Handler Layer

**Location**: `src/handler/menu/`

**Responsibilities**:
- Menu option processing
- Data fetching orchestration
- Report generation
- Business logic execution
- Response formatting

**Files**:
- `dirRequestHandlers.js` - 20+ directorate menu handlers
- `oprRequestHandlers.js` - 15+ operator menu handlers
- `userMenuHandlers.js` - 10+ user menu handlers
- `clientRequestHandlers.js` - 10+ client menu handlers
- `menuPromptHelpers.js` - Shared menu utilities

**Example Handler Structure**:
```javascript
// src/handler/menu/dirRequestHandlers.js

export async function handleMenuOption1(bot, chatId, params) {
  try {
    // 1. Validate parameters
    if (!params.clientId) {
      throw new Error('Client ID required');
    }
    
    // 2. Fetch data from services
    const users = await userService.getActiveUsers(params.clientId);
    const stats = await analyticsService.getUserStats(users);
    
    // 3. Format response
    const message = formatUserRecap(stats);
    
    // 4. Send to user
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('[DIR_MENU_1] Error:', error);
    await bot.sendMessage(chatId, 'Gagal memuat data. Silakan coba lagi.');
  }
}

function formatUserRecap(stats) {
  return `*Data User Recap*\n\n` +
    `Total Users: ${stats.total}\n` +
    `Active: ${stats.active}\n` +
    `Inactive: ${stats.inactive}\n` +
    `\nGenerated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;
}
```

### Layer 4: Service Layer

**Location**: `src/service/`

**Responsibilities**:
- Business logic implementation
- External API integration
- Data aggregation
- Report generation
- Cache management

**Key Services Used by Bots**:
- `instaRapidService.js` - Instagram data fetching
- `tiktokRapidService.js` - TikTok data fetching
- `aggregatorService.js` - Analytics aggregation
- `premiumService.js` - Subscription management
- `emailService.js` / `otpService.js` - OTP flows
- Various report generation services

### Layer 5: Data Layer

**Location**: `src/model/` and `src/repository/`

**Responsibilities**:
- Database operations
- Data validation
- Query building
- Relationship management

**Key Models Used**:
- `userModel.js` - User accounts
- `clientModel.js` - Client organizations
- `instaPostModel.js` / `tiktokPostModel.js` - Social media posts
- `dashboardSubscriptionModel.js` - Subscriptions
- `loginLogModel.js` - Audit logs

## Message Flow

### User Interaction Flow

```
User sends message/command
          ↓
Telegram API receives
          ↓
Bot polls and receives message
          ↓
Bot Service Layer
(telegramDirektoratBotService.js)
          ↓
Parse message and route
          ↓
Menu Handler Layer
(dirRequestHandlers.js)
          ↓
Service Layer
(businessService.js)
          ↓
Data Layer
(model/repository)
          ↓
PostgreSQL Database
          ↓
Format response
          ↓
Bot sends message
          ↓
Telegram API delivers
          ↓
User receives response
```

### Command Processing Flow

```
/start command received
          ↓
Bot Service identifies command
          ↓
Route to command handler
          ↓
Load user's role/permissions
          ↓
Generate appropriate menu
          ↓
Format menu message
          ↓
Send menu to user
```

### Menu Selection Flow

```
User selects menu option (e.g., "1")
          ↓
Bot Service receives selection
          ↓
Parse selection number
          ↓
Route to menu handler
          ↓
Handler fetches data
          ↓
Generate report/response
          ↓
Send formatted response
          ↓
Offer next action/back to menu
```

## Common Patterns

### Pattern 1: Menu Display

```javascript
// Display menu with keyboard
const keyboard = {
  keyboard: [
    ['1. User Recap', '2. Executive Summary'],
    ['3. Instagram Report', '4. TikTok Report'],
    ['5. Back to Main Menu']
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

await bot.sendMessage(chatId, 'Select an option:', {
  reply_markup: keyboard
});
```

### Pattern 2: Data Report Generation

```javascript
// Generate and send report
async function sendInstagramReport(bot, chatId, params) {
  // Show loading indicator
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Generating report...');
  
  try {
    // Fetch data
    const data = await instaRapidService.getClientPosts(params.clientId);
    
    // Generate report
    const report = await generateInstagramReport(data, params);
    
    // Delete loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    
    // Send report
    if (report.type === 'excel') {
      await bot.sendDocument(chatId, report.buffer, {
        filename: report.filename
      });
    } else {
      await bot.sendMessage(chatId, report.text, {
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    throw error;
  }
}
```

### Pattern 3: Multi-Step Input Collection

```javascript
// Collect user input across multiple messages
const userSessions = new Map(); // In-memory session storage

async function handleMultiStepFlow(bot, msg) {
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId) || { step: 0 };
  
  switch (session.step) {
    case 0:
      // Ask for first input
      await bot.sendMessage(chatId, 'Enter client ID:');
      session.step = 1;
      userSessions.set(chatId, session);
      break;
      
    case 1:
      // Collect first input
      session.clientId = msg.text;
      await bot.sendMessage(chatId, 'Enter date range (7d/30d/90d):');
      session.step = 2;
      userSessions.set(chatId, session);
      break;
      
    case 2:
      // Collect second input and process
      session.dateRange = msg.text;
      await processReport(bot, chatId, session);
      userSessions.delete(chatId);
      break;
  }
}
```

### Pattern 4: Error Handling

```javascript
// Consistent error handling across handlers
async function handleMenuOption(bot, chatId, params) {
  try {
    // Validate inputs
    validateParams(params);
    
    // Process request
    const result = await processRequest(params);
    
    // Send response
    await sendResponse(bot, chatId, result);
    
  } catch (error) {
    // Log error with context
    logger.error('[MENU_HANDLER] Error:', {
      chatId,
      params,
      error: error.message,
      stack: error.stack
    });
    
    // Send user-friendly message
    const errorMsg = getUserFriendlyError(error);
    await bot.sendMessage(chatId, errorMsg);
    
    // Return to menu
    await sendMainMenu(bot, chatId);
  }
}

function getUserFriendlyError(error) {
  if (error.message.includes('network')) {
    return 'Koneksi bermasalah. Silakan coba lagi.';
  } else if (error.message.includes('permission')) {
    return 'Anda tidak memiliki akses. Hubungi administrator.';
  } else {
    return 'Terjadi kesalahan. Silakan coba lagi atau hubungi support.';
  }
}
```

### Pattern 5: Pagination

```javascript
// Handle large result sets with pagination
async function sendPaginatedResults(bot, chatId, items, page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);
  const totalPages = Math.ceil(items.length / pageSize);
  
  // Format page content
  let message = `*Results (Page ${page}/${totalPages})*\n\n`;
  pageItems.forEach((item, idx) => {
    message += `${start + idx + 1}. ${item.name}\n`;
  });
  
  // Pagination buttons
  const keyboard = {
    inline_keyboard: []
  };
  
  const buttons = [];
  if (page > 1) {
    buttons.push({ text: '◀️ Previous', callback_data: `page_${page - 1}` });
  }
  if (page < totalPages) {
    buttons.push({ text: 'Next ▶️', callback_data: `page_${page + 1}` });
  }
  
  if (buttons.length > 0) {
    keyboard.inline_keyboard.push(buttons);
  }
  
  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Handle pagination callbacks
bot.on('callback_query', async (query) => {
  const data = query.data;
  if (data.startsWith('page_')) {
    const page = parseInt(data.split('_')[1]);
    await sendPaginatedResults(bot, query.message.chat.id, cachedItems, page);
    await bot.answerCallbackQuery(query.id);
  }
});
```

## Security Considerations

### Authentication & Authorization

**User Verification**:
- Verify Telegram chat ID against database records
- Check user roles and permissions before processing commands
- Validate client_id associations

**Example**:
```javascript
async function verifyUserAccess(chatId, requiredRole) {
  const user = await userModel.findByTelegramId(chatId);
  
  if (!user) {
    throw new Error('User not registered');
  }
  
  if (!user.is_active) {
    throw new Error('User account is inactive');
  }
  
  if (!user[requiredRole]) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}
```

### Input Validation

**Sanitize User Input**:
- Validate all user inputs before processing
- Prevent SQL injection via parameterized queries
- Escape special characters in messages

**Example**:
```javascript
function validateClientId(clientId) {
  // Only allow alphanumeric and underscore
  if (!/^[A-Z0-9_]+$/.test(clientId)) {
    throw new Error('Invalid client ID format');
  }
  return clientId;
}

function validateDateRange(range) {
  const validRanges = ['today', '7d', '30d', '90d', 'custom'];
  if (!validRanges.includes(range)) {
    throw new Error('Invalid date range');
  }
  return range;
}
```

### Rate Limiting

**Prevent Abuse**:
- Implement rate limiting per user/chat
- Use Redis to track request counts
- Set reasonable cooldown periods

**Example**:
```javascript
const RATE_LIMIT = 10; // requests
const RATE_WINDOW = 60000; // 1 minute

async function checkRateLimit(chatId) {
  const key = `rate_limit:${chatId}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, Math.ceil(RATE_WINDOW / 1000));
  }
  
  if (count > RATE_LIMIT) {
    throw new Error('Rate limit exceeded. Please wait.');
  }
}
```

### Sensitive Data Protection

**OTP for Sensitive Operations**:
- Use OTP verification for data access requests
- Email OTP to registered user email
- Time-limited validity (15 minutes)

**Example Flow**:
```javascript
// 1. User requests sensitive data
await bot.sendMessage(chatId, 'Enter your email to receive OTP:');

// 2. Send OTP
const otp = await otpService.generateOTP(email);
await emailService.sendOTP(email, otp);

// 3. Verify OTP
const isValid = await otpService.validateOTP(email, userOTP);
if (isValid) {
  await sendSensitiveData(bot, chatId);
}
```

## Performance Optimization

### Caching Strategy

**Redis Caching**:
- Cache frequently accessed data (user profiles, client info)
- Set appropriate TTL based on data volatility
- Invalidate cache on data updates

**Example**:
```javascript
async function getUserProfile(userId) {
  const cacheKey = `user:profile:${userId}`;
  
  // Try cache first
  let profile = await redis.get(cacheKey);
  if (profile) {
    return JSON.parse(profile);
  }
  
  // Fetch from database
  profile = await userModel.findById(userId);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(profile));
  
  return profile;
}
```

### Async Operations

**Non-Blocking Processing**:
- Use async/await for I/O operations
- Process heavy operations in background
- Send immediate acknowledgment to user

**Example**:
```javascript
async function handleHeavyReport(bot, chatId, params) {
  // Send immediate acknowledgment
  await bot.sendMessage(chatId, 'Report generation started. This may take a few minutes...');
  
  // Process in background
  generateReport(params)
    .then(report => {
      return bot.sendDocument(chatId, report.buffer, {
        filename: report.filename
      });
    })
    .then(() => {
      return bot.sendMessage(chatId, '✅ Report generated successfully!');
    })
    .catch(error => {
      logger.error('[HEAVY_REPORT] Error:', error);
      return bot.sendMessage(chatId, '❌ Report generation failed.');
    });
}
```

### Resource Management

**Connection Pooling**:
- Reuse database connections
- Limit concurrent operations
- Implement queue for heavy tasks

**Example**:
```javascript
const queue = [];
let processing = false;

async function addToQueue(task) {
  queue.push(task);
  if (!processing) {
    processQueue();
  }
}

async function processQueue() {
  processing = true;
  
  while (queue.length > 0) {
    const task = queue.shift();
    try {
      await task();
    } catch (error) {
      logger.error('[QUEUE] Task failed:', error);
    }
  }
  
  processing = false;
}
```

## Testing Telegram Bots

### Manual Testing

**Test Checklist**:
1. ✅ Bot responds to `/start` command
2. ✅ Menu displays correctly
3. ✅ Each menu option works as expected
4. ✅ Error handling displays user-friendly messages
5. ✅ Authentication/authorization checks work
6. ✅ Reports generate with correct data
7. ✅ Excel/PDF exports download successfully
8. ✅ Pagination works for large datasets
9. ✅ Rate limiting prevents abuse
10. ✅ Bot handles concurrent users

### Automated Testing

**Unit Tests**:
```javascript
// tests/telegram/dirRequestHandlers.test.js

describe('dirRequestHandlers', () => {
  let mockBot;
  
  beforeEach(() => {
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      sendDocument: jest.fn().mockResolvedValue({})
    };
  });
  
  test('should generate user recap', async () => {
    const chatId = 123456;
    const params = { clientId: 'DITBINMAS' };
    
    await handleMenuOption1(mockBot, chatId, params);
    
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('Data User Recap'),
      expect.any(Object)
    );
  });
});
```

## Best Practices

### 1. Message Formatting

**Use Markdown for Rich Text**:
```javascript
const message = `*User Statistics*\n\n` +
  `👥 Total Users: ${stats.total}\n` +
  `✅ Active: ${stats.active}\n` +
  `❌ Inactive: ${stats.inactive}\n` +
  `\n_Last updated: ${timestamp}_`;

await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
```

### 2. User Feedback

**Always Provide Feedback**:
- Acknowledge user actions
- Show loading indicators for long operations
- Confirm success or explain failures

```javascript
// Acknowledge action
await bot.sendMessage(chatId, '✅ Data updated successfully!');

// Show progress
await bot.sendMessage(chatId, '⏳ Processing... (1/3)');
```

### 3. Error Recovery

**Graceful Degradation**:
- Always offer a way to return to menu
- Provide clear next steps on errors
- Log errors for debugging

```javascript
catch (error) {
  logger.error('[ERROR]', error);
  await bot.sendMessage(chatId, 
    'Terjadi kesalahan. Silakan:\n' +
    '1. Coba lagi\n' +
    '2. Kembali ke menu utama (/start)\n' +
    '3. Hubungi support jika masalah berlanjut'
  );
}
```

### 4. Logging

**Comprehensive Logging**:
```javascript
logger.info('[BOT_DIREKTORAT] User request:', {
  chatId,
  userId,
  action: 'menu_1',
  timestamp: new Date().toISOString()
});

logger.error('[BOT_DIREKTORAT] Error:', {
  chatId,
  action: 'menu_1',
  error: error.message,
  stack: error.stack
});
```

### 5. Documentation

**Document Menu Options**:
- Keep menu descriptions clear and concise
- Document expected inputs
- Provide examples where helpful

## Extending Bot Functionality

### Adding a New Menu Option

**Steps**:

1. **Define menu option** in menu handler:
```javascript
// src/handler/menu/dirRequestHandlers.js

export async function handleNewMenuOption(bot, chatId, params) {
  // Implementation here
}
```

2. **Add to menu display**:
```javascript
const menuOptions = [
  '1. Existing Option 1',
  '2. Existing Option 2',
  '3. New Menu Option',  // Add here
];
```

3. **Route selection** in bot service:
```javascript
if (selection === '3') {
  await handleNewMenuOption(bot, chatId, params);
}
```

4. **Test thoroughly**:
- Manual testing with real bot
- Add unit tests
- Document in user guide

### Creating a New Bot Type

**Steps**:

1. **Create bot service**:
```javascript
// src/service/telegramNewBotService.js

export function initializeNewBot(bot) {
  bot.on('message', async (msg) => {
    await handleNewBotMessage(bot, msg);
  });
}
```

2. **Create menu handlers**:
```javascript
// src/handler/menu/newBotHandlers.js

export async function handleNewBotMenu1(bot, chatId) {
  // Implementation
}
```

3. **Add environment variables**:
```ini
TELEGRAM_NEWBOT_BOT_TOKEN=your_token_here
TELEGRAM_NEWBOT_BOT_ENABLED=true
```

4. **Initialize in app.js**:
```javascript
if (env.TELEGRAM_NEWBOT_BOT_ENABLED) {
  const newBot = new TelegramBot(env.TELEGRAM_NEWBOT_BOT_TOKEN, {
    polling: true
  });
  initializeNewBot(newBot);
}
```

5. **Document and test**

## Troubleshooting

### Common Issues

**Bot Not Responding**:
- Check bot token is correct
- Verify bot is enabled in environment
- Check logs for initialization errors
- Ensure polling is active

**Menu Not Displaying**:
- Check keyboard markup syntax
- Verify message format
- Check bot has permission to send messages

**Reports Failing**:
- Check database connectivity
- Verify external API keys (RapidAPI)
- Check Redis connection
- Review service logs

**Rate Limiting**:
- Check Redis for rate limit keys
- Verify rate limit configuration
- Clear rate limit keys if testing

### Debugging Tools

**Enable Debug Logging**:
```javascript
// Set in environment
DEBUG_FETCH_INSTAGRAM=true
```

**Check Bot Status**:
```bash
pm2 logs cicero-telegram
pm2 monit
```

**Test Bot Connectivity**:
```bash
curl https://api.telegram.org/bot<TOKEN>/getMe
```

## Related Documentation

- **Multi-bot setup**: `docs/telegram_multi_bot_setup.md`
- **User bot linking**: `docs/telegram_user_bot_linking.md`
- **User guide**: `docs/PANDUAN_PENGGUNA_BOT_TELEGRAM.md`
- **Database structure**: `docs/database_structure.md`
- **Enterprise architecture**: `docs/enterprise_architecture.md`

---

*This document reflects the Telegram bot architecture as of 2026-02-04 and is maintained alongside the codebase.*
