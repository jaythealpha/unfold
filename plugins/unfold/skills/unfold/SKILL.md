---
name: unfold
description: Turn a real product (smartphones, including foldables like the Galaxy Z Fold or iPhone Duo, from a model name or a photo) into one self-contained HTML page where a 0–100 time bar opens the finished phone, bursts it into its real parts and assembles it again — exploded stack or parts laid out on a mat, colour illustration or animated blueprint, simple / detailed / manual depth, labelled parts, a bill of materials, a printable step-by-step assembly manual, and every part marked as sourced or estimated. Claude researches public teardown and repair data, writes an assembly model, and must pass two automatic gates before delivering. Use whenever someone wants to see how a product goes together or comes apart, a teardown, an exploded view, "what's inside" a phone or device, an assembly animation, or an assembly manual from a model name — even if they don't name the skill. Korean UI by default.
---

# Unfold

Unfold makes one HTML page with a time bar that tells one story for every phone:
- **0–8:** the finished phone turns over (a foldable unfolds first), then bursts into its parts. The parts float in an exploded stack or land on a cutting mat.
- **8–92:** the steps put it back together.
- **92–100:** it turns over (a foldable folds shut) and its screen lights up.

0 and 100 both show the finished phone. Viewers can pick the playback speed and, on a foldable, fold it by hand at either end. The engine draws it in 3D (three.js, bundled) in two styles and three depths. **You** supply the product as an *assembly model* (JSON) built from real public data. Two gates check your work, because nobody reviews it before the person sees it.

