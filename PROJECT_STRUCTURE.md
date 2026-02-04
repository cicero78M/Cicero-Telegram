# Project Structure Documentation

**Last updated: 2026-02-04**

This document provides a detailed explanation of the Cicero-Telegram repository structure, purpose of each directory, key files, and their relationships.

## Root Directory

```
/home/runner/work/Cicero-Telegram/Cicero-Telegram/
```

### Configuration Files

| File | Purpose | Notes |
|------|---------|-------|
| **package.json** | NPM project configuration | Dependencies, scripts, metadata |
| **package-lock.json** | Locked dependency versions | Auto-generated, commit to repo |
| **.env.example** | Environment variable template | 44+ configuration settings |
| **ecosystem.config.js** | PM2 deployment configuration | Production process management |
| **jest.config.js** | Jest testing framework config | Test runner settings |
| **eslint.config.js** | ESLint linting rules | Code quality standards |
| **.prettierrc** | Prettier formatting config | Code style enforcement |
| **nodemon.json** | Nodemon auto-reload config | Development hot reload settings |
| **.gitignore** | Git exclusions | Excludes node_modules, .env, logs, etc. |
| **LICENSE** | MIT license | Open source license |

### Application Entry Point

**`app.js`** - Main application entry point
- Initializes 4 independent Telegram bots
- Conditionally starts bots based on environment flags
- No HTTP server (pure backend, bot-only interface)
- Handles graceful shutdown

**Telegram Bots Initialized:**
1. **Bot Direktorat** - For directorate-level administrators
2. **Bot Operator** - For organizational operators
3. **Bot User** - For end users (personnel)
4. **Bot Client** - For client administrators

## `/src/` - Source Code Directory

The main application source code organized by responsibility.

### `/src/config/` - Configuration Management

**Purpose**: Centralized configuration loading and validation

| File | Purpose |
|------|---------|
| **env.js** | Environment variable validation using Envalid |
| **redis.js** | Redis client initialization and connection |
| **dashboardPremium.js** | Premium tier definitions and access rules |

**Key Features:**
- Type-safe environment variables
- Required vs. optional settings
- Default value handling
- Validation at startup

### `/src/db/` - Database Abstraction Layer

**Purpose**: Multi-database support with unified interface

| File | Purpose |
|------|---------|
| **index.js** | Database factory/dispatcher |
| **postgres.js** | PostgreSQL connection pool (primary) |
| **mysql.js** | MySQL adapter (fallback) |
| **sqlite.js** | SQLite adapter (testing) |

**Design Pattern**: Factory pattern for database selection

**Connection Features:**
- Connection pooling
- Automatic reconnection
- Query parameter escaping
- Transaction support

### `/src/model/` - Data Models (34+ models)

**Purpose**: Database schema representation and data access

**Categories:**

#### User Management Models
- **userModel.js** - Application user accounts
- **dashboardUserModel.js** - Dashboard-specific users
- **penmasUserModel.js** - Penmas editorial users

#### Client Management Models
- **clientModel.js** - Client organization data
- Client-user relationships

#### Social Media Models
- **instaPostModel.js** - Instagram posts
- **tiktokPostModel.js** - TikTok posts/videos
- **instaCommentModel.js** - Instagram comments
- **tiktokCommentModel.js** - TikTok comments
- **instaLikeModel.js** - Instagram likes tracking
- **instaPostMetricsModel.js** - Instagram metrics snapshots
- **tiktokSnapshotModel.js** - TikTok profile snapshots
- **instaPostCacheModel.js** - Cached Instagram data
- **satbinmasOfficialMediaModel.js** - Official account tracking

#### Subscription Models
- **dashboardSubscriptionModel.js** - Premium subscriptions
- **premiumRequestModel.js** - Premium tier requests

#### Editorial Workflow Models
- **editorialEventModel.js** - Penmas events
- **approvalRequestModel.js** - Approval workflows
- **pressReleaseDetailModel.js** - Press release content

