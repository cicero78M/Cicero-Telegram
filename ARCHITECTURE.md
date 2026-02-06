# Cicero-Telegram Architecture

**Last updated: 2026-02-04**

## Overview

Cicero-Telegram is a specialized backend system for Indonesian police (Polri) social media monitoring and workflow automation. The system operates as a pure backend service with **four independent Telegram bots** as the primary user interface, replacing traditional web endpoints.

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Cicero-Telegram Backend                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ Bot Direktorat │  │  Bot Operator  │  │   Bot User   │ │
│  │  (Directorate) │  │   (Admin/Ops)  │  │ (End Users)  │ │
│  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘ │
│           │                   │                   │          │
│           └───────────────────┴───────────────────┘          │
│                              │                                │
│  ┌───────────────────────────▼──────────────────────────┐   │
│  │           Menu Handler Layer                         │   │
│  │  (dirRequest, oprRequest, userMenu handlers)         │   │
│  └───────────────────────────┬──────────────────────────┘   │
│                              │                                │
│  ┌───────────────────────────▼──────────────────────────┐   │
│  │           Service Layer (75+ services)               │   │
│  │  • Social media APIs (Instagram, TikTok)             │   │
│  │  • Email & OTP services                              │   │
│  │  • Premium subscription management                    │   │
│  │  • Google Contacts integration                        │   │
│  │  • Analytics & reporting                              │   │
│  └───────────────────────────┬──────────────────────────┘   │
│                              │                                │
│  ┌───────────────────────────▼──────────────────────────┐   │
│  │           Data Layer                                 │   │
│  │  • Models (34+ database models)                      │   │
│  │  • Repositories (query helpers)                      │   │
│  └───────────────────────────┬──────────────────────────┘   │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────┐           ┌───────▼────────┐
        │   PostgreSQL   │           │     Redis      │
        │   (Primary DB) │           │    (Cache)     │
        └────────────────┘           └────────────────┘
                │                             │
        ┌───────▼────────┐           ┌───────▼────────┐
        │   RabbitMQ     │           │  External APIs │
        │ (Message Queue)│           │ • RapidAPI     │
        └────────────────┘           │ • Google APIs  │
                                     │ • SMTP Server  │
                                     └────────────────┘
