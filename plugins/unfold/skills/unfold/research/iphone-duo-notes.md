# iPhone Duo (A3447) teardown research notes (2026-10-29)

**Specs (verified, Apple spec page s1):** open 164.6 W x 117.8 L x 5.2 T mm; shut 84.1 x 117.8 x 11.3 mm; 254 g; 7.6 in inner (1878x2670) and 5.4 in outer (1398x2034) display.
Cells: 11.56 Wh (2,962 mAh) and 7.5 Wh (1,921 mAh), 4,883 mAh in total. These figures come from teardowns (s27, s29, s30); Apple publishes no mAh.
Fold: axis y at x = 82.3 (symmetric, estimated); gap 0.9 = 11.3 - 2 x 5.2; spine 1.8 = 84.1 - 82.3 (both derived).

## Best sources
1. **Apple Self Service Repair manual** (s3-s26, published 2026-10-23). It is by far the richest source: for every module it gives the part names, which half the part is in (back-glass side vs outer-display side), every screw with its count and head type, cowlings, connectors, adhesives, and the removal order. Only facts are taken from it, all reworded.
2. **iFixit teardown article** (s27, CC BY-NC-SA, facts only). Covers the hinge build (sync gears, springs, chain of joints, curved guides, centre support bar), the one pleated flex that crosses the hinge, the display cable through the hinge centre, the single-layer logic board plus I/O board, battery Wh by side, and 4 pentalobe screws.
3. **Press reports of the REWA and Phone Repair Guru videos** (s30-s32). They cover the T4 screws on the USB-C module, the vapour chamber on the logic-board half, the aluminium plate in the other half, and the antenna that wraps the camera.
4. **Not found or not usable:** an iFixit step-by-step guide (none yet); FCC internal photos (not searched); the Apple screw-location diagrams (images only, so screw xy positions are not available); JerryRigEverything and PBKreviews (no Duo coverage turned up in searches).

## Layout used (open, inner display down, viewed from the back)
- **Half A, x 0-79.1.** Back glass with a full-width camera plateau along the top. Under the plateau: the rear camera at the free-edge corner, the under-display FaceTime camera, and the logic board on the hinge side. Battery 1 sits in the middle. Along the bottom: bottom speaker, Taptic Engine, main microphone. Touch ID and Camera Control are on the free edge (x=0); volume buttons are on the top edge.
- **Hinge, x 79.1-85.5.** Centre support bar, the mechanism, the hinge cover, and the pleated flex (near the top, estimated). The inner display flex crosses near the bottom into B (estimated).
- **Half B, x 85.5-164.6.** Cover display on top. Along the bottom: I/O board and USB-C (port centred on the shut phone). Battery 2 in the middle. At the top: top speaker, ambient light sensor, outer front camera.
- **Z stack:** inner display 0-1.0 (cover layer 0-0.15); adhesive, foams and carbon plates 1.0-1.2; midplate 1.2-1.6 (A) or 1.2-1.5 (B).
  - A: battery 1.7-4.3, coil 4.35-4.6, back glass 4.6-5.2, plateau to 6.3, lens rings to 6.9.
  - B: battery 1.55-4.05, cover display 4.1-5.2.

## Disassembly order (Apple; assembly in the JSON is the reverse, 15 steps)
- **Half A:** 2 PL1.1, heat and cut back glass; battery cowling (2 trilobe), disconnect battery then back glass flex; cowlings (logic board upper 3, FaceTime 2 trilobe); camera (spacer 4 crosshead, 1 crosshead, 2 super); FaceTime camera (adhesive); logic board (antenna 1: 1 trilobe; 2 crosshead; 7 flex; 3 super); battery 1 (e-debond, 2 tabs); bottom speaker (4 crosshead), lower antenna flex (3 trilobe), Taptic (2 crosshead); main mic (1 super + adhesive); volume and Touch ID/Camera Control (brackets, 5 screws, clips, roll bars).
- **Half B:** 2 PL1.1, heat, cut, release clips; 2 trilobe under screw caps, I/O cowling (6 trilobe), disconnect battery then outer display; ALS cowling (1 crosshead); top speaker (3), outer front camera (2 crosshead), battery 2; I/O board (2 crosshead, 5 super, 4 flex); USB-C (2 Torx Plus 3IP + adhesive); inner display (trim clips, flex, heat, cut).
- What is left is the enclosure with the hinge, which is one service part.

## Verified vs estimated (97 parts: 92 verified, 5 estimated; 25 screw groups)
- **"Verified"** = a source states the part's existence, half, fastening and count. **Position is estimated for every part** (`positionConfidence: "estimated"`): no source gives internal xyz, so boxes are sized against the official outline, display active areas and cell Wh.
- **Estimated parts:** grounding foams A/B (2 per half assumed), carbon support plates A/B (split and width assumed), MagSafe coil (riding on the back glass is inferred).

## Doubts
- **Cell per half not stated.** 7.5 Wh put in half A (it also holds board and cameras; iFixit's "left" cell is 7.5 Wh). Could be reversed. Battery 2's box needs about 810 Wh/L (tight).
- **Orientation** assumes the usual book fold, hinge left of the cover screen; mirror x if photos disagree.
- **Inferred placements:** plateau shape and camera corner ("iPhone Air-like plateau", "aligned horizontally", leaker note s36, low trust); y of the hinge-flex and inner-display-flex crossings unknown; outer front camera may be top-centre, not top-right.
- **Apple text conflicts:** volume bracket 2 screws (removal) vs 3 (reassembly), 3 used; crosshead G4/G5 on lower antenna flex vs upper antenna 1; an ALS cowling in half A is mentioned but not modelled.
- **Real order differs:** the cover layer goes on last from the screen side and the trim is glued and clipped to the enclosure (both in step 1 here because the screen is the base); the hinge is factory-integral, screws undocumented.

## Allowed overlaps (attached or passing through)
Buttons and USB-C through the rails; FaceTime camera through the A midplate; rear camera through back glass and plateau; cover layer and trim through the enclosures (a box frame draws a hinge-side wall down to z=0); flex and adhesive layers; connectors, cowlings and screws on their bases; support bar inside the hinge mechanism.
Gate 1 (`scripts/check_model.mjs --official 164.6,117.8,5.2`, fold checks included) passes on a scratch copy with `shape` text swapped for templates; the research file keeps `shape` as text, as specified.