#### Tracking & Logging Models
- **linkReportModel.js** - Link amplification tracking
- **linkReportKhususModel.js** - Special link tracking
- **loginLogModel.js** - Login audit logs
- **visitorLogModel.js** - Visitor tracking
- **changeLogModel.js** - Data modification audit

#### System Models
- **cronJobConfigModel.js** - Cron job toggles
- **waNotificationReminderStateModel.js** - WhatsApp reminder state

**Model Responsibilities:**
- CRUD operations (Create, Read, Update, Delete)
- Data validation
- Relationship handling
- Query building

### `/src/handler/` - Business Logic Handlers

**Purpose**: Implements business workflows and Telegram bot menus

#### `/src/handler/menu/` - Telegram Bot Menu Handlers

**Purpose**: Menu systems for each Telegram bot

| File | Purpose | Menu Count |
|------|---------|------------|
| **dirRequestHandlers.js** | Directorate bot menus | 20+ options |
| **oprRequestHandlers.js** | Operator bot menus | 15+ options |
| **userMenuHandlers.js** | User bot menus | 10+ options |
| **clientRequestHandlers.js** | Client bot menus | 10+ options |
| **clientRequestTelegramHandlers.js** | Client Telegram integration | - |
| **dashRequestHandlers.js** | Dashboard admin menus | - |
| **menuPromptHelpers.js** | Menu UI utilities | - |

**Directorate Bot Menu Examples:**
1. Data user recap
2. Executive summaries
3. Instagram attendance reports
4. TikTok attendance reports
5. Satker update matrix
6. Engagement rankings
7. Comment/likes recaps
8. Weekly/monthly reports
9. Link amplification status
10. Compliance metrics

**Operator Bot Menu Examples:**
1. User management
2. Amplification tracking
3. Engagement monitoring
4. Report generation
5. Data exports

**User Bot Menu Examples:**
1. Profile updates
2. Social media linking
3. Task status
4. Personal statistics

#### `/src/handler/fetchabsensi/` - Attendance & Engagement Tracking

**Purpose**: Track user participation in social media activities

##### `/src/handler/fetchabsensi/insta/` - Instagram Attendance
- **absensiLikesInsta.js** - Track Instagram likes participation
- **absensiKomentarInstagram.js** - Track Instagram comments participation
- **ditbinmasLikesUtils.js** - Ditbinmas-specific like tracking

##### `/src/handler/fetchabsensi/tiktok/` - TikTok Attendance
- **absensiKomentarTiktok.js** - Track TikTok comments participation

##### `/src/handler/fetchabsensi/link/` - Link Amplification Tracking
- **absensiLinkAmplifikasi.js** - Track link amplification participation
- **absensiLinkKhusus.js** - Track special link participation
- **rekapLink.js** - Link recap generation

##### `/src/handler/fetchabsensi/wa/` - WhatsApp Operations
- **absensiRegistrasiWa.js** - WhatsApp registration tracking
- **absensiUpdateDataUsername.js** - Username update tracking

##### `/src/handler/fetchabsensi/dashboard/` - Dashboard Tracking
- **absensiLoginWeb.js** - Dashboard login tracking
- **absensiRegistrasiDashboardDirektorat.js** - Directorate dashboard registration

##### `/src/handler/fetchabsensi/` - Core Files
- **sosmedTask.js** - Social media task management

#### `/src/handler/fetchpost/` - Social Media Post Fetching

**Purpose**: Retrieve posts from Instagram and TikTok

- **instaFetchPost.js** - Fetch Instagram posts for users
- **instaFetchPostInfo.js** - Fetch detailed Instagram post information
- **tiktokFetchPost.js** - Fetch TikTok videos for users

**Flow:**
1. Identify target users
2. Call RapidAPI endpoints
3. Parse response data
4. Deduplicate posts
5. Store in database
6. Cache for performance

#### `/src/handler/fetchengagement/` - Engagement Metric Fetching

**Purpose**: Collect likes, comments, and other engagement metrics

- **fetchLikesInstagram.js** - Fetch Instagram likes
- **fetchCommentInstagram.js** - Fetch Instagram comments
- **fetchCommentTiktok.js** - Fetch TikTok comments

