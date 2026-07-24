# FluidSense

A mobile-first, voice-enabled fluid intake and output tracking **prototype**. Built for patients, family carers, nurses, healthcare assistants and clinicians to record and review fluid balance quickly — by tapping, by voice, or by typing.

> **Prototype only — not for clinical use or medical decision-making.** All patients and data are fictional. No real patient-identifiable information should ever be entered.

## Core idea

FluidSense never blurs the line between what's actually known and what's guessed. Every entry is tagged as one of:

- **Measured** — an exact volume was measured (e.g. 500 mL urine in a bottle).
- **Container-estimated** — a fraction of a known container (e.g. half a 300 mL mug).
- **Approximate** — a rough amount (e.g. "about one cup", "small vomit").
- **Unmeasured** — an event happened but no volume is known (e.g. urine passed into the toilet).

These are visually distinct everywhere in the app, and the "recorded balance" is always shown alongside a transparent, rule-based **reliability indicator** (High / Moderate / Low) that explains *why* — because incomplete data should never be presented as a precise measurement of someone's true fluid status.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (custom navy/teal/purple/amber/grey design system)
- React Router
- Zustand, persisted to `localStorage` (structured so a real backend such as Supabase can be dropped in later without touching the UI layer)
- Browser Web Speech API for voice input, with a deterministic on-device parser and a full text-entry fallback — nothing is saved until the user confirms it, and no raw audio is ever stored

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://localhost:5173`). The app seeds itself with several days of fictional demo data across three demo patients on first load — no setup required.

```bash
npm run build   # type-check + production build
npm run preview # preview the production build
```

## Structure

```
src/
  types.ts            # data model (events, profiles, containers, reliability, ...)
  lib/                 # calculation engine, reliability rules, voice parser, demo data
  store/useStore.ts    # Zustand store — the only place that touches persistence
  hooks/               # useFluidData (windowed balance/reliability), speech recognition
  components/          # design system, navigation, Today-screen widgets
  pages/               # one file per route (Today, Add, Voice, History, Summary, ...)
```

## What this is not

This is a demonstration MVP. It does not connect to any real clinical system, does not perform authentication beyond a demo role selector, and must never be used to make real treatment or monitoring decisions.
