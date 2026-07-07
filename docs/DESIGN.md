# STAMP design system

Short rules for keeping the product visually consistent. If you reach for a primitive that isn't here, surface it before scattering a one-off.

The system is built around a single metaphor: **ink on paper.** STAMP is a stamp. Every design decision either honours that metaphor or works against it. When in doubt, ask: would this pattern feel right on a printed ticket stub?

---

## Color tokens

The palette is warm cream paper, warm ink, and a single vermillion accent. Token names are legacy — `stamp-black` means "page background" and `stamp-white` means "primary text" regardless of the actual hex. Do not touch className references without also touching the token values in `tailwind.config.ts`; they are wired for zero-friction cascade.

| Token | Hex | Meaning |
|---|---|---|
| `stamp-black`   | `#EDE4CE` | Page background (paper) |
| `stamp-surface` | `#E4DABE` | Card / panel background |
| `stamp-surface2`| `#DACFAF` | Elevated surfaces, inputs |
| `stamp-border`  | `#C9BC97` | Hairlines, dividers |
| `stamp-white`   | `#14100C` | Headlines, body — primary ink |
| `stamp-muted-2` | `#4A4432` | **14px+ secondary body text.** Passes AA at every size. Use this for hints, captions, dashboard labels. |
| `stamp-muted`   | `#7A7259` | **11–12px eyebrows and decorative meta only.** Borderline AA at body sizes — reserved for the tertiary tier. |
| `stamp-orange`  | `#C0331A` | STAMP vermillion. CTAs and selection state only. |
| `stamp-gold`    | `#A6741A` | "Attention needed" semantic — low stock, OTP pending, setup incomplete. **Not decorative.** |
| `stamp-green`   | `#2C5B3E` | Gate decisions (ADMIT, Checked in). **Not "active".** |
| `stamp-red`     | `#7A1F1C` | Errors, destructive actions. |

### Rules

- **Body text is `stamp-white` full, or `stamp-muted-2`.** Don't invent `text-stamp-white/80` or `/90` — pick one of the two semantic levels.
- **Green is reserved for gate verification.** "Live realtime" status uses a `tone="default"` Badge with a pulsing dot, not green.
- **Gold means warning, not garnish.** If you're using gold to differentiate a chart bar or decorate a section, you're misusing it.
- **Vermillion is the one focal pigment per screen.** It carries the primary CTA and at most one accent Card. Everything else settles into ink and cream.

---

## Typography

Two families, no exceptions:

- **Fraunces** (`font-display`) — variable editorial serif. Runs the display scale. The `opsz`, `SOFT`, and `WONK` axes are pre-tuned in `globals.css`. Use italic (`italic`) for the second half of a headline pair — it becomes the brand's characteristic call-and-response rhythm.
- **Inter Tight** (`font-sans`) — tighter variant of Inter for UI and body. All labels, form text, table cells, buttons.

### Display scale (Fraunces, weight 500)

Use these for every headline. Pair with `font-display`.

| Class | Size | Used for |
|---|---|---|
| `text-display-xl` | 76px | Hero only |
| `text-display-lg` | 60px | Page H1 |
| `text-display-md` | 42px | Section H2; primary action moments (checkout headline, withdrawal success) |
| `text-display-sm` | 30px | Card H3 |
| `text-display-xs` | 21px | Tile H4, kicker |

Responsive scaling via Tailwind prefixes: `<h1 class="font-display text-display-md sm:text-display-lg">`.

### The italic pair pattern

The signature headline shape is a two-part statement where the second half is italic and often muted or coloured. Feels editorial, not templated:

```tsx
<h1 className="font-display text-display-lg">
  Three steps.
  <br />
  <span className="italic text-stamp-muted-2">No middlemen.</span>
</h1>
```

Use sparingly — twice on the landing, once on H1s where a second-clause rhythm helps. Not every heading needs it.

### Eyebrow

The uppercase, letterspaced label pattern. **Always use `<Eyebrow>`, never freelance the classes.** The component now paints a filled 6px bracket square before the text (hollow for the muted tone). That mark is the eyebrow's identity — don't reintroduce a raw uppercase-tracking-xs paragraph anywhere.

```tsx
<Eyebrow>How it works</Eyebrow>
<Eyebrow align="center">Pricing</Eyebrow>
<Eyebrow tone="accent">Live</Eyebrow>
```

### Body

Default reading text is `text-base` on stamp-white. Use `text-sm` only for microcopy, captions, table cells. Don't use `text-sm` for explanatory paragraphs.

### Numeric moments

Prices, ticket counts, payouts, hero stats. Apply `print-num` alongside `font-display` to force Fraunces heavy + tabular numerals + high `opsz`:

