# SafeHer - Production-Ready Women Safety App

SafeHer is a full-stack women-safety mobile application with an Expo React Native frontend, an Express API, and a SQLite data layer. This upgraded version keeps the original feature set intact and refines it into a cleaner, safer, more reliable launch-ready foundation.

## App Screenshots
 ![Image Alt]((https://github.com/amashfakrahman/SafeHer-Mobile-App/blob/main/Picture/WhatsApp%20Image%202026-06-12%20at%2011.15.32%20PM.jpeg))

## What is included

- Premium light and dark mobile UI system
- Authentication with JWT and encrypted local session storage
- Long-press SOS emergency flow
- Trusted contacts management
- Live location sharing with revocable public tracking link
- Background location update service, best effort in Expo and stronger in native builds
- Incident reporting with optional image evidence
- Nearby help centers from seeded operational data
- Alert history and delivery-state records
- Community discussion platform replacing the former fake call escape tool
- Profile, settings, permissions, and theme preference flow
- Production-focused Express API hardening
- SQLite schema indexes and safer media upload handling

## Production upgrade summary

This package was upgraded from a basic MVP into a stronger production foundation.

### Mobile app

- Rebuilt screens with a consistent premium design system: refined typography, spacing, cards, status chips, banners, shadows, and accessibility states.
- Removed demo credentials and placeholder onboarding from the login experience.
- Added calm, trust-building permission explanations before location-sensitive flows.
- Improved SOS reliability with pre-checks, long-press intent, location fallback, clear loading state, and success/error feedback.
- Improved live sharing with status indicators, explicit start/stop confirmations, copy/open link actions, cached state, and privacy copy.
- Improved trusted contacts with validation, primary-contact handling, empty states, refresh states, and safer delete confirmations.
- Improved incident reporting with draft recovery, field validation, optional location context, image attach/remove feedback, and upload error handling.
- Improved help centers with filter chips, cached fallback, graceful location failures, and direct call/map actions.
- Replaced the fake call flow with an anonymous community discussion platform, moderation reporting, live-style refresh, likes, comments, and share actions.
- Improved profile/settings with account identity, theme syncing, privacy explanations, and recent alert records.
- Added API retry handling for safe idempotent requests and clearer offline/network messages.

### Backend API

- Hardened CORS so unapproved browser origins are not silently accepted.
- Added request IDs, Helmet security headers, global rate limiting, safer JSON limits, and safer static upload serving.
- Enforced strong JWT secret requirements in production.
- Centralized environment parsing and production configuration.
- Added SQLite PRAGMAs for foreign keys, WAL mode, busy timeout, and better local durability.
- Added database indexes for auth, contacts, location logs, shares, incidents, notifications, and delivery records.
- Improved validation and sanitization for contacts, incidents, location coordinates, profile data, and uploaded evidence.
- Reworked SOS notification records so the app no longer imports or calls remote push APIs that crash Expo Go on Android.
- Replaced fake delivery claims with explicit `provider_pending` delivery states for contacts that need SMS, email, WhatsApp, voice, or native push providers in a public launch.

## Important notification decision

The app intentionally does **not** import `expo-notifications`. Expo Go on Android can crash when remote push notification APIs are loaded in newer Expo SDKs. SafeHer now remains Expo Go-runnable while preserving the alert data model:

- SOS creates backend notification records.
- Linked SafeHer users receive in-app alert records.
- Phone/email-only trusted contacts are marked as `provider_pending` until a real provider is connected.
- Public launch delivery can be connected through native push, SMS, email, WhatsApp, or voice providers without changing the SOS flow.

## Repository structure

```text
backend/
  src/
    app.js
    server.js
    config/
    controllers/
    db/
    middleware/
    routes/
    scripts/
    utils/
frontend/
  src/
    api/
    components/
    constants/
    context/
    hooks/
    navigation/
    screens/
    services/
    utils/
PROJECT_STRUCTURE.txt
PRODUCTION_AUDIT.md
README.md
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Expo CLI through `npx expo`
- Android emulator, iOS simulator, or a physical device with Expo Go

## Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend will initialize SQLite, apply `src/db/schema.sql`, and seed help-center data if the table is empty.

### Backend environment

Edit `backend/.env` before running outside local development.

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=change_this_to_a_long_random_secret_minimum_32_chars
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
DB_PATH=./src/db/safeher.sqlite
UPLOAD_DIR=./uploads
UPLOAD_FILE_SIZE_MB=5
JSON_BODY_LIMIT=1mb
APP_BASE_URL=http://localhost:5000
CLIENT_APP_URL=http://localhost:8081
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
GLOBAL_RATE_LIMIT_PER_MINUTE=180
SOS_SMS_PROVIDER=none
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SOS_SMS_WEBHOOK_URL=
SOS_SMS_WEBHOOK_SECRET=
SOS_VOICE_WEBHOOK_URL=
SOS_VOICE_WEBHOOK_SECRET=
```

The seed script only inserts help-center records. It does not create demo user accounts.

### Backend scripts

```bash
npm run dev
npm run start
npm run seed
```

## Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npx expo start -c
```

### Frontend API URL

Set `EXPO_PUBLIC_API_URL` in `frontend/.env`.

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:5000/api
```

Use the correct host for your device:

- Android emulator: `http://10.0.2.2:5000/api`
- iOS simulator: `http://localhost:5000/api`
- Physical device: `http://YOUR_COMPUTER_LAN_IP:5000/api`

## Feature behavior

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/settings`

JWT is stored through SecureStore with an AsyncStorage fallback for non-sensitive app state compatibility.

### SOS

1. User long-presses the SOS button or shakes the phone 5 times.
2. App shows a 3-second cancel countdown for false-trigger prevention.
3. App checks that at least one trusted contact exists.
4. App requests location only when needed.
5. App sends `POST /api/location/sos`.
6. Backend validates coordinates, starts or updates a live share, logs the location, saves the SOS event, and records in-app/provider delivery states.
7. If a production SMS/voice provider is configured, the backend attempts automatic delivery. Otherwise the device opens the SMS composer and primary-contact call intent unless Silent SOS is on.
8. Foreground live tracking starts immediately; background tracking starts when background location permission is already granted.

### Live location sharing

- Start: `POST /api/location/share/start`
- Update: `POST /api/location/share/update`
- Stop: `POST /api/location/share/stop`
- Current active share: `GET /api/location/share/active`
- Public tracking page data: `GET /api/public/share/:token`

Public share links are token-based and return live location only while the share is active.

### Trusted contacts

- List: `GET /api/contacts`
- Create: `POST /api/contacts`
- Update: `PUT /api/contacts/:id`
- Delete: `DELETE /api/contacts/:id`

Primary-contact updates are handled transactionally so only one contact is primary for a user.

### Incidents

- List: `GET /api/incidents`
- Create with optional image evidence: `POST /api/incidents`

Uploaded media is restricted to supported image MIME types and capped by `UPLOAD_FILE_SIZE_MB`.

### Help centers

```text
GET /api/help-centers?type=all|police|hospital&latitude=...&longitude=...
```

The app works even when location is unavailable by showing seeded help centers without distance sorting.

### Community discussion

- List posts: `GET /api/community/posts`
- Create anonymous safety post: `POST /api/community/posts`
- Like/comment/share/report posts through `/api/community/posts/:id/*`
- The frontend refreshes the feed and open reply thread periodically to create a live-chat-like experience without WebSocket infrastructure.

### Alerts

- List alert records: `GET /api/notifications`
- Store native token for future native builds: `POST /api/notifications/device`
- Create a test alert record: `POST /api/notifications/test`

The current Expo Go-runnable app does not load remote push APIs.

## SQLite tables

- `users`
- `trusted_contacts`
- `location_logs`
- `location_shares`
- `sos_events`
- `incidents`
- `help_centers`
- `device_tokens`
- `notifications`
- `notification_deliveries`
- `evidence_items`
- `community_posts`
- `community_comments`
- `community_likes`
- `community_post_reports`

## Production launch checklist

Before a public Play Store or App Store launch, complete these operational items:

1. Replace SQLite with managed Postgres or another production database if you expect multi-device scale.
2. Add proper database migrations and backup policies.
3. Configure real SMS/email/voice/native push delivery providers.
4. Configure production domains, HTTPS, CORS origins, and secure secrets.
5. Move media uploads to object storage with malware scanning and signed URLs.
6. Add observability: crash reporting, API logging, metrics, and alerting.
7. Add automated tests for SOS, auth, uploads, contacts, and live sharing.
8. Perform device QA on low-end Android devices, iOS devices, poor networks, and background-location scenarios.
9. Prepare privacy policy, terms, emergency disclaimer, data retention rules, and account deletion flow according to launch-region requirements.

## Local validation checklist

1. Register a new account.
2. Add at least one trusted contact.
3. Trigger SOS from the home screen.
4. Start live sharing and copy/open the public link.
5. Stop live sharing and confirm the public link no longer exposes live coordinates.
6. Submit an incident with and without image evidence.
7. Open help centers and test call/map actions.
8. Open Community, publish an anonymous discussion, comment, like, share, report a harmful post, and confirm live refresh works.
9. Change light/dark/system theme and verify persistence.
10. Review profile alert records after SOS.

## Notes

This is a production-oriented codebase upgrade, not a finished regulated emergency dispatch system. Public launch still requires provider contracts, legal review, privacy policy, production hosting, monitoring, and real-world incident response operations.