The skill folder (`<skill>` below) holds the engine (`engine/`), the bundled shared code and three.js (`shared/`, bundled with the skill), the scripts (`scripts/`), the references, and finished example models in `examples/` (their built pages are in the repository's `docs/examples/`). Copy the one closest to your phone:
- `galaxy-s24`: a back-access bar phone
- `iphone-17-pro`: a front-access bar phone, `access: "front"`
- `galaxy-z-fold8` and `iphone-duo`: book-fold foldables
- `galaxy-z-flip8`: a clamshell foldable, `axis: "x"`

## Rules that always hold

- **Work unattended.** Do not stop to ask the person questions mid-way. If the model name is ambiguous, take the most likely reading, say which in `meta.interpretation`, and carry on.
- **Facts from sources, everything else marked estimated.** Every part has `sourceIds` or `confidence: "estimated"`. Never present a guess as sourced. A part is verified only when a cited source, for this exact model, states both that the part is there and how it is held. `references/research.md` ("When a part counts as verified") has the rule and examples; apply it strictly. The page shows the sourced share and warns below 50%. That is fine and honest, so don't inflate it.
- **Licence:** teardown sites (iFixit is CC BY-NC-SA) may not be reused commercially. Take facts only (sizes, counts, order, names, fastening). Write every sentence yourself, never copy text, and never embed or download their photos. Sources appear as links only.
- **Gates loop at most 3 rounds each.** Whatever still fails after that goes into `meta.limitations` (shown on the page), and you say so when you deliver.
- Requires Node 18+ for Gate 1 and the build, and Node 22+ plus Chrome or Chromium for Gate 2 (no npm packages). When Gate 2 can't run, it prints `GATE2 SKIPPED` with the reason: build with `--gate2 skipped` and say so. Gate 1 always runs.

## Workflow

1. **Understand the request.** Pin down the product and variant (e.g. "Galaxy S24" means the base SM-S921, not the S24+). When regional variants differ inside (SIM tray vs eSIM-only, battery size), build the variant sold where the requester is (a Korean request → the Korean model; if it is not sold there, the variant the main teardown used), and say which in `meta.interpretation`. Phones are tuned: 40–80 parts for a bar phone, 50–100 for a foldable. Other products work with the same templates, but say they are outside the tuned range.
   - **A photo instead of a name:** identify the model from what you can see: camera layout, logo, a fold seam, buttons, colour, screen shape.
     - If you are sure, use that model.
     - If not, take **the latest flagship of that maker**. Check what is latest at the time by searching.
     - If even the maker is unclear, take the most likely candidate and say it is uncertain.
     - Write the cues and the conclusion into `meta.interpretation`. Use the photographed colour for the body if you can tell it. Never put the photo itself into the page.
     - A photo of something that is not a phone: say in chat that Unfold covers phones for now, and stop.

2. **Research.** Read `references/research.md`. Collect the official dimensions (w × l × t in mm), the disassembly order, every part with its fastening (screw counts and lengths, connectors, adhesive), and estimated sizes and positions. Write short notes as you go (what is verified, what conflicts).

3. **Write the model.** Read `references/model-format.md` and copy the structure of the closest example. Give every part a shape template and real-looking parameters (corner radii, holes, lens positions, screw positions, cable routes, shield cans). Steps follow the reverse of disassembly. Everything goes in from above (+z), so the **base** is the one part with no `attachedTo`: the lowest part. Every other part names what it is fixed to and how (`fastening`), and moves at t=0. Mark 6–8 key parts with `key: true` and a one-line `desc` in Korean and English. Write `meta.limitations` from your notes. If no source gives internal positions (the usual case), set `meta.positionsEstimated: true` so the page says so.
   **Decide the build direction first.**
   - **Back-access** (the usual Samsung, Pixel and older iPhone build): repair starts at the back glass. The model lies **screen down**, and the base is the display.
   - **Front-access** (e.g. iPhone 17 Pro): repair starts by lifting the screen, and the display goes on last. The model lies **screen up**:
     - set `product.access: "front"`
     - z = 0 is the body's back, and the screen is at the top
     - the base is the body (unibody or frame)
     - the display is a `display` with `face: "back"` (its screen faces +z)
     - rear cameras use `camera` with `face: "down"`
     - a camera plateau goes in the body as `housing.bumps`

     The phone then never turns over, and its screen is lit at both ends. Get this wrong and Gate 2 fails the "lit screen" check.
   With many parts, generate `model.json` from a small script (Python or Node) rather than writing it by hand. It makes rounds of fixes much faster. Fields such as `notes` and `shapeNote` are free text for you; the engine ignores them.
   **Foldables** (copy `examples/galaxy-z-fold8.json` for a book fold, `examples/galaxy-z-flip8.json` for a clamshell):
   - The phone lies **open with the inner screen down**.
   - `product.fold = {axis, at, gap, b, spine}`. `gap` = folded thickness − 2 × open thickness. `spine` = folded width − the width of the wider half.
   - `product.foldedDims` holds the official folded size.
   - Each part gets `half` (`a`, `b` = the half with the cover screen, or `hinge` for the inner screen, the hinge and anything lying across the fold line).
   - Shapes: the inner screen is `flexdisplay`, the cover screen is `display` with `face: "back"`, and hinge blocks are `hinge`.
   - How parts move:
     - Only the screen stack bends: `flexdisplay`, plus thin `columns: true` layers within 1.3 mm of the screen surface.
     - Other `hinge`-half parts split at the fold line: what lies on A's side stays, and what lies on B's side turns with B.
     - Mark a part `hinge` only if it really crosses the fold line. Otherwise give it its own half.
     - The page draws the shut spine (`fold.spine`) as the hinge cover.

4. **Gate 1 (data).** Run
   `node <skill>/scripts/check_model.mjs model.json --official W,L,T` (foldables: add `--official-folded W,L,T`)
   W, L, T are width, length and thickness. Makers usually list height × width × depth, so reorder them: 147 × 70.6 × 7.6 becomes `--official 70.6,147,7.6`.
   until it prints `GATE1 PASS`. It checks references, steps (≥ 2), a single base, fastening on every other part, key parts, dimensions (±0.5 mm) and boxes inside the product. It then checks collisions when assembled, and, sampled finely in both layouts, parts passing through each other in the burst or through already-seated parts on their way in. For foldables it also checks the two halves when shut and the folded size. Fix the data, not the checker. When something really goes through another part (a lens through the back glass, a port through the frame), declare it with `passesThrough`. Gate 1 treats `holes` as solid, so a part sitting in a hole still needs `passesThrough`. Boxes may reach up to 6 mm beyond the body's thickness on either face, for camera bumps.

5. **Build, then Gate 2 (pictures).**
   `node <skill>/scripts/build.mjs model.json out.html`
   `node <skill>/scripts/shoot.mjs out.html out-shots`
   Gate 2 shoots about 40 views:
   - the bar at 0/25/50/75/100 × both layouts × both styles
   - the opening and closing scenes
   - for foldables, the fold slider at 0°, 90° and 135°
   - other angles, every depth, manual steps, English and the sources panel
   - three real phone-emulated shots

   It also checks:
   - that a screen is actually lit at t = 0 and t = 100
   - the playback speed
   - the printed manual

   It fails on script errors, a blank canvas, horizontal scroll, labels outside the stage, overflowing text, no lit screen at the ends, or an incomplete manual. Besides `contact.png`, it writes `key.png`: the shots most worth reading, two to a row, including two pages of the printed manual. Then **look** at `out-shots/key.png` and `contact.png`, and open any doubtful shot full size. For a close look, run `node <skill>/scripts/shoot.mjs out.html views --only "t=0&yaw=200&pitch=15&zoom=2.5" --scale 2`; you can repeat `--only`. `zoom` closes in on the centre of the view, so turn it with `yaw`/`pitch` until the spot you want sits near the centre. This is worth doing for a foldable's hinge end and its crease at `fold=90`. Check:
   - no part drawn through another, and no floating part at t=100
   - the layers read clearly at t=0
   - labels point at the right parts
   - at t=0 and t=100 the phone is whole and lit (a foldable shut, its cover screen lit)
   - a foldable's inner screen bends smoothly and nothing crosses at the fold
   - the mat layout is tidy
   Fix and repeat, then rebuild with `--gate2 pass` (or `fail` / `skipped`) so the page records the result. Rerun Gate 2 after any change the page draws: parts, positions, steps or labels. A change to `sources`, `limitations` or `meta` text alone needs only the rebuild.

6. **Deliver.** Hand over `out.html` (it works offline and on phones; keep `model.json` beside it). In a few lines, tell the person:
   - the model you built
   - part and step counts
   - the sourced share
   - the main limitations
   - how to use it:
     - drag the bar or press play, and pick the speed (1× is the slowest; 2×, 3×, 5×)
     - the toggles switch depth (간단히/자세히/매뉴얼), layout (층층이/매트 정렬) and style (컬러/도면)
     - on a foldable, the 접기 slider folds it at 0 or 100
     - click a part for its details
     - the buttons save an image, record a video and print the manual

## Page parameters (for screenshots and links)

`?t=0..100` `&layout=stack|knoll` `&style=color|blueprint` `&depth=simple|detail|manual` `&step=N` (the end of step N; `t` wins if both are given) `&lang=ko|en` `&speed=xslow|slow|normal|fast` (1× / 2× / 3× / 5×; default 2×) `&fold=0..180` (foldables, at t=0 or 100) `&yaw=&pitch=` `&auto=0` `&play=1` `&panel=sources` `&pick=<partId>`

## When something else fits better

- A playful, hand-drawn object you press buttons on → **colorfigures**.
- A data chart → a charting skill.
