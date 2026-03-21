# Changelog

All notable changes to Domadoo will be documented in this file.

## [0.1.60] - 2026-03-21

### Changed
- **Multi-device sync: replaced last-write-wins with full merge strategy.** Previously, whichever device saved to Google Drive most recently would silently overwrite changes from other devices. Now both sides' changes are combined.

### Added
- Per-node `updatedAt` timestamp — stamped on every node at creation and on every content, status, type, or label change. Used by the merge to determine which version of a node is authoritative.
- Deletion tombstones (`deletedNodes`) — when a node is deleted, a tombstone records the deletion time. The merge uses this to distinguish "intentionally deleted on another device" from "node doesn't exist yet on this device", preventing deleted tasks from being resurrected.
- `mergeStates` utility — merge function that unions nodes (newest `updatedAt` wins, tombstones respected), unions `childrenIds`/`rootOrder` (preserves newer device's ordering, appends new items from older device), unions history snapshots by date, and unions labels.
- Visibility-based Drive refresh — when a tab regains focus (or is restored via browser back-button / BFCache), the app now re-fetches Drive and runs a merge if Drive has been updated by another device. Throttled to at most once per 60 seconds.
- `lastDriveSyncAt` — ephemeral session field tracking the `savedAt` of the last Drive state loaded or written, used to skip unnecessary Drive fetches when nothing has changed.
- Online reconnect retry — if a Drive save fails while offline, the app now automatically retries when the connection is restored (`window.online` event).

### Fixed
- Data loss when two devices had the app open simultaneously (stale tab scenario)
- Data loss when the same browser had two tabs open with the app
- Stale state being edited after browser back-button restores a cached page (BFCache)
- Drive saves silently failing offline with no retry on reconnect

## [0.1.0] - 2026-03-11

### Added
- Infinite nested task board with drag-and-drop reordering
- Google OAuth sign-in with data stored in user's own Google Drive
- Auto-sync to Google Drive with saving/error status indicator
- Labels: create, assign, and filter tasks by label
- Daily focus: "Today's Tasks" root card and "Done Today" view
- Dark mode support with theme toggle
- Task detail modal for editing description and managing sub-tasks
- App version displayed near the Domadoo title on all pages
