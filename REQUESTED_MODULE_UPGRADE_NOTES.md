# SafeHer Selected Module Upgrade Notes

This package updates only the requested modules from the existing SafeHer app. The project was not rebuilt from scratch.

## Updated modules

### 1. SOS emergency system
- Existing SOS button remains in place.
- SOS now uses 5-shake detection with cooldown and a 3-second cancel countdown.
- SOS stores/starts the existing backend live-share flow.
- SOS caches the active share so background location tasks can continue updating the private link when permission is granted.
- Device SMS and call flows remain available through Expo/React Native intents.
- Optional production backend SMS/voice provider hooks were added:
  - `SOS_SMS_PROVIDER=twilio`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
  - `SOS_SMS_WEBHOOK_URL`
  - `SOS_VOICE_WEBHOOK_URL`
- Silent SOS mode avoids opening SMS/call screens and relies on backend/in-app/provider delivery records.

### 2. Community discussion platform
- Fake call is replaced by the Community module.
- Anonymous safety posts, nearby group filters, help requests, suspicious-area discussions, safety tips, comments, likes, shares, and moderation reporting are supported.
- Community feed has live refresh behavior while the screen is open.
- Backend now has a `community_post_reports` table and `/community/posts/:id/report` endpoint.

### 3. Smart safety map and route system
- Incident reports with GPS appear as map markers and heat zones.
- Report screen copy clearly explains that GPS-enabled reports become map markers.
- Regular feed-style report details were removed from the main map experience; details now open through map clusters and nearby cards.
- Category/time filters remain available.
- Safe, Balanced, and Fast route choices are displayed with safety scores.

### 4. Intelligent AI safety prediction
- Added ML-ready rule-based safety scoring architecture.
- Scoring considers report density, category severity, incident freshness, time of day, clusters, and heat zones.
- The architecture is isolated so a future trained ML model can replace the scoring logic without changing the map UI contract.

## Important production notes

- Expo `expo-sms` cannot silently send SMS without user interaction. True silent/automatic SMS needs a backend provider such as Twilio or a telecom gateway. The backend is now provider-ready.
- True automatic phone calls also require a voice provider or native Android-specific implementation. The backend now supports a voice webhook, and the app still opens the primary contact call intent when no backend voice provider is configured.
- Background location requires user permission and may require a development/production build depending on platform behavior.
