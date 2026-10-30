# The Unfold assembly model

One JSON file. The page reads only this, so everything the page shows comes from here. Copy the structure of `examples/galaxy-s24.json`. Units are mm, and coordinates follow `research.md` (screen down, z = assembly axis).

```jsonc
{
  "product": { "name": {"ko": "갤럭시 S24", "en": "Galaxy S24"}, "maker": "Samsung Electronics", "kind": "phone",
               "dims": {"w": 70.6, "l": 147.0, "t": 7.6}, "modelCodes": ["SM-S921B"], "weight_g": 167 },
  "sources": [ {"id": "s1", "title": "…", "url": "https://…", "covers": "dimensions, weight"} ],
  "parts": [ /* Part */ ],
  "steps": [ /* Step, in assembly order */ ],
  "meta": { "interpretation": {"ko": "…", "en": "…"}, "researchedAt": "2026-10-29",
            "limitations": [ {"ko": "…", "en": "…"} ] }
}
```

**Foldables** add to `product`:
- `"kind": "foldable"` (set automatically when `fold` is present)
- `"fold": {"axis": "y", "at": 80.7, "gap": 0.7, "b": "+", "spine": 1.2}`, where:
  - `axis`: `y` for a book fold, `x` for a clamshell
  - `at`: where the fold line is
  - `gap`: the space between the shut halves, i.e. folded thickness − 2 × open thickness
  - `b`: `+` when half B, the half with the cover screen, is on the high side
  - `spine`: how far the shut spine stands out, i.e. folded width − the half's width
- `"foldedDims": {w, l, t}`

**Book fold vs clamshell:**
- **Book fold** (`axis: "y"`, Galaxy Z Fold, iPhone Duo): the fold line runs along y at x = `at`. `spine` = folded width − the wider half's width. B (`b: "+"`) is the right half, seen from the back.
- **Clamshell** (`axis: "x"`, Galaxy Z Flip): the fold line runs across the phone at y = `at`. `spine` = folded length − the longer half's length. B (`b: "+"`) is the top half, the one with the cover screen. Give `--official-folded` in model axes: w unchanged, l about halved.

**The hinge band:** keep the halves' frames close to the fold line, within about `spine` + 0.5 mm. When shut, the page fills the band between the frames and the fold line with the spine, so a wide band reads as a thick spine. The `hinge` template's barrel is sized to stay inside the spine.

