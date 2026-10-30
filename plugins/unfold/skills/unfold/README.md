# Unfold

A Claude skill. Name a phone, or show a photo of one. Bar phones and foldables are both supported. Claude researches the phone's real parts from public teardown and repair data, then builds one self-contained HTML page.

Drag the 0–100 time bar and the finished phone opens, bursts into its parts and assembles itself again. A foldable folds and unfolds, and viewers can also fold it by hand. Pick the playback speed: 1× (the slowest), 2×, 3× or 5×.

- **Two layouts:** an exploded stack, or every part laid out on a cutting mat (knolling).
- **Two styles:** colour illustration, or an animated blueprint with numbered balloons, assembly guides and a parts list.
- **Three depths:** simple (key parts and what they do), detailed (everything, labelled as it moves) and manual (step cards, tools, cautions, bill of materials, a printable manual).
- **Honest by design:** every part is marked sourced or estimated, the page shows the share, and the known limitations are listed with the sources.
- Works offline and on phones. Exports a PNG, a WebM video and a printed manual. Korean UI by default, English with one click.

```
node scripts/check_model.mjs examples/galaxy-s24.json --official 70.6,147,7.6   # Gate 1 (foldables: add --official-folded W,L,T)
node scripts/build.mjs examples/galaxy-s24.json out.html                       # one HTML file
node scripts/shoot.mjs out.html shots                                          # Gate 2 + contact sheet + key shots
node scripts/shoot.mjs out.html views --only "t=0&zoom=2" --scale 2             # one close-up view
npm test                                                                       # engine tests (node:test)
```

See `SKILL.md` for the workflow Claude follows, and `references/` for the model format and research rules.

MIT. Bundles three.js (MIT).
