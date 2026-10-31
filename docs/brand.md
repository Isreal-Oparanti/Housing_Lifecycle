# Brand

## Logo

The mark is a house built from its costs. The three bars under the roof are rent, council tax and
bills, darkest to lightest. It says what TrueCost does: the home is the sum of what it costs, not
just the rent.

| Use | File |
|-----|------|
| Website header and footer | [`client/src/components/Logo.tsx`](../client/src/components/Logo.tsx) (`LogoMark`, `Logo`) |
| Browser tab icon | [`client/src/app/icon.svg`](../client/src/app/icon.svg). Bars slightly thicker so they stay distinct at 16 px |
| iPhone and iPad home screen | [`client/src/app/apple-icon.tsx`](../client/src/app/apple-icon.tsx), a 180 × 180 PNG generated at build time |
| Link previews (messages, social) | [`client/src/app/opengraph-image.tsx`](../client/src/app/opengraph-image.tsx), 1200 × 630 |
| Anywhere else (decks, GitHub, documents) | [`client/public/brand/truecost-mark.svg`](../client/public/brand/truecost-mark.svg), served at `/brand/truecost-mark.svg` |

The wordmark "TrueCost" is set in Plus Jakarta Sans Bold, next to the mark, with a gap of about a
quarter of the mark's width.

**Don't:**
- recolour the bars;
- change their order (darkest at the top);
- put the mark on a dark background without its lavender tile.

## Colours

| Name | Hex | Used for |
|------|-----|----------|
| Ink | `#16132B` | Text, dark buttons |
| Violet | `#6D28D9` | Brand, primary button, roof |
| Violet dark | `#4C1D95` | Top bar of the mark (rent) |
| Violet mid | `#7C3AED` | Middle bar (council tax) |
| Violet light | `#C4B5FD` | Bottom bar (bills) |
| Lavender | `#F3EEFF` | Mark tile, soft highlights |
| Canvas | `#FAF9F6` | Page background |
| Official (teal) | `#0F766E` | "Official rate" labels |
| Estimate (amber) | `#A35207` | "Estimate" labels |

The website's design tokens are in [`client/src/app/globals.css`](../client/src/app/globals.css).

## Type

- **Headings:** Fraunces (serif).
- **Everything else:** Plus Jakarta Sans.
- **Numbers:** tabular figures, so amounts line up.

The link-preview image currently uses the image generator's built-in sans-serif font, because the
brand fonts aren't bundled for it.
