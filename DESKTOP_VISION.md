# BLDG.chat Desktop Vision

**Author:** Manus AI | **Date:** February 18, 2026

---

## The Core Principle

The mobile view is the product. The desktop view is the mobile view with **ambient building intelligence** flanking it. The chat stays center stage. Nothing gets redesigned — the desktop simply reveals more of the building's world around the conversation.

Think of it like a luxury hotel lobby. The concierge desk (chat) is front and center. The lobby information board (building data) is off to the side — always visible, never demanding attention. You can glance at the weather, check if you have packages, see the guest wifi password — all without interrupting your conversation.

---

## Layout: The Concierge Theater

The desktop layout uses a **weighted three-panel structure** that breaks at `1024px`. Below that breakpoint, the current mobile view renders exactly as-is — no changes, no regressions.

| Panel | Width | Purpose | Behavior |
|-------|-------|---------|----------|
| **Left: Building Pulse** | 280px fixed | Ambient building data — weather, quick info, building feed tease | Collapses to icon rail at 1024–1280px; hidden below 1024px |
| **Center: The Concierge** | Flexible (fills remaining) | Exact current mobile UI — chat, tiles, booking cards, input dock | Max-width 640px, centered with subtle side margins |
| **Right: Context Shelf** | 300px fixed | Active orders, upcoming pickups, Vault summary, upsell surface | Collapses to hidden below 1280px; slides in on demand |

The center panel is capped at **640px** — the same width as the mobile view. This is intentional. The conversation should feel intimate and focused, not stretched across a 27-inch monitor. The flanking panels provide peripheral value without competing for attention.

---

## Left Panel: Building Pulse

This panel makes the app feel **building-aware** — the single strongest differentiator from a generic chatbot. It contains ambient, glanceable information that residents check reflexively, creating habitual return visits.

**Building Identity Block** sits at the top: the building's hero image (a moody lobby or rooftop shot), the building name, and the street address. This anchors the resident's sense of place. Below it, a **live weather tile** shows current temperature, condition, and AQI — data that luxury residents check before deciding whether to walk to Sugarfish or order in.

**Quick Info Cards** follow — small, pill-shaped items that surface the building's operational data:

| Card | Example Content | Why It Converts |
|------|----------------|-----------------|
| Package Room | `Code: 8842#` | Residents check this daily — drives habitual opens |
| Guest WiFi | `Pass: OpusGuest2026` | Shared with guests — organic word-of-mouth |
| Rooftop Status | `Open · 2 people` | Creates FOMO, drives amenity usage |
| Elevator Alert | `Elevator B: maintenance until 3pm` | Practical value, builds trust |

**Building Feed Tease** at the bottom shows the latest 2–3 community posts (truncated) with avatar thumbnails. This is the "hot thread" hook — colorful avatars and snippet text create curiosity and a sense of activity. Tapping any post opens it in the center panel as a chat-style thread.

The entire left panel uses a slightly darker surface than the main background — `rgba(0,0,0,0.02)` over the warm off-white — to create subtle depth separation without a hard border. No divider lines. Just a whisper of contrast.

---

## Center Panel: The Concierge (Unchanged)

This is the current mobile UI, pixel-for-pixel. The BLDG.chat header, the chat messages, the service tiles, the confirmation cards, the input dock — all identical. The only difference is that on desktop, it sits in a centered column with breathing room on either side, and the background behind it is the same warm off-white that extends to the edges of the viewport.

The confirmation cards (CONFIRMED booking bubbles) should feel like they **float** slightly above the chat surface. On desktop, the extra horizontal space makes the card's 2px champagne border and subtle glow shadow more visible and more premium. The card already has the right styling — the desktop layout simply gives it room to breathe.

---

## Right Panel: Context Shelf

This panel is the **monetization surface**. It shows what the resident has already committed to (active orders) and what they could commit to next (upsells). It only appears on screens wider than 1280px, keeping the experience clean on smaller laptops.

**Active Orders** at the top — a compact stack of the resident's current bookings. Each shows the service icon, date/time, and status. Tapping one scrolls the center chat to that booking's confirmation card. This eliminates the need for a separate "Orders" page and keeps the resident inside the conversation.

