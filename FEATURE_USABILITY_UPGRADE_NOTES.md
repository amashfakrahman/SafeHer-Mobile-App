# SafeHer feature usability upgrade

## 1. Evidence Vault upload flow fixed

Before this update, selecting a gallery photo/video immediately attempted to save and upload it. That made the flow confusing because users did not see a separate upload button after selecting media.

### Updated behavior

- User enters an evidence title and optional private note.
- User taps **Choose photo**, **Choose video**, or **Record audio**.
- The selected/recorded evidence appears in a preview card.
- A clear **Upload photo / Upload video / Upload audio** button appears.
- User can also clear the selected file before upload.
- After upload, the evidence is saved locally and backed up to the backend.

### Files changed

- `frontend/src/screens/main/EvidenceVaultScreen.js`
- `backend/src/middleware/evidenceUpload.js`

### Backend media support improved

More real phone media MIME types are now accepted:

- `image/heic`
- `image/heif`
- `video/x-m4v`
- `video/webm`
- `audio/x-m4a`
- `audio/3gpp`
- `audio/3gpp2`
- `audio/webm`

## 2. AI Safety Route Prediction usability enhanced

The existing app had AI route prediction inside the Incident Reports screen, but it was difficult to understand and not very actionable.

### Updated behavior

- Screen title changed to **Safety Route Prediction**.
- Added clearer explanation of how the prediction works.
- Added destination goal selector:
  - Nearest help
  - Main road
  - Trusted place
- Added safer map indicators:
  - red danger heat zones
  - green safe/help halos
  - start marker
  - destination marker
- Added route option comparison:
  - Safe Route
  - Balanced Route
  - Fast Route
- Added **BEST** label for the recommended route.
- Added safety score bar.
- Added action checklist before travel.
- Added buttons:
  - Auto-pick safest
  - Start safe mode
  - Live location
  - Refresh
- Added safe mode status banner.

### Files changed

- `frontend/src/screens/main/IncidentsScreen.js`
- `frontend/src/components/IncidentMapCanvas.js`

## Important note

This update improves the existing AI route prediction usability using the app's current incident dataset and map canvas. It is still not a full Google turn-by-turn navigation system. For production-level road navigation, connect Google Routes API / Directions API and score real road alternatives from the backend.
