# Domadoo

### 🔗 [https://deereeco.github.io/Domadoo/](https://deereeco.github.io/Domadoo/)

A highly interactive, modern task-tracking board. Visually inspired by Google Keep — but with infinite nesting, seamless drag & drop at any level, label-based filtering, and a daily focus system.

---

## Features

- **Infinite nesting** — tasks can be nested to any depth
- **Keyboard-first editing** — `Enter` creates a sibling, `Tab` indents, `Shift+Tab` outdents, `Backspace` deletes empty nodes
- **CHECKBOX / BULLET toggle** — switch any node between an actionable task and a reference note
- **Labels** — create color-coded labels, assign them to any node, manage them globally via the Labels button in the header
- **Filter bar** — filter by label: grey out non-matching nodes (show mode) or hide them entirely (hide mode). Tree-aware — parents are kept visible when children match
- **Collapsed summary dots** — when a node is collapsed, small color dots show the labels hiding inside
- **Today's Tasks** — a special card for daily focus. Drag any task into it to create a live-linked copy — completing it in either place marks both done. Linked tasks are automatically tagged with a "Today" label
- **Done Today view** — see everything you've completed today, with one-click undo
- **Details Modal** — zoom into any task for focused reading and editing, with a breadcrumb trail showing its full ancestry
- **Light / dark mode** — toggle in the top-right corner, persisted across sessions
- **Google Drive sync** — data is stored in your own Google Drive App Data folder, with sign-in persisted across page reloads. Nothing is shared externally
- **Local-first** — reads from localStorage instantly on load, syncs to Drive in the background. Sync status ("Saving…" / "Sync error") is shown in the header

---

## Moving Things Around

### Drag modes

There are two drag activation modes, toggled by the **Drag** button in the header:

| Mode | How to start a drag |
|---|---|
| **Drag mode off** (default, touch-friendly) | Double-tap an item, then hold and drag on the second tap |
| **Drag mode on** | Click and drag immediately (standard desktop behaviour) |

Use **Drag mode on** on desktop when you want fast rearranging. Leave it off on mobile so normal taps don't accidentally start a drag.

### What you can drag

**Cards** (the top-level containers):
- Drag a card's header to reorder it on the board
- Drop a card onto another card's body to merge it in as a nested task

**Tasks** (items inside cards):
- Drag a task onto another task within the same card to reorder it
- Drag a task to a different card to reparent it there
- Drag a task into the **Today's Tasks** card body to create a live-linked copy
- Hover a dragged task over another task for ~400 ms — it highlights as a nest target; release to make it a child of that task (**hover-to-nest**)
- Drop a dragged task on the **"Drop here to create a new card"** zone that appears at the bottom of the board to extract it as a brand-new standalone card

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (dark mode via `class`) |
| State | Zustand |
| Drag & Drop | dnd-kit |
| Auth | Google Identity Services (GIS) |
| Persistence | Google Drive App Data + localStorage |
| Hosting | GitHub Pages |

---

## Local Development

### Prerequisites
- Node 20+
- A Google Cloud project with the **Google Drive API** enabled and an **OAuth 2.0 Web Client ID**

### Setup

```bash
git clone https://github.com/deereeco/Domadoo.git
cd Domadoo
npm install
npm run setup
cp .env.example .env
# Add your client ID to .env
npm run dev
```

`npm run setup` installs the git pre-commit hook that automatically increments the patch version in `package.json` on every commit. Run it once after cloning on each machine.

`.env`:
```
VITE_GOOGLE_CLIENT_ID=your-oauth-client-id-here
```

Make sure `http://localhost:5173` is listed as an **Authorized JavaScript origin** in your Google Cloud OAuth credentials.

---

## Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
2. Enable the **Google Drive API**
3. Configure the **OAuth consent screen** and add the scope:
   `https://www.googleapis.com/auth/drive.appdata`
4. Create an **OAuth 2.0 Client ID** (Web application type) with these authorized origins:
   - `https://deereeco.github.io`
   - `http://localhost:5173` (for local dev)
5. Add the Client ID as a repository secret named `VITE_GOOGLE_CLIENT_ID`

---

## Deployment

Pushes to `main` automatically build and deploy to GitHub Pages via GitHub Actions.
