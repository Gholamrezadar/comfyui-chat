# LLM Chat Interface

A modern, slick chat UI for SvelteKit + shadcn-svelte + Tailwind (maia theme).

## File Structure

```
src/
├── lib/
│   ├── services/
│   │   └── chat.service.ts        # Pure logic, localStorage, no UI imports
│   ├── stores/
│   │   ├── chat.store.svelte.ts   # Svelte 5 rune store, calls service
│   │   └── theme.store.svelte.ts  # Dark/light mode, no third-party
│   └── components/
│       ├── Sidebar.svelte         # Collapsible sidebar with search + profile
│       ├── ChatView.svelte        # Welcome state vs active chat layout
│       ├── MessageList.svelte     # Scrollable message feed
│       └── ChatInput.svelte       # Textarea + image + send
├── routes/
│   └── +page.svelte              # Root page, bootstraps stores
└── app.additions.css             # Sidebar CSS variable additions
```

## Setup

### 1. Required shadcn-svelte components

Install these if you haven't already:

```bash
npx shadcn-svelte@latest add button
npx shadcn-svelte@latest add input
npx shadcn-svelte@latest add textarea
npx shadcn-svelte@latest add scroll-area
npx shadcn-svelte@latest add tooltip
```

### 2. Required lucide-svelte icons

```bash
npm install lucide-svelte
```

### 3. Tailwind config

Replace your `tailwind.config.ts` with the provided one, or merge the
`darkMode: 'class'` and `sidebar` color extension into your existing config.

### 4. CSS additions

Append the contents of `src/app.additions.css` into your existing `src/app.css`.
The key additions are:
- `--sidebar-background` CSS variable for both light and dark
- `html, body { height: 100%; overflow: hidden; }` for the full-height layout

## Architecture Notes

- **Services** (`chat.service.ts`): pure functions, no imports from `$lib/stores`
  or any UI. They receive/return plain data and accept callbacks.
- **Stores** (`*.store.svelte.ts`): Svelte 5 `$state` / `$derived` runes.
  They call service functions and update state in callbacks.
- **Components**: read from stores, call store actions. Never call services directly.
- **localStorage**: fully handled in the service layer. Stores call save after
  every mutation; they load on `init()` which is called from `onMount` in the page.

## Features

- Collapsible sidebar (icon-only when collapsed)
- Dark / light mode toggle (class strategy, no third-party)
- New chat button, search, settings placeholder
- Recent conversations list with delete-on-hover
- Auto-titled conversations from the first message
- Welcome screen with suggestion chips when no chat is selected
- User message bubble (right-aligned, primary color)
- Assistant plain text (left-aligned with bot avatar)
- Typing indicator (bouncing dots)
- Auto-resizing textarea (max 200px)
- Enter to send, Shift+Enter for newline
- All conversations persisted to localStorage
