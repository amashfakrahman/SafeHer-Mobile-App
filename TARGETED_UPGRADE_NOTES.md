# SafeHer Targeted Production Upgrade

This package updates only the requested feature areas from the existing SafeHer project:

1. SOS emergency flow
2. Community Discussion Platform replacing the Fake Call feature
3. Smart Safety Map + Safe/Balanced/Fast route selection
4. Intelligent AI-ready safety prediction inside the map section

## SOS production notes

- Shake SOS is configured for 5 strong shakes inside a short detection window with cooldown protection.
- SOS keeps the existing button flow and adds a 3-second cancel countdown before dispatch.
- Server-side SMS can be automatic when a backend provider is configured through `SOS_SMS_PROVIDER=twilio` or `SOS_SMS_WEBHOOK_URL`.
- In Expo Go, device SMS uses the system SMS composer as a fallback. Fully silent SMS/calling requires a production SMS/voice provider or native Android build permissions.
- Background location is started only if background permission is already granted, avoiding intrusive prompts during emergency activation.

## Community notes

- Fake Call is replaced with anonymous community safety discussions.
- The feed supports anonymous posts, nearby groups, likes, comments, shares, reporting, moderation status, and live polling refresh.

## Map + AI notes

- Reports with GPS coordinates are displayed as map markers/clusters and heat zones.
- The map section includes Safe, Balanced, and Fast route options.
- The AI prediction engine is ML-ready rule-based scoring. It analyzes report density, severity, freshness, time of day, and unsafe clusters.
- A real trained ML model can be added later behind the same prediction engine interface.