**Engagement Types:**
- Likes count
- Comments count
- Shares count
- Views count
- Follower changes

#### `/src/handler/datamining/` - Data Mining Operations

**Purpose**: Advanced data collection and analysis

- **fetchDmPosts.js** - Data mining for posts
- **fetchDmComments.js** - Data mining for comments
- **fetchDmLikes.js** - Data mining for likes
- **fetchDmHashtags.js** - Hashtag analysis
- **fetchDmPostInfo.js** - Detailed post information

### `/src/service/` - Service Layer (75+ services)

**Purpose**: Core business logic and external integrations

#### Telegram Bot Services

| Service | Purpose |
|---------|---------|
| **telegramDirektoratBotService.js** | Bot Direktorat implementation |
| **telegramOperatorBotService.js** | Bot Operator implementation |
| **telegramUserBotService.js** | Bot User implementation |
| **telegramClientBotService.js** | Bot Client implementation |
| **telegramBotService.js** | Legacy bot (deprecated) |

**Features:**
- Message parsing
- Menu rendering
- Command routing
- Error handling
- User session management

#### Social Media API Services

| Service | Purpose |
|---------|---------|
| **instagramApi.js** | Low-level Instagram API wrapper |
| **tiktokApi.js** | Low-level TikTok API wrapper |
| **instaRapidService.js** | Instagram with fallback & caching |
| **tiktokRapidService.js** | TikTok with fallback & caching |
| **instagram/instagramReport.js** | Instagram analytics reports |

**API Features:**
- Primary + fallback hosts
- Automatic retry logic
- Rate limiting handling
- Response caching
- Error recovery

#### Communication Services

| Service | Purpose |
|---------|---------|
| **emailService.js** | SMTP email delivery (Nodemailer) |
| **otpService.js** | OTP generation & validation |
| **otpQueue.js** | OTP delivery queue (RabbitMQ) |

**OTP Flow:**
1. Generate random OTP
2. Store in database with expiry
3. Queue email delivery
4. Send via SMTP
5. Validate on user input

#### Integration Services

| Service | Purpose |
|---------|---------|
| **googleContactsService.js** | Google People API sync |
| **rabbitMQService.js** | RabbitMQ queue management |
| **profileCacheService.js** | Redis profile caching |

#### Business Services

| Service | Purpose |
|---------|---------|
| **premiumService.js** | Premium subscription management |
| **aggregatorService.js** | Dashboard analytics aggregation |
| **complaintService.js** | Complaint response formatting |
| **clientService.js** | Client CRUD operations |
| **userMigrationService.js** | User data migrations |

#### Report & Export Services

**Naming Pattern**: `*ExportService.js`, `*ReportService.js`

**Report Types:**
- Weekly recaps
- Monthly summaries
- Executive reports
- Attendance reports
- Engagement rankings
- Link amplification status
- Excel exports
- PDF generation

### `/src/repository/` - Data Access Layer

**Purpose**: Database query abstraction

| File | Purpose |
|------|---------|
| **db.js** | Generic query wrapper |
| **clientContactRepository.js** | Client contact queries |

**Repository Pattern Benefits:**
- Abstracts raw SQL
- Reusable query logic
- Easier testing (mock repositories)
- Centralized query optimization

### `/src/middleware/` - Middleware Layer

**Purpose**: Express middleware for request/response processing

| File | Purpose |
|------|---------|
| **debugHandler.js** | Debug logging middleware |

**Note**: Limited middleware since this is primarily a bot-based backend without web endpoints.

### `/src/utils/` - Utility Functions (20+ utilities)

**Purpose**: Reusable helper functions

#### Core Utilities

| Utility | Purpose |
|---------|---------|
| **logger.js** | Winston-based structured logging |
| **response.js** | Standardized API response formatter |
| **constants.js** | Application-wide constants |

#### Security Utilities

| Utility | Purpose |
|---------|---------|
| **crypt.js** | CryptoJS AES encryption/decryption |
| **requestHash.js** | Redis-based request deduplication |

#### Telegram Utilities

