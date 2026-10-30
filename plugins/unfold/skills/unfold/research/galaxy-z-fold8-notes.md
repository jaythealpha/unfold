# Galaxy Z Fold8 (wide, SM-F971x) teardown research notes

**Model:** the wide, passport-shaped Galaxy Z Fold8 (SM-F971B, B/DS, U, U1). It was announced at Unpacked on 2026-07-22. This is not the Fold8 Ultra (SM-F976x, 158.4 mm tall).

**Official specs (verified):**
- Open: 161.4 (w) x 123.9 (l) x 4.5 mm. Folded: 81.9 x 123.9 x 9.7 mm. Weight 201 g (s1, s3).
- Battery: 4800 mAh from two Si-C cells, 18.68 Wh. The cell labels read 2393 and 2267 mAh (s5, s9).
- Displays: inner 7.6 in 4:3; cover 5.5 in, Gorilla Glass Ceramic 3 (s2, s3).
- Cameras: 50 MP wide (OIS) + 50 MP ultrawide on the back; two 10 MP selfie cameras.
- Other: aluminium frame, side fingerprint key, IP48.
- Derived fold geometry: fold line at x = 80.7, closed gap = 9.7 - 2 x 4.5 = 0.7 mm.

## Best sources
1. **iFixit teardown news post (s5).** There is no step-by-step iFixit guide for the Fold8 yet; the device page lists only troubleshooting pages. The post covers Flex Titanium layers, one battery per half, pull jackets, the fragile plastic bezel, the hinge and inner display sold as one assembly, Phillips/JIS screws, USB-C on its own cable, and the main board having to come out (with new thermal paste) before the cameras can.
2. **JerryRigEverything teardown, as reported by TechEBlog (s9), Android Authority (s8), Notebookcheck (s11), SammyFans (s13) and 9to5Google (s10).** Source for: the hinge (exterior spine + 3 geared sections, 6 + 18 screws); 56 screws in total; the battery labels; graphite + paste cooling with no vapour chamber; a single plastic camera island; the coil sitting "very low"; SIM tray seals.
3. **Fold7 teardown coverage (s14 iFixit via 9to5Google, s15).** Used for the half layout: battery 1, the lower assembly and USB-C come from the back-glass side; battery 2, brackets and a glued SIM tray come from the cover-display side; a ribbon cable crosses the hinge.
4. **Not found:** a PBKreviews Fold8 video, a Samsung Fold8 repair manual (only the Fold7 has one), FCC internal photos, and readable YouTube chapter data.

All facts were taken in my own words; no text or images were copied.

## Disassembly order (assembly in the JSON is the reverse, 12 steps)
1. Heat and pry off back glass A, then lift the camera island with it.
2. Remove the coil/NFC sheet.
3. Remove the lower bracket (6 screws) and the main board bracket (10 screws), plus the graphite pad.
4. Unplug the connectors. Lift out the main board with paste under the SoC. Unclip the rear cameras and the inner selfie camera.
5. Pull battery A out by its pull jacket.
6. Remove the USB-C module (2 screws), the bottom speaker, the motor and sub board A (1 screw).
7. On half B: heat off the cover display, which has very strong adhesive.
8. Remove the board B bracket (10 screws), the top speaker (3 screws), the cover camera and board B.
9. Pull battery B. Remove the SIM tray/board and the B antenna.
10. Remove both interconnect flexes over the hinge.
11. Remove the hinge: 18 hinge-to-frame screws, then 6 section screws, then the spine and the 3 gear sections, then the support plates.
12. Separate the frames from the inner display. The bezel breaks; the hinge and inner display are serviced as one part.

## Verified vs estimated (73 parts: 32 verified, 41 estimated; 56 screws in 9 groups)
- **Verified** means a source documents that the part exists and how it is fastened. This covers both displays and the bezel, the Ti plate, the 3 hinge sections, the spine and its 6 screws, both batteries with their pull-tab adhesive, the USB-C cable, the main board, the paste and graphite, both rear cameras, the island, the coil, the back glass and its adhesive, the cover display adhesive, both speakers, the SIM tray, the side key, both frames, and the selfie camera(s).
- **Every bbox is estimated.** No source gives internal coordinates. Z stack: display 0-0.45, Ti plate 0.45-0.55, midplate 0.6-1.0, parts 1.0-3.75 on A / 1.0-3.3 on B, back glass 4.0-4.5, cover display 3.4-4.5, camera island to 6.5. Battery sizes were back-solved from the label mAh at about 820 Wh/L.
- **From the Fold7 or generic Fold layouts (estimated):** which half holds the main board, USB-C, SIM and keys; two hinge-crossing flexes (Fold7 confirms one); board B, sub board A, the SIM board, the brackets; punch-hole selfie cameras; NFC on the coil sheet.
- **Screw split (estimated):** only the 6 hinge-section screws, the 18 "spine" screws and the 56 total are sourced. I split the 18 as 9 per frame, and the other 32 screws across brackets as my own allocation.

## Doubts
- **Battery labels vs halves:** which label (2393 or 2267 mAh) sits in which half is undocumented. I put the larger cell in B because A's top is taken by the main board.
- **What the 18 screws do:** s9 says they "keep the spine rigid". I modelled them as hinge-to-frame screws, but they may instead hold the spine itself together.
- **Camera island:** its shape and position on the wide back are not described anywhere, so the vertical pill at A's outer-top corner is a guess. The side the keys are on is also unconfirmed.
- **Unfolded width conflict:** iFixit's device page lists the body as 151 x 124 x 4.5 mm. Samsung SG says 161.4. Samsung is used. The inner resolution is also listed differently: 2184x1968 (iFixit) vs 2448x1848 (Wikipedia).
- **Engine fold check:** the unfold engine's folded-width check fails, giving 85.0 mm against the official 81.9. Its bend model is a uniform 4.5 mm slab, so the bulge works out to T + gap/2. The real waterdrop spine is thinner or recessed. No honest fold.at/gap passes, so the engine needs a hinge-radius parameter or a wider tolerance for this phone.
- **Spine position simplified:** when the phone is open, the spine really sits recessed between the halves. The JSON shows it flush with the back at z 2.8-4.5.
- **Bezel placement:** the inner bezel actually stands proud of the screen (z < 0) and is fitted last. In the JSON it is in step 1 at z 0-0.45 so that everything can be assembled from +z.
- **Frames:** they start at z 0.6, above the display stack. In reality the outer rails wrap the display edge.
- **Passes-through cases (noted via passesThrough):** the USB-C port and inner selfie camera pass through frame A, the SIM tray through frame B, and the rear cameras through the back glass and the island.