B turns about an axis in the middle of the gap.
- **Bends:** only the screen stack. That is the `flexdisplay`, plus thin `columns: true` layers (≤ 0.8 mm thick, top within 1.3 mm of the screen surface). It wraps round the axis.
- **Splits:** every other `half: "hinge"` part, cables included, splits at the fold line. Its A side stays and its B side turns with B. The hinge barrel turns by half the angle.
- **The spine:** the page draws `spine` as the hinge cover when the phone is shut. You need no part for the outer cover. If you do model a hinge spine or cover as a part (the Fold8 example has one, carrying the hinge screws), keep it thin and stop it a few mm short of each end, so it never pokes out of the corners at `fold=90`. Check the hinge end at `fold=90` and `135` in close-ups either way.
- **Gate 1:** measures the folded size on the parts themselves (z kept within the body, so bumps don't count) and compares it with the official one. Model the phone **open, inner screen down**.

**Build direction:** `product.access` is `"back"` (default) or `"front"`.
- **`back`:** the model lies screen down, assembled from the back onto the display.
- **`front`:** the phone is built into its body from the screen side, so the model lies screen up. z = 0 is the body's back; the base is the body; the display goes last as `display` with `face: "back"`. The page never turns it over and lights that screen at both ends.

`meta.positionsEstimated: true` adds "위치·크기는 추정" to the page's evidence row (use it when no source gives internal positions).

Text fields take `{ko, en}`, a plain string, or research-style `name_ko` / `name_en` (likewise `title_*` and `desc_*`).

## Part

| field | meaning |
|---|---|
| `id` | kebab-case, unique |
| `name` | `{ko, en}` |
| `category` | `housing display board battery camera audio haptics wireless connector flex fastener bracket adhesive button port sim antenna shield thermal hinge other`. Picks the default material. `fastener`, `adhesive` and `flex` are exempt from collision checks. |
| `count` | identical units (screws) |
| `bbox` | `[x0,y0,z0,x1,y1,z1]`, inside the product's w × l (z may exceed t) |
| `shape` | `{template, …params}`, see below |
| `attachedTo` | the id it is fixed to. Exactly one part, the **base**, omits it: the lowest part (usually the display, screen down), in step 1. It is the only part that never moves. |
| `fastening` | required on every part but the base: `{type, spec?, count?}`, type one of `screw adhesive press-connector clip solder integral magnet friction tape`, several joined with `+` (`screw+clip`). `spec` is printed as is in the parts list and the manual, so keep it language-neutral (`PH #0 3.5 mm`, `Torx Plus 4IP`) or give `{ko, en}`. |
| `step` | the assembly step number; the part must also be listed in that step |
| `path` | optional per-part motion: `drop|screw|press|slide|fold` (screws: `screw`). `slide` comes in through the edge named by `slideFrom`: `y0` (default, the charging-port end), `y1`, `x0` or `x1`. Use it for a SIM tray on a side edge, or a stylus (S Pen): a `box` the length of the pen, going in last through its edge, after the back is closed. The pen's silo is part of the frame. A slide part waits just clear of its edge, however long it is, so keep it in the step where it really goes in. |
| `passesThrough` | ids it really goes through (a lens through the back glass, a port or SIM tray through the frame) |
| `sourceIds`, `confidence` | `verified` needs ≥ 1 source; otherwise `estimated` |
| `key`, `desc` | 6–8 key parts get `key: true` and a one-line `desc {ko, en}` (shown in the simple view) |
| `half` | foldables: `a`, `b` or `hinge` (the inner screen, the hinge, anything across the fold line). If you omit it, it is derived from the box. |

## Step

`{ n, title {ko,en}, parts: [ids], tools {ko,en}, cautions {ko,en}, path: drop|screw|press|slide|fold, sourceIds }`. List steps in order of `n`, starting at 1. The time bar gives each step a share weighted by its part count. **Within a step, parts go in in list order**, so list a part before whatever covers it. A part's `path` overrides its step's.

## Shape templates

Any `box`, `plate` or `adhesive` lying across a foldable's fold line takes `columns: true`, so it bends with the fold.

Colours: `shape.color` tints the body, and `shape.colors.{material}` tints one material (e.g., `{"alu": "#b4b1dc"}`). `shape.mat` overrides the material key: `alu glass black pcb pcbDark chip passive battery label copper flex metal metalDark gold lens shine adhesive`.

| template | params | use |
|---|---|---|
| `housing` | `bumps:[[x0,y0,x1,y1,z0,z1,r]]` raised areas such as a camera plateau (part of the body, may stand out below z = 0), `r` corner radius, `wall`, `floorAt:[z0,z1]` (midplate), `floorMat`, `holes:[[cx,cy,w,h,r]]` (midplate cut-outs), `screen:false` when the display is a separate part, `bands:[[side,at]]` antenna breaks (`x0|x1|y0|y1`) | frame / midframe |
| `ring` | `r`, `wall` | frame walls only |
| `display` | `r`, `bezel`, `hole:[cx,cy,r]` punch hole, `face: "back"` for a screen facing +z (a foldable's cover screen, or the main screen of a front-access phone) | display assembly (its screen lights up at the ends of the bar) |
| `flexdisplay` | `r`, `bezel`, `hole` | a foldable's inner screen; cut into thin columns so it bends at the fold |
| `hinge` | — | a hinge block: barrel along the fold line, link blocks, a wing onto each half |
| `plate` | `r`, `holes`, `ring` (band width → a gasket outline) | back glass, brackets, vapour chamber, tray |
| `adhesive` | `r`, `ring` | adhesive films and gaskets (translucent) |
| `pcb` | `r`, `thick`, `chips:[[x0,y0,x1,y1,h,colour]]`, `sandwich:true`, `chipH`, `passives` (count) | boards. Shield cans are chips in a metal colour. |
| `battery` | `r` | pouch cell with label and protection board |
| `shield` | `r` | metal cage / can |
| `screw` | `head` (diameter), `positions:[[x,y]…]` | one entry per screw group; heads at the top of `bbox` |
| `connector` | `units:[[x0,y0,x1,y1]…]` for several connectors in one entry | board-to-board connectors |
| `flex` | `width`, `path:[[x,y,z]…]` | ribbon cables; set `bbox` to the route's extent |
| `camera` | `r`, `barrel`, `lenses:[[cx,cy,r]]`, `body:false` (rings only), `face: "down"` (lenses look out of −z: rear cameras of a front-access phone) | camera modules, lens rings |
| `coil` | `rIn`, `rOut`, `turns` | wireless charging coil on its sheet |
| `speaker` | `r`, `slots` | speaker boxes, earpiece |
| `motor`, `button`, `port`, `box` | `r` | small parts |

## What Gate 1 rejects

Gate 1 sees every part as its box: housings as floor + walls (+ bumps), screws per head, connector `units` each. `holes` count as solid, so a lens in a hole needs `passesThrough`. Boxes may reach up to 6 mm beyond 0..t in z (bumps); x and y must stay inside the product (±0.5 mm).


- fewer than 2 steps, no single base, a non-base part without a valid fastening, no key parts
- foldables: a bad `fold`, the halves running into each other when shut, or a folded size off the official one by more than 0.5 mm
- parts passing through each other in the burst (bar 4–8), in either layout
- unknown ids, templates or paths
- a part missing from its step, or listed twice
- a verified part without a source
- dimensions off the official ones by more than 0.5 mm
- boxes outside the product
- two parts overlapping when assembled (unless attached, exempt, or `passesThrough`)
- a part that, on its way in, passes through one already seated (fix the order or the position)