| Utility | Purpose |
|---------|---------|
| **telegramBotHelpers.js** | Telegram message formatting |
| **telegramNotificationHelpers.js** | Notification utilities |

#### Data Processing Utilities

| Utility | Purpose |
|---------|---------|
| **excelHelper.js** | XLSX report generation |
| **sortingHelper.js** | Data sorting utilities |
| **formatHelper.js** | Data formatting functions |

#### Scheduling Utilities

| Utility | Purpose |
|---------|---------|
| **cronScheduler.js** | Cron job safety checks |

**Additional Utilities:**
- Email formatting
- Date/time helpers
- Validation functions
- String manipulation
- Number formatting

### `/src/data/` - Static Data

**Purpose**: Application-level static datasets

| File | Purpose |
|------|---------|
| **satkerDspMap.js** | Satker to DSP organizational mapping |

**Use Cases:**
- Organizational hierarchies
- Code mappings
- Reference data
- Lookup tables

## `/docs/` - Documentation (44+ files)

**Purpose**: Comprehensive project documentation

### Documentation Categories

#### Setup & Configuration
- **telegram_multi_bot_setup.md** - Multi-bot setup guide
- **telegram_bot_setup.md** - Single bot setup guide
- **server_migration.md** - Server migration procedures
- **reverse_proxy_config.md** - Nginx configuration
- **pg_backup_gdrive.md** - Database backup to Google Drive

#### Architecture & Design
- **enterprise_architecture.md** - System architecture overview
- **database_structure.md** - Database schema documentation
- **combined_overview.md** - Frontend + backend overview
- **metadata_flow.md** - Data flow documentation
- **business_process.md** - Business process documentation

#### API Documentation
- **login_api.md** - Login endpoint documentation
- **claim_api.md** - OTP claim flow documentation
- **complaint_response.md** - Complaint handling API
- **aggregator_api.md** - Aggregator endpoints
- **instaPostsApi.md** - Instagram posts API
- **instaRekapLikesApi.md** - Instagram likes recap API
- **tiktokRekapKomentarApi.md** - TikTok comments recap API
- **amplifyRekapApi.md** - Link amplification API
- **amplifyRekapLinkApi.md** - Link recap API
- **linkReportsApi.md** - Link reports API
- **penmas_api_design.md** - Penmas API design

#### Integration Documentation
- **google_contacts_integration.md** - Google Contacts sync
- **instaRapidApi.md** - Instagram RapidAPI integration
- **rabbitmq.md** - RabbitMQ message queue
- **redis.md** - Redis caching configuration

#### User Guides
- **PANDUAN_PENGGUNA_BOT_TELEGRAM.md** - Telegram bot user guide (Indonesian)
- **workflow_usage_guide.md** - Workflow usage guide
- **telegram_user_bot_linking.md** - User bot linking guide

#### Feature Documentation
- **premium_subscription.md** - Premium subscription system
- **user_role_deactivation.md** - User deactivation flows
- **complaint_formats.md** - Accepted complaint formats
- **satbinmas_official_accounts.md** - Official account tracking

#### Development Documentation
- **naming_conventions.md** - Code naming standards
- **pull_request_guidelines.md** - PR submission guidelines
- **frontend_login_scaling.md** - Frontend scaling considerations
- **frontend_complaint_api_guide.md** - Frontend complaint API integration

#### Operations Documentation
- **activity_schedule.md** - Scheduled task documentation
- **laporan_harian_engagement.md** - Daily engagement reports
- **vision_mission_kpi.md** - Vision, mission, KPIs
- **roleToClientMapping.md** - Role to client mapping

#### Troubleshooting
- **SOLUSI_403_KOMPLAIN_API.md** - 403 error solutions (Indonesian)

## `/sql/` - Database Schema & Migrations

**Purpose**: Database initialization and version control

### Structure
```
sql/
├── schema.sql              # Complete database schema
└── migrations/             # Version-controlled schema changes
    ├── 001_initial.sql
    ├── 002_add_telegram_bots.sql
    └── ...
```