```tsx
<span className="font-display print-num text-display-sm">₦300,000</span>
```

---

## Surfaces and radii

Four steps, tighter than before. The old 8/12/16 set felt marshmallowy on cream — sharper corners read as printed matter.

| Radius | Use |
|---|---|
| `rounded-sm` (6px) | Micro chips, Badge classifications |
| `rounded-md` (6px) | Controls — buttons, inputs, info messages |
| `rounded-lg` (10px)| Surfaces — cards, panels, dropdowns |
| `rounded-xl` (16px)| Featured surfaces — hero media, posters, single dominant blocks |
| `rounded-full` | Status dots only |

If you find yourself wanting a fifth radius, you're freelancing.

### Shadows

- `shadow-stamp-card` — warm sepia-tinted contact + fall shadow. Use on every Card. Never `shadow-md` / `shadow-lg` / `shadow-xl` — those are cool grey and clash on paper.
- `shadow-stamp-glow` — vermillion halo. Reserved for the single `glow` CTA per page. Wired into `<Button glow>`; don't apply manually.
- `shadow-stamp-well` — inset warm shadow, "pressed into paper." Used by `<Input>`. If you build a text-editable surface without going through `<Input>`, apply this by hand.

### Paper grain

Every route inherits a fixed, low-opacity noise overlay via `body.paper-grain`. Don't remove or override it — it's what makes the whole product feel like paper rather than a coloured div. If a route needs a dark takeover (e.g. `/scan`), it should sit above the grain layer with its own background, not disable the class.

---

## Primitives — pick from this list

### `<Card>`

```tsx
<Card>...</Card>
<Card tone="warning">...</Card>      // ochre border — needs attention
<Card accent>...</Card>              // vermillion top-rule + rotated seal ghost
<Card elevated>...</Card>            // surface2 background
<Card interactive>...</Card>         // hover border + lift
```

Rule: **`accent` Card ≤ 1 per viewport.** The accent treatment is now louder (a top-rule plus a ghosted seal impression in the corner), not just a hairline. Two accent Cards on one screen turn the signal into noise.

### `<SelectableCard>`

```tsx
<SelectableCard selected={tierId === tier.id} soldOut={tier.sold >= tier.capacity}>
  ...
</SelectableCard>
```

Selected state now includes a soft ring-2 vermillion halo — the "wax seal" lock. Don't reinvent buttons that look like cards.

### `<Button>`

```tsx
<Button>Default primary</Button>
<Button glow>The page's headline action</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="danger">Deactivate</Button>
<Button loading>Saving…</Button>
```

Every primary carries an inset bottom hairline that creates the physical "lip" for the `translate-y-px` on active. That press cue is core — don't override the shadow on a `<Button>` unless you're replacing the whole variant.

**Rule: `glow` only on the single highest-intent CTA per screen.**

### `<Badge>`

Rectangular classification marks (`rounded-sm`), not pills. 11px uppercase semibold with 0.08em tracking. The `default` tone with `dot` prop is the ambient "Live" pulse — green is never used for active state.

### `<Eyebrow>`

See typography.

### `<PageShell>`

Standard logged-in / marketing page rhythm. TopNav is now sticky rather than absolute — no need to reserve pt-32 to clear it.

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
3. **`<Eyebrow tone="accent">`** — vermillion eyebrow for celebration moments

Rule: only one signal per screen carries the brand color at full intensity. The seal is the fourth signal and is reserved for **verification moments only** — the ADMIT/DENY scanner overlay, the buy-success page, the deposit-confirmed payout state.

---

## The seal

The stamp seal is the brand's signature. It is used as a **stamp** — an applied, deliberate act — not as wallpaper.

- ✅ TopNav (logomark, size 32)
- ✅ Footer masthead (size 40) + oversized watermark at 5% opacity in the corner
- ✅ ADMIT/DENY scanner result (full-intensity, size 260, the product moment)
- ✅ Buy-success page (full-intensity, the buyer moment)
- ✅ Hero ticket-stub artefact (size 68, in-context "admitted" mark)
- ✅ Accent Cards (auto-applied via the AccentImpression at 9% opacity in the corner — do not add another one)
- ❌ Hero background (it's not a texture)
- ❌ Login centerpiece (the seal is for verification, not greeting)
- ❌ Empty-state decoration (use type, not the seal)

---

## Editorial utilities

Three CSS-only helpers in `globals.css` for premium moments:

- `.ledger-line` — thin hairline that tapers at both ends, for section breaks that shouldn't feel framed
- `.stamp-punch` — deckled ticket-stub edges via mask-composite
- `.print-num` — numeric moments in Fraunces heavy + tabular figures (see Typography)

Use them sparingly. If a page has more than one `.ledger-line` per section, they lose their "here's a break" meaning.