```

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Framework** | Express.js | - | Internal routing (no web endpoints) |
| **Database** | PostgreSQL | 8.16+ | Primary data store |
| **Cache** | Redis | 4.6+ | Session storage & caching |
| **Message Queue** | RabbitMQ | - | Async job processing |
| **Bot Framework** | node-telegram-bot-api | 0.67+ | Telegram bot SDK |

### External Integrations

| Service | Library | Purpose |
|---------|---------|---------|
| **Instagram/TikTok** | axios, node-fetch | RapidAPI social media data |
| **Email** | nodemailer | SMTP OTP delivery |
| **Google APIs** | googleapis | Contacts sync, Drive backups |
| **Encryption** | crypto-js | AES data encryption |
| **Excel** | xlsx | Report generation |
| **PDF** | md-to-pdf | Document generation |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Jest** | Testing framework |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Nodemon** | Development hot reload |
| **PM2** | Production process management |

## Application Architecture

### Entry Point: `app.js`

The application entry point initializes four independent Telegram bots:

```javascript
// Conditional bot initialization based on environment flags
1. TELEGRAM_DIREKTORAT_BOT_TOKEN → Bot Direktorat
2. TELEGRAM_OPERATOR_BOT_TOKEN   → Bot Operator
3. TELEGRAM_USER_BOT_TOKEN       → Bot User
4. TELEGRAM_CLIENT_BOT_TOKEN     → Bot Client
```

**Key characteristics:**
- No HTTP server (pure backend)
- Bots use polling mode for message reception
- Each bot has independent token and enable flag
- Graceful degradation if bots are disabled

### Directory Structure & Responsibilities

#### `/src/config/` - Configuration Layer
- **`env.js`**: Envalid-validated environment variables
- **`redis.js`**: Redis client initialization
- **`dashboardPremium.js`**: Premium tier configuration

#### `/src/db/` - Database Abstraction Layer
- **Multi-database support**: PostgreSQL (primary), MySQL, SQLite
- **Connection pooling**: Managed via `pg` library
- **Factory pattern**: `index.js` dispatches to appropriate adapter

#### `/src/model/` - Data Models (34+ models)
- User management: `userModel.js`, `dashboardUserModel.js`, `penmasUserModel.js`
- Social media: `instaPostModel.js`, `tiktokPostModel.js`, comment/like models
- Subscriptions: `dashboardSubscriptionModel.js`, `premiumRequestModel.js`
- Editorial: `editorialEventModel.js`, `approvalRequestModel.js`
- Tracking: Link reports, login logs, visitor logs, change logs

#### `/src/handler/` - Business Logic Layer

**Menu Handlers** (`handler/menu/`):
- **`dirRequestHandlers.js`**: 20+ menu options for directorate admins
  - User recaps, executive summaries
  - Instagram/TikTok attendance reports
  - Engagement rankings, comment/like recaps
- **`oprRequestHandlers.js`**: Operator administrative functions
- **`userMenuHandlers.js`**: End-user profile management
- **`clientRequestHandlers.js`**: Client administrator menus
- **`clientRequestTelegramHandlers.js`**: Client Telegram integration

**Data Handlers**:
- **`fetchabsensi/`**: Attendance & engagement tracking
  - `insta/`: Instagram likes/comments attendance
  - `tiktok/`: TikTok comments attendance
  - `link/`: Link amplification tracking
  - `wa/`: WhatsApp registration handlers
  - `dashboard/`: Dashboard login tracking
- **`fetchpost/`**: Social media post fetching
- **`fetchengagement/`**: Engagement metric collection
- **`datamining/`**: Advanced data mining operations

#### `/src/service/` - Service Layer (75+ services)

**Telegram Services**:
- `telegramDirektoratBotService.js`
- `telegramOperatorBotService.js`
- `telegramUserBotService.js`
- `telegramClientBotService.js`

**Social Media Services**:
- `instaRapidService.js`: Instagram API with fallback
- `tiktokRapidService.js`: TikTok API with fallback
- `instagram/instagramReport.js`: Instagram analytics

**Integration Services**:
- `emailService.js`: Nodemailer SMTP
- `otpService.js`: OTP generation/validation
- `otpQueue.js`: OTP delivery queue
- `googleContactsService.js`: Google People API sync
- `rabbitMQService.js`: RabbitMQ queue management

**Business Services**:
- `premiumService.js`: Subscription management
- `aggregatorService.js`: Dashboard analytics aggregation
- `complaintService.js`: Complaint response formatting
- `clientService.js`: Client operations
- `userMigrationService.js`: Staff data migrations

**Utility Services**:
- Excel export services
- WhatsApp notification services
- Report generation services
- Data transformation services

#### `/src/repository/` - Data Access Layer
- **`db.js`**: Generic query wrapper
- **`clientContactRepository.js`**: Contact-specific queries
- Abstraction over raw SQL queries

#### `/src/utils/` - Utility Layer (20+ utilities)
- **`logger.js`**: Winston-based structured logging (Asia/Jakarta timezone)
- **`debugHandler.js`**: Debug logging utility for console output
- **`crypt.js`**: CryptoJS AES encryption/decryption
- **`telegramBotHelpers.js`**: Telegram message formatting
- **`excelHelper.js`**: XLSX report generation
- **`constants.js`**: Application-wide constants
- **`cronScheduler.js`**: Cron job safety utilities

#### `/src/data/` - Static Data
- **`satkerDspMap.js`**: Satker to DSP organizational mapping

## Data Flow

### Social Media Ingestion Flow

```
External API (RapidAPI)
         │
         ▼
  instaRapidService / tiktokRapidService
  (with fallback & retry logic)
         │
         ▼
    Redis Cache
  (profile caching)
         │
         ▼
  fetchpost handlers
  (post collection)
         │
         ▼
  fetchengagement handlers
  (likes, comments, metrics)
         │
         ▼
    PostgreSQL
  (instaPostModel, tiktokPostModel, etc.)
         │
         ▼
  aggregatorService
  (analytics aggregation)
         │
         ▼
  Telegram Bot Menu
  (formatted reports)