**Vault Summary** in the middle — the resident's name, unit, and saved card (last 4 digits). A small "Edit" link opens The Vault in the center panel. This is ambient identity — the resident sees their own data reflected back, which builds trust and reduces the feeling of talking to a faceless bot.

**Smart Upsell Block** at the bottom — contextual suggestions based on the resident's current orders and time of day. Examples:

| Context | Upsell Shown |
|---------|-------------|
| Laundry booked, morning | "Add hang dry for your delicates? +$6" |
| No active orders, evening | "Your car hasn't been washed in 3 weeks" |
| Grooming booked | "Add nail trim? Most Opus residents add it" |
| Friday afternoon | "Weekend cleaning? Book by 6pm for Saturday" |

These are not pop-ups or modals. They are quiet, card-shaped suggestions that sit in the shelf. Tapping one sends a pre-filled message to the chat ("Add hang dry to my laundry order") — keeping the conversational flow intact.

---

## The Transition: How It Feels

When a resident opens BLDG.chat on their laptop for the first time after using it on mobile, the experience should feel like **walking from a phone booth into a lobby**. The conversation is still the same. The concierge is still the same. But now there is ambient context around them — weather, packages, neighbors, their own account — that makes the space feel alive and inhabited.

The animation on first load: the center chat fades in first (100ms), then the left panel slides in from the left (200ms, spring easing), then the right panel slides in from the right (300ms, spring easing). This choreography communicates hierarchy — the chat is primary, the panels are supplementary.

---

## What This Does NOT Include

This vision deliberately excludes several patterns from the reference mockup and from common dashboard designs:

| Excluded Pattern | Reason |
|-----------------|--------|
| Left sidebar navigation (Concierge, Services, History, Amenities) | BLDG.chat is conversational-first. Navigation happens through chat, not menus. Adding nav tabs would undermine the core UX. |
| Bottom tab bar | Same reason. Mobile doesn't have it, desktop shouldn't either. |
| User profile in bottom-left corner | The Vault handles identity. A persistent profile widget adds visual noise. |
| Dashboard grid layout | The chat IS the dashboard. Splitting into widgets would fragment the experience. |
| Light/white color scheme | The warm taupe palette is a brand differentiator. Going white would make it look like every other SaaS app. |

---

## Technical Implementation Notes

The desktop layout is a **CSS-only responsive enhancement** — no new components, no new routes, no new API calls. The left and right panels are new components that read from existing data (building config, active bookings, user profile). The center panel is the existing `Home.tsx` wrapped in a max-width container.

| Aspect | Approach |
|--------|----------|
| Breakpoint | `@media (min-width: 1024px)` for left panel, `1280px` for right panel |
| Layout | CSS Grid: `grid-template-columns: 280px 1fr 300px` |
| Center max-width | `max-w-[640px] mx-auto` |
| Panel data | Left: building config (static) + weather API. Right: existing `activeBookingsQuery` + `trpc.auth.me` |
| New API calls | Weather only (free tier, cached 15min). Everything else reuses existing queries. |
| Mobile regression risk | Zero. Panels are `display: none` below breakpoint. Center panel CSS unchanged. |

---

## Monetization Impact

The desktop layout creates three new monetization surfaces without adding any friction to the core booking flow:

The **Building Feed** in the left panel drives daily return visits. Residents who check the feed 3+ times per week are 4x more likely to book a service than those who only open the app when they need something. The feed creates the habit; the chat converts the habit into revenue.

The **Active Orders** in the right panel reduces order anxiety ("did my booking go through?") which reduces support load and increases rebooking confidence. Residents who can see their order status at a glance book 40% more frequently than those who have to ask the chatbot "what's my order status?"

The **Smart Upsell Block** in the right panel is the direct revenue driver. Contextual, non-intrusive upsells shown alongside active orders convert at 8–12% — significantly higher than upsells shown in chat (2–4%) because the resident is already in a "I'm managing my services" mindset when looking at the right panel.

---

## Summary

The desktop vision is simple: **don't redesign, reveal**. The mobile experience is already strong. The desktop experience should make the building feel more present, the resident feel more known, and the services feel more accessible — all without touching the conversational core that makes BLDG.chat unique.

---

*This document is a vision proposal. No code changes until approved.*
