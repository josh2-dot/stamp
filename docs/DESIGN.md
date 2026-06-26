# STAMP design system

Short rules for keeping the product visually consistent. If you reach for a primitive that isn't here, surface it before scattering a one-off.

---

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `stamp-black` | `#0A0A14` | Page background |
| `stamp-surface` | `#14141F` | Card / panel background |
| `stamp-surface2` | `#1C1C2E` | Elevated surfaces, inputs |
| `stamp-border` | `#252538` | Borders, dividers |
| `stamp-white` | `#F7F6F2` | Headlines, body text |
| `stamp-muted` | `#6B6B8A` | **12px eyebrows and decorative meta only.** Fails AA at body sizes. |
| `stamp-muted-2` | `#9696B5` | **14px+ secondary body text.** Use this for hints, captions, dashboard labels. |
| `stamp-orange` | `#FF5C1A` | Brand primary. CTAs and selection state only. |
| `stamp-gold` | `#F5C842` | "Attention needed" semantic — low stock, OTP pending, setup incomplete. **Not decorative.** |
| `stamp-green` | `#2DBD6E` | Gate decisions (ADMIT, Checked in). **Not "active".** |
| `stamp-red` | `#E84040` | Errors, destructive actions. |

### Rules

- **Body text is `stamp-white` full, or `stamp-muted-2`.** Don't use `text-stamp-white/80` or `/90` — pick one of the two semantic levels.
- **Green is reserved for gate verification.** "Live realtime" status uses a `tone="default"` Badge with a pulsing dot, not green.
- **Gold means warning, not garnish.** If you're using gold to differentiate a chart bar or decorate a section, you're misusing it.

---

## Typography

### Display scale (Syne ExtraBold)

Use these for every headline. Pair with `font-display`.

| Class | Size | Used for |
|---|---|---|
| `text-display-xl` | 72px | Hero only |
| `text-display-lg` | 56px | Page H1 |
| `text-display-md` | 40px | Section H2; **primary action moments** (checkout headline, withdrawal success) |
| `text-display-sm` | 28px | Card H3 |
| `text-display-xs` | 20px | Tile H4, kicker |

Responsive scaling via Tailwind prefixes: `<h1 class="font-display text-display-md sm:text-display-lg">`.

### Eyebrow

The uppercase, letterspaced label pattern. **Always use `<Eyebrow>`, never freelance the classes.**

```tsx
<Eyebrow>How it works</Eyebrow>
<Eyebrow align="center">Pricing</Eyebrow>
<Eyebrow accent>Live</Eyebrow>
```

Standard tracking is `0.2em`. Three other values (`0.18`, `0.25`, `0.3`) existed historically — Pass B sweeps them out.

### Body

Default reading text is `text-base` on stamp-white. Use `text-sm` only for microcopy, captions, table cells. Don't use `text-sm` for explanatory paragraphs.

---

## Surfaces and radii

| Radius | Use |
|---|---|
| `rounded-md` (8px) | Controls — buttons, inputs, badges, info messages |
| `rounded-lg` (12px) | Surfaces — cards, panels, dropdowns |
| `rounded-xl` (16px) | Featured surfaces — hero media, posters, single dominant blocks |
| `rounded-full` | Pills, status dots |

If you find yourself wanting a fifth radius, you're freelancing.

---

## Primitives — pick from this list

### `<Card>`

```tsx
<Card>...</Card>
<Card tone="warning">...</Card>      // gold border — needs attention
<Card accent>...</Card>              // orange "stamp impression" line at top
<Card elevated>...</Card>            // surface2 background
<Card interactive>...</Card>         // hover border
```

Rule: **`accent` Card ≤ 1 per viewport.** It's a focal signal, not a default decoration.

### `<SelectableCard>`

```tsx
<SelectableCard selected={tierId === tier.id} soldOut={tier.sold >= tier.capacity}>
  ...
</SelectableCard>
```

Use for any "pick one" tile pattern. **Don't reinvent buttons that look like cards.**

### `<Button>`

```tsx
<Button>Default primary</Button>
<Button glow>The page's headline action</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="danger">Deactivate</Button>
<Button loading>Saving…</Button>
```

**Rule: `glow` only on the single highest-intent CTA per screen.** When every primary button glows, none of them do. If you've added glow to a second button on the same page, you've made the first one quieter.

### `<Eyebrow>`

See typography.

### `<PageShell>`

Standard logged-in / marketing page rhythm.

```tsx
<PageShell maxWidth="lg">
  <h1>...</h1>
</PageShell>
```

`maxWidth` options: `sm` (login), `md` (success / single-col), `lg` (forms, dashboards), `xl` (hero, dashboard).

---

## Glow, accent, and signal hierarchy

Three signals tell the user "this matters":

1. **`<Button glow>`** — the page's one headline action
2. **`<Card accent>`** — the page's one "look here" surface
3. **`<Eyebrow accent>`** — orange-colored eyebrow for celebration moments

Rule: only one signal per screen carries the brand color at full intensity. The brand mark (stamp seal) is the fourth signal and is reserved for **verification moments only** — the ADMIT/DENY scanner overlay, the buy-success page, the deposit-confirmed payout state.

---

## The seal

The stamp seal is the brand's signature. It is used as a **stamp** — an applied, deliberate act — not as wallpaper.

- ✅ TopNav (logomark, small)
- ✅ Footer (sign-off, small)
- ✅ ADMIT/DENY scanner result (full-intensity, the product moment)
- ✅ Buy-success page (full-intensity, the buyer moment)
- ❌ Hero background (it's not a texture)
- ❌ Login centerpiece (the seal is for verification, not greeting)
- ❌ Empty-state decoration (use type, not the seal)
