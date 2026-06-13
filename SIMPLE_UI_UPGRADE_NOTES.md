# Simple UI Upgrade Notes

This version changes the SafeHer frontend visual system toward a cleaner, simpler mobile UI.

## Updated areas

- `frontend/src/constants/theme.js`
  - Replaced the heavy red/pink background system with a neutral light/dark palette.
  - Reduced large shadows and rounded corners.
  - Kept the emergency red/pink brand color, but used it more sparingly.

- Shared layout and UI components
  - `ScreenWrapper.js`: removed decorative background blobs by default.
  - `Card.js`: simplified card radius, padding, borders, and press states.
  - `PrimaryButton.js`: cleaner rectangular rounded buttons with less shadow.
  - `AppHeader.js`: simpler title/subtitle header treatment.
  - `BrandMark.js`: simplified logo badge.
  - `FormInput.js`: flatter input design.
  - `EmptyState.js`: cleaner empty-state card.
  - `LoadingScreen.js`: neutral loading screen instead of full red screen.
  - `ActionCard.js`, `StatCard.js`, `SectionHeader.js`, `StatusPill.js`: simplified typography and spacing.
  - `SOSButton.js`: changed the large glowing circular SOS button into a simple full-width emergency card button.
  - `MainTabs.js`: simplified bottom tab bar with less height, no glow, and clearer labels.

## Design direction

- Simple neutral background
- White cards
- Less animation and glow
- Smaller border radius
- Lighter font weights
- Cleaner tab navigation
- SOS still visually prominent, but less decorative

## Validation

All frontend JavaScript files were checked with `node --check` after the UI changes.