**Schema Components:**
- Table definitions
- Indexes
- Foreign key constraints
- Default values
- Triggers
- Functions
- Views

## `/scripts/` - Utility Scripts

**Purpose**: Development and operations scripts

**Common Scripts:**
- Database seeding
- Data migration
- Backup automation
- Development helpers

## `/tests/` - Test Suites

**Purpose**: Automated testing with Jest

### Test Structure
```
tests/
├── unit/                   # Unit tests (individual functions)
├── integration/            # Integration tests (multiple components)
├── fixtures/               # Test data
└── mocks/                  # Mock objects
```

**Testing Strategy:**
- Models: CRUD operations
- Services: Business logic
- Handlers: Menu flows
- Utilities: Helper functions

**Test Commands:**
```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # Coverage report
```

## `/laphar/` - Legacy Artifacts

**Purpose**: Historical reference for old recap system

**Status**: Deprecated, kept for reference only

**Contents:**
- Old report templates
- Legacy data formats
- Historical configurations

**Note**: New implementations should NOT use this directory.

## Root-Level Documentation Files

### Implementation Summaries
- **TELEGRAM_BOT_IMPLEMENTATION_SUMMARY.md** - Bot implementation summary
- **TELEGRAM_BOT_REORGANIZATION_SUMMARY.md** - Bot reorganization notes
- **TELEGRAM_LINKING_IMPLEMENTATION.md** - Bot linking implementation
- **FINAL_IMPLEMENTATION_SUMMARY.md** - Final implementation summary
- **FINAL_SUMMARY.md** - Project summary

### Security Documentation
- **SECURITY.md** - Security policy
- **SECURITY_SUMMARY.md** - Security analysis summary
- **SECURITY_SUMMARY_TELEGRAM_LINKING.md** - Telegram linking security
- **TELEGRAM_BOT_SECURITY_SUMMARY.md** - Bot security summary
- **SECURITY_ANALYSIS_MESSAGE_RECEPTION.md** - Message reception security

### Investigation & Fixes
- **INVESTIGATION_REPORT.md** - Problem investigation report
- **DIRREQUEST_FIX_DOCUMENTATION.md** - DirRequest fix documentation
- **DIRREQUEST_SECURITY_SUMMARY.md** - DirRequest security summary

### Guides
- **TELEGRAM_BOT_QUICK_START.md** - Quick start guide
- **AGENTS.md** - Agent configuration (GitHub Copilot)
- **PR_DESCRIPTION.md** - Pull request description
- **CLIENTREQUEST_TELEGRAM_BOT_IMPLEMENTATION.md** - Client bot implementation

## File Naming Conventions

### JavaScript Files
- **camelCase**: Functions and variables
  - Example: `getUserData`, `calculateEngagement`
- **PascalCase**: Classes and constructors
  - Example: `UserModel`, `TelegramBot`

### Database Files
- **snake_case**: Tables and columns
  - Example: `user_account`, `created_at`

### Constants
- **UPPER_SNAKE_CASE**: Environment variables and constants
  - Example: `DB_HOST`, `MAX_RETRIES`

### Documentation Files
- **UPPER_SNAKE_CASE.md**: Important documentation
  - Example: `README.md`, `ARCHITECTURE.md`
- **snake_case.md**: Feature documentation
  - Example: `naming_conventions.md`, `telegram_bot_setup.md`

## Directory Ownership & Responsibilities

| Directory | Owner/Team | Purpose |
|-----------|------------|---------|
| `/src/config/` | DevOps | Configuration management |
| `/src/db/` | Backend | Database abstraction |
| `/src/model/` | Backend | Data modeling |
| `/src/handler/` | Backend | Business logic |
| `/src/service/` | Backend | Service layer |
| `/src/repository/` | Backend | Data access |
| `/src/middleware/` | Backend | Request processing |
| `/src/utils/` | All | Shared utilities |
| `/docs/` | All | Documentation |
| `/sql/` | Backend + DevOps | Database schema |
| `/tests/` | QA + Backend | Testing |

## Dependencies & Relationships