```

### OTP Delivery Flow

```
User Request
     │
     ▼
otpService.generateOTP()
     │
     ▼
  Store in DB
     │
     ▼
otpQueue (RabbitMQ)
     │
     ▼
emailService (SMTP)
     │
     ▼
  User Email
     │
     ▼
User Enters OTP
     │
     ▼
otpService.validateOTP()
     │
     ▼
Data Access Granted
```

### Telegram Bot Interaction Flow

```
User Message → Telegram API → Bot Service
                                    │
                                    ▼
                            Menu Handler
                            (dirRequest/opr/user)
                                    │
                   ┌────────────────┼────────────────┐
                   ▼                ▼                ▼
            Service Layer    Service Layer    Service Layer
            (data fetch)     (processing)     (reporting)
                   │                │                │
                   └────────────────┼────────────────┘
                                    ▼
                              Database Query
                                    │
                                    ▼
                            Format Response
                                    │
                                    ▼
                          Send to User (Telegram)
```

## Scheduled Jobs Architecture

### Cron System Design

**Note**: This repository does NOT have a `/src/cron/` directory. Scheduled jobs are likely:
1. Managed externally via system cron
2. Handled by PM2 ecosystem configuration
3. Implemented as periodic checks within services
4. Documented in older versions but removed

Based on documentation references, the system previously had these scheduled jobs:

| Job | Schedule | Purpose |
|-----|----------|---------|
| **DB Backup** | Daily 04:00 | PostgreSQL dump → Google Drive |
| **Social Media Fetch** | Every 30 min (06:00-22:00) | Instagram/TikTok posts |
| **Engagement Updates** | Hourly (business hours) | Likes, comments, followers |
| **Link Recaps** | 3x daily | WhatsApp group delivery |
| **Monthly Reports** | Last day of month | Excel exports |
| **Subscription Expiry** | Every 30 min | Premium status checks |
| **OTP Cleanup** | Nightly | Remove expired tokens |
| **WhatsApp Reminders** | 4x daily | Task notifications |

**Runtime Safety Features**:
- Per-job `is_active` toggle in `cron_job_config` table
- Single-flight execution (prevents overlapping runs)
- Graceful fallback if DB unavailable
- `ENABLE_DIRREQUEST_GROUP` master switch for Ditbinmas jobs

## Security Architecture

### Authentication & Authorization

**JWT-based Authentication**:
- `JWT_SECRET`: Token signing
- `SECRET_KEY`: General encryption
- Token-based API access (internal use)

**OTP System**:
- Email-delivered one-time passwords
- Time-limited validity (configurable)
- Single-use tokens
- Secure random generation

**Role-Based Access Control**:
- Four bot types with distinct permissions
- Database-level role validation
- Per-client authorization checks
- Premium tier access controls

### Data Security

**Encryption**:
- AES encryption via `crypto-js`
- Sensitive data at rest (credentials, tokens)
- Environment variable protection

**Request Security**:
- Redis-based request deduplication
- 5-minute duplicate prevention window
- Claim endpoint exemptions
- `ALLOW_DUPLICATE_REQUESTS` bypass flag

**Database Security**:
- Connection pooling with credentials
- SQL injection prevention (parameterized queries)
- Row-level security (RLS) via session settings
- Regular backups to Google Drive

## Scaling Considerations

### Horizontal Scaling

**PM2 Cluster Mode**:
- Multi-process deployment
- Load balancing across cores
- Zero-downtime restarts
- Environment-specific configurations

**Stateless Design**:
- No in-memory session state (Redis-backed)
- Database connection pooling
- Cacheable API responses

### Caching Strategy

**Redis Caching**:
- Profile caching (`profileCacheService.js`)
- Google Contacts caching (TTL: `CONTACT_CACHE_TTL_MS`)
- Request deduplication hashing
- Session management

**Cache Invalidation**:
- Time-based expiry (TTL)
- Manual invalidation on data changes
- Fallback to database on cache miss

### Performance Optimization

**Database**:
- Indexed frequently queried fields
- Connection pooling (pg library)
- Query optimization
- Batch operations where possible

**External APIs**:
- Fallback API hosts (primary + secondary)
- Retry logic with exponential backoff
- Rate limiting awareness
- Response caching

**Async Processing**:
- RabbitMQ for heavy operations
- Non-blocking I/O
- Promise-based flow control
- Worker queue isolation

## Monitoring & Logging

### Logging System

**Logger Configuration** (`src/utils/logger.js`):
- Winston-based structured logging
- Asia/Jakarta timezone stamping
- Format: `YYYY-MM-DDTHH:mm:ss.SSS+07:00`
- Log levels: error, warn, info, debug

**What to Monitor**:
- Bot uptime and message processing
- Database connection health
- External API success/failure rates
- OTP delivery success rates
- Premium subscription expirations
- Scheduled job execution status

### Health Checks

**System Health Indicators**:
- Database connectivity
- Redis connectivity
- RabbitMQ queue depth
- Bot polling status
- External API availability
- Disk space (for backups)

## Deployment Architecture

### Environment Configuration

**Required Environment Variables** (44+ settings):

**Database**:
- `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASS`, `DB_PORT`
- `DB_DRIVER` (postgres/postgresql/pg)

**Cache & Queue**:
- `REDIS_URL`
- `AMQP_URL`

**Telegram Bots** (4 independent bots):
- `TELEGRAM_DIREKTORAT_BOT_TOKEN` + `TELEGRAM_DIREKTORAT_BOT_ENABLED`
- `TELEGRAM_OPERATOR_BOT_TOKEN` + `TELEGRAM_OPERATOR_BOT_ENABLED`
- `TELEGRAM_USER_BOT_TOKEN` + `TELEGRAM_USER_BOT_ENABLED`
- `TELEGRAM_CLIENT_BOT_TOKEN` + `TELEGRAM_CLIENT_BOT_ENABLED`

**External APIs**:
- `RAPIDAPI_KEY`, `RAPIDAPI_FALLBACK_KEY`, `RAPIDAPI_FALLBACK_HOST`

**Email**:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Google Integration**:
- `GOOGLE_SERVICE_ACCOUNT`
- `GOOGLE_IMPERSONATE_EMAIL`
- `GOOGLE_CONTACT_SCOPE`
- `GOOGLE_DRIVE_FOLDER_ID`

**Security**:
- `JWT_SECRET`, `SECRET_KEY`

**Feature Flags**:
- `ENABLE_DIRREQUEST_GROUP`
- `ALLOW_DUPLICATE_REQUESTS`
- `LAPHAR_ARCHIVE`
- `DEBUG_FETCH_INSTAGRAM`

### Deployment Process

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd Cicero-Telegram
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

4. **Initialize database**
   ```bash
   psql -U user -d db < sql/schema.sql
   ```

5. **Start services**
   ```bash
   # Development
   npm run dev
   
   # Production with PM2
   pm2 start ecosystem.config.js --env production
   ```

6. **Verify deployment**
   ```bash
   pm2 status
   pm2 logs cicero-telegram
   ```

### PM2 Configuration

**Ecosystem Features** (`ecosystem.config.js`):
- **Watch mode**: Disabled in production, enabled in dev
- **Ignored paths**: `laphar/`, `logs/`, `uploads/`, `backups/`, data files
- **Restart on crash**: Automatic recovery
- **Cluster mode**: Multi-instance support
- **Log management**: Automatic log rotation

## Multi-Tenant Architecture

### Client Isolation

**Per-Client Resources**:
- Instagram/TikTok account associations
- User roster and permissions
- Compliance and engagement settings
- WhatsApp group assignments
- Premium subscription tiers

**Client Identification**:
- `client_id` in all relevant queries
- Client-scoped data access
- Operator multi-client support
- Dashboard user client mapping

### Data Segregation

**Database Level**:
- Foreign key relationships to `client` table
- Query-level client filtering
- Row-level security (RLS) policies

**Application Level**:
- Service-layer client validation
- Menu handler client checks
- Report generation scoping

## Integration Architecture

### External API Integration

**RapidAPI (Instagram/TikTok)**:
- Primary host + fallback host
- Automatic retry on failure
- Rate limiting handling
- Response caching in Redis

**Google APIs**:
- Service account authentication
- Domain-wide delegation
- Contacts sync (People API)
- Drive backups (Drive API)

**SMTP Email**:
- Configurable provider
- Synchronous OTP delivery
- Error handling and logging

### Message Queue Integration

**RabbitMQ Usage**:
- Heavy async operations
- Job persistence
- Worker isolation
- Retry policies

## Error Handling & Resilience

### Error Handling Strategy

**Graceful Degradation**:
- Bot continues if one service fails
- Fallback to alternate API hosts
- Cache fallback on API failure
- Default values for missing config

**Error Boundaries**:
- Try-catch in all async operations
- Telegram error handling (message send failures)
- Database transaction rollbacks
- Service-level error isolation

### Retry Logic

**API Retries**:
- Exponential backoff
- Maximum retry attempts
- Circuit breaker pattern (implicit)

**Queue Retries**:
- RabbitMQ retry policies
- Dead letter queues
- Manual intervention queue

## Development Best Practices

### Code Organization

**Follow naming conventions** (`docs/naming_conventions.md`):
- **camelCase**: JavaScript functions and variables
- **snake_case**: Database tables and columns
- **UPPER_SNAKE_CASE**: Constants and environment variables

**Directory Placement**:
- Controllers (if needed) → `src/handler/`
- Business logic → `src/service/`
- Data access → `src/model/` or `src/repository/`
- Utilities → `src/utils/`

### Testing Strategy

**Jest Configuration** (`jest.config.js`):
- Unit tests for services
- Integration tests for handlers
- Mock external dependencies
- In-memory database (pg-mem) for testing

**Test Commands**:
```bash
npm test              # Run all tests
npm run lint          # ESLint check
npm run format        # Prettier format
```

### Code Quality

**ESLint Configuration** (`eslint.config.js`):
- JavaScript ES6+ standards
- Prettier integration
- No unused variables
- Consistent formatting

**Before Committing**:
1. Run `npm run lint`
2. Run `npm test`
3. Verify all tests pass
4. Check code formatting

## Future Architecture Considerations

### Potential Enhancements

**Microservices Migration**:
- Split bots into separate services
- Dedicated service for social media ingestion
- Independent reporting service
- API gateway for service coordination

**Real-time Features**:
- WebSocket integration for live updates
- Pub/sub pattern for event broadcasting
- Real-time analytics dashboards

**Advanced Analytics**:
- Machine learning for engagement prediction
- Anomaly detection in social metrics
- Automated content categorization
- Sentiment analysis

**Scalability Improvements**:
- Kubernetes orchestration
- Load balancer integration
- Database read replicas
- CDN for static content (if applicable)

## References

For detailed information on specific components:

- **Multi-bot setup**: `docs/telegram_multi_bot_setup.md`
- **Database schema**: `docs/database_structure.md`
- **Enterprise architecture**: `docs/enterprise_architecture.md`
- **Naming conventions**: `docs/naming_conventions.md`
- **Google integration**: `docs/google_contacts_integration.md`
- **Premium subscriptions**: `docs/premium_subscription.md`
- **Complaint handling**: `docs/complaint_response.md`

---

*This architecture document reflects the actual implementation as of 2026-02-04 and is kept in sync with the codebase.*
