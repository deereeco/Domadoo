# Domadoo — Vocabulary & Nomenclature

A reference for terms used when discussing features, bugs, and design of the app.

---

## High-level structure

```
┌──────────────────────────────────────────────────────────────────┐
│  BOARD                                                           │
│  (the full canvas — everything you see after signing in)         │
│                                                                  │
│  ┌─────────────────────┐   ┌─────────────────────┐              │
│  │  ROOT CARD          │   │  ROOT CARD          │   ...        │
│  │  ─────────────────  │   │  ─────────────────  │              │
│  │  • Task             │   │  • Task             │              │
│  │  • Task             │   │    ↳ Sub-task       │              │
│  │    ↳ Sub-task       │   │    ↳ Sub-task       │              │
│  │      ↳ Sub-sub-task │   │  • Task             │              │
│  │  • Task             │   └─────────────────────┘              │
│  └─────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Terms

### Board
The main canvas that contains all root cards. Rendered by `Board.jsx`.

### Root Card
A top-level group/column. Has a **header** (the title bar, used as the drag handle) and a **card body** (the area containing tasks). Internally it is a node with `parentId: null`. Rendered by `RootCard.jsx`.

```
┌─────────────────────────────┐
│  Header / title  [≡] [×]    │  ← drag handle to reorder cards
│─────────────────────────────│
│  • Task A                   │  ← card body
│  • Task B                   │
│  • Task C                   │
│                             │
│  + Add item                 │
└─────────────────────────────┘
```

### Task
An item inside a card body. Can have children (sub-tasks). Two types:
- **Checkbox task** — has a checkbox, can be marked complete
- **Bullet task** — plain bullet point, no completion state

Rendered by `NodeItem.jsx`. Internally a node with `parentId: <cardId>`.

### Sub-task
A task nested inside another task. Visually indented. Can itself have children (unlimited depth). Internally a node with `parentId: <taskId>`.

### Node
The generic internal term for **any** of the above (root card, task, sub-task). They all share the same data shape defined in `types/index.js`. The distinction is purely positional:

| What you see | Internal name | `parentId` value |
|---|---|---|
| Root card | node | `null` |
| Task | node | `<root card id>` |
| Sub-task | node | `<task id>` |

---

## Drag & Drop

### Drag mode
A toggle in the header. When **on**, a single tap/click initiates a drag. When **off**, dragging requires a double-tap (mobile) or click-and-drag with an 8px movement threshold (desktop).

### Drag handle
The six-dot grip icon (⠿) shown on each task and card header. In drag mode it is always visible; otherwise it appears on hover.

### Drop zones (per task item)
Each task is divided into three vertical zones that determine what happens on drop:

```
┌──────────────────────────────┐
│  TOP ZONE  (top ⅓)           │  → insert dragged task ABOVE this task
├──────────────────────────────┤
│  MIDDLE ZONE (middle ⅓)      │  → nest dragged task INSIDE this task
│                              │    (indigo ring appears after 400ms hover)
├──────────────────────────────┤
│  BOTTOM ZONE (bottom ⅓)      │  → insert dragged task BELOW this task
└──────────────────────────────┘
```

**Key behaviour:** items only shift (reorder preview) when the pointer is in the top or bottom zone. Hovering in the middle zone keeps all items still — no jumping.

### Nest ring
The indigo highlight ring that appears on a task after you hover over its **middle zone** for ~400ms. Dropping while the ring is visible nests the dragged task as a child of the highlighted task.

### Card body drop zone
The empty area below the last task inside a card. Dropping a task here appends it as the last task in that card.

### Board drop zone
A dashed zone that appears at the bottom of the board while dragging a task. Dropping here extracts the task out of any card and creates it as a new standalone root card.

---

## Today's Tasks card
A special root card (amber/gold border) that holds linked copies of tasks from other cards. Adding a task to Today's Tasks creates a live link — completing it in either location marks it done everywhere. Identified internally by `isTodaysTask: true` on the node.