### Handler → Service → Repository → Model
```
Menu Handler
    ↓
Business Service
    ↓
Repository (optional)
    ↓
Model
    ↓
Database
```

### External Integration Flow
```
External API
    ↓
Service (with caching)
    ↓
Handler (processing)
    ↓
Model (storage)
    ↓
Database
```

### Bot Message Flow
```
Telegram API
    ↓
Bot Service
    ↓
Menu Handler
    ↓
Business Service
    ↓
Database
    ↓
Response Formatter
    ↓
Telegram API
```

## Key Design Patterns

### Repository Pattern
- Abstraction over data access
- Files: `/src/repository/*.js`

### Service Pattern
- Business logic isolation
- Files: `/src/service/*.js`

### Factory Pattern
- Database adapter selection
- File: `/src/db/index.js`

### Strategy Pattern
- Multi-database support
- Files: `/src/db/*.js`

### Singleton Pattern
- Redis client
- Logger instance

## Environment-Specific Considerations

### Development Environment
- **Nodemon**: Auto-reload on file changes
- **Debug logging**: Verbose output
- **Hot reload**: Enabled
- **Duplicates**: Allowed (`ALLOW_DUPLICATE_REQUESTS=true`)

### Production Environment
- **PM2**: Process management with clustering
- **Watch mode**: Disabled
- **Log rotation**: Enabled
- **Duplicates**: Blocked (request deduplication enabled)

## Common Development Workflows

### Adding a New Telegram Bot Menu
1. Add menu handler in `/src/handler/menu/`
2. Implement business logic in `/src/service/`
3. Add database operations in `/src/model/`
4. Update bot service to route the menu
5. Test with Telegram bot
6. Document in `/docs/`

### Adding a New Social Media Integration
1. Create API wrapper in `/src/service/`
2. Add caching logic
3. Create data model in `/src/model/`
4. Add fetch handler in `/src/handler/fetchpost/` or `/src/handler/fetchengagement/`
5. Test with real API
6. Document API in `/docs/`

### Adding a New Report
1. Create report service in `/src/service/`
2. Use Excel helper from `/src/utils/excelHelper.js`
3. Add menu option in appropriate handler
4. Test report generation
5. Document in `/docs/`

## Important Notes

### Non-Existent Directories
The following directories are **referenced in old documentation but DO NOT exist**:
- ❌ `/src/controller/` - No separate controller layer
- ❌ `/src/routes/` - No Express routes (bot-only interface)
- ❌ `/src/cron/` - No dedicated cron directory (likely external scheduling)

**Use Instead:**
- Business logic → `/src/handler/`
- Service layer → `/src/service/`
- Menu routing → Bot services

### Deprecated Features
- **`telegramBotService.js`** - Legacy single bot, replaced by 4 specialized bots
- **`/laphar/`** - Old recap system, kept for reference only
- **`pegiat_medsos_apps/`** - Not present in current structure (removed)

### Critical Files
Files that should NEVER be deleted:
- `app.js` - Application entry point
- `.env` - Environment configuration (never commit!)
- `package.json` - Dependency manifest
- `ecosystem.config.js` - PM2 configuration
- `sql/schema.sql` - Database schema

## Quick Reference

### Most Frequently Modified Files
1. `/src/handler/menu/*.js` - Menu implementations
2. `/src/service/*.js` - Business logic
3. `/src/model/*.js` - Data models
4. `.env` - Configuration (never commit!)
5. `/docs/*.md` - Documentation

### Most Frequently Read Files
1. `README.md` - Project overview
2. `docs/telegram_multi_bot_setup.md` - Bot setup
3. `docs/database_structure.md` - Database schema
4. `docs/naming_conventions.md` - Code standards
5. `.env.example` - Configuration template

### Entry Points for New Developers
1. Start with: `README.md`
2. Understand architecture: `ARCHITECTURE.md` (this file)
3. Set up environment: `.env.example` → `.env`
4. Explore code: `/src/handler/menu/` for menu examples
5. Run tests: `npm test`

---

*This document reflects the actual structure as of 2026-02-04. Last updated by GitHub Copilot.*
