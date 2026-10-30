# Galaxy S24 (SM-S921) teardown research notes

**Model:** Samsung Galaxy S24, base model (SM-S921B/U/U1/W/N/E/0). I kept the S24 rather than switching to the iPhone 15. iFixit has 11 S24 repair guides. Together they cover nearly every removable part in order, with screw counts and lengths, which is enough to build the data.

**Specs (verified):** 70.6 x 147.0 x 7.6 mm, 167 g (168 g mmWave), 4000 mAh (3880 rated), 6.2 in display.
Sources: Samsung PH specs page (s1), GSMArena (s2), Samsung Mobile Press (s16, seen only via a search snippet).

## Best sources
1. iFixit "Screen and Battery Assembly Replacement" (s9). This is the deepest disassembly: all 24 screws, every connector, and the residual part.
2. iFixit Motherboard (s5), USB-C/Daughterboard (s6), Battery (s8), Screen (s7), Earpiece (s10), Front/Rear camera (s11, s12) guides.
3. PBKreviews teardown, reported by GSMArena (s14) and SamMobile (s15). Source for: dual-layer board, larger vapor chamber, glued front camera, pull-tab battery, individually replaceable lens covers.
4. Not found or not usable: Samsung's US spec page (fetch failed), FCC internal photos (fccid.io returned 403), and any iFixit full teardown (none exists for the base S24).
iFixit content is used for facts only (counts, lengths, order, names), all paraphrased.

## Disassembly order (assembly is the reverse; the JSON has 14 assembly steps)
1. Back glass: heat, then pick around all four edges plus a glue spot above the flash.
2. Disconnect the coil. Remove 13 screws (6 coil + 7 loudspeaker, all 3.5 mm). Unclip the loudspeaker and lift out the coil and speaker together.
3. Eject the SIM tray (bottom edge). Disconnect the battery.
4. Earpiece assembly: 5 screws, 3.5 mm.
5. Disconnect and remove the display cable and two interconnect cables (labels MAIN/SUB).
6. Disconnect the mmWave antenna and front camera. Motherboard: 2 screws, 3.4 mm. Lift it out with the three rear cameras attached, then unclip the cameras (ultrawide on 2 pegs).
7. Front camera (glued, 90 s heat). Unnamed antenna (adhesive + conductive tape). mmWave bracket (2 screws, 2.5 mm) and antenna.
8. Daughterboard + USB-C: 2 screws, 3.4 mm. Unclip at the top-right corner.
9. What remains is the screen + battery + frame service unit. The battery comes out separately by pull tab. The display comes off the front with heat.

## Verified vs estimated (56 parts: 27 verified, 29 estimated; 24 screws in 6 groups)
- **Verified:** that each part exists, its fastening, screw counts and lengths, removal order, and connector edge/corner locations.
- **Estimated:** almost all xy/z coordinates and outlines. No source publishes internal dimensions. Coordinates are sized against the phone's outer dimensions and the 4000 mAh battery.
- **Battery bbox:** about 60 x 68 x 4.9 mm. This comes from a third-party retailer outline (s17, low trust), adjusted to fit the 7.6 mm thickness.
- **Z stack (estimated):** display 0-1.3, midplate ~1.3-2.0, boards/battery ~2-6.6, coil 6.65-6.92, back-glass adhesive and glass 6.92-7.6, lens rings to ~8.5.
- **Mirroring:** the side keys and loudspeaker appear at small x because the view is from the back. Keys are on the right and the speaker grille is bottom-right when seen from the front. The SIM is assumed at bottom-right from the back.

## Doubts / conflicts
- **Daughterboard screws:** s9 says 2, s6 says 3. I used 2 so the total matches s9's 24.
- **Motherboard screw length:** s9 says 3.4 mm, s5 says 3.5 mm.
- **Community battery guide (s13):** says 8 coil screws and a glued battery, with no pull tab. This contradicts s5, s6 and s8, so it is treated as low confidence.
- **Vibration motor:** no S24-specific location found. It is placed bottom-right as a guess. It is not removed in s9, so it is assumed to stay in the front housing.
- **Unnamed antenna (s9 step 36):** name and location unknown, placed top-right. The "5G mmWave cable" from the motherboard's bottom-left edge has an undocumented far end and route.
- **Loudspeaker "wing":** a hypothesis that the speaker module extends across the daughterboard (suggested by its 7 screws). Not confirmed.
- **Vapor chamber:** outline and placement under the motherboard are estimated. Only its relative size, about 2x the S23's, is reported.
- **Rear camera order:** top-to-bottom ultrawide/main/telephoto is from the phone's exterior, not stated by iFixit. Lens-ring bump height (~0.9 mm) is estimated.
- **mmWave parts:** they exist only on mmWave SKUs (e.g. SM-S921U). Sub6-only builds lack the module and bracket.
- **Overlap check:** the frame, back glass and the two adhesive rings are treated as containers, and screws pass through other parts by design. The SIM tray sits inside the SIM reader, and the lens rings sit in the back-glass holes. Cable bboxes cover only the straight runs; the jogs to their connectors are described in each part's "shape".
