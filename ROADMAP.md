# 🌸 Flowers — roadmap

North star: **the space of possible flowers**, explorable in real time, in a breeze,
under a blue sky. Accurate and educational — but *fun first*. If a slider doesn't
either teach you something about botany or make you laugh, it's the wrong slider.

Live at [flowers.exe.xyz](https://flowers.exe.xyz); pushing to `main` deploys.

## Phase 1 — the morphospace *(done)*

- [x] ✅ **The petal** — one warped sheet (curl / cup / fold / twist / ruffle / notch /
      spur) spanning a daisy ray, a tulip cup, a reflexed lily tepal and a leaf.
- [x] ✅ **Whorls and spirals.** Whorled corollas stagger; a rose/lotus packs its petals
      on the golden angle, which is why a 100-petal rose still reads as a rose.
- [x] ✅ **The doubling slider** — stamens→petals, conserving the organ budget.
- [x] ✅ **Six centres:** stamens, capitulum disc (Vogel's spiral, opening rim-inward),
      poppy boss + rayed capsule, daffodil corona, orchid column, spadix.
- [x] ✅ **Petal optics:** translucency (poppy), velvet (pansy), gloss (buttercup),
      iridescence gated to the dark eye; veins, spots, blotch, nectar-guide throat.
- [x] ✅ **Wind** — in-shader, cantilever bend, sway + gust + petal flutter, per-plant phase.
- [x] ✅ **Sky, sun, lens flare** (occluded by the blooms).
- [x] ✅ **Inflorescences:** raceme, umbel, cyme, bouquet.
- [x] ✅ **19 presets**, blend slider, shareable URLs, smoke tests, gallery, CI/CD.

## Phase 2 — the weak spots *(next, and honest)*

- [ ] **The Turk's-cap lily is the worst preset in the set.** Six tepals reflexing ~180°
      currently curl into a closed pod instead of a turban, because the petals bend
      backward without also *splaying* — a real martagon's tepals recurve **and** open.
      The petal needs a second curl axis (recurve out of the plane, not just along it).
- [ ] **The passionflower doesn't read.** Its corona is 100+ fine filaments in coloured
      *bands* on an androgynophore; we approximate with a flat splay of stamens and it
      comes out looking like a white daisy. It needs a real corona primitive with rank
      banding — and that same primitive gives the daffodil's frill and a dandelion.
- [ ] **True sympetaly.** Morning glory, foxglove and snapdragon all have *fused*
      corollas; we fake all three with overlapping free petals. A `fusion` slider that
      genuinely welds adjacent petals into a tube would fix the whole trumpet/bell/
      bilabiate branch of the taxonomy at once — the single highest-value item here.
- [ ] **Zygomorphy.** Bilateral symmetry is currently faked with jitter. Snapdragons,
      orchids, peas and salvias all need real 2+3 lip structure.

## Phase 3 — the fun

- [ ] **Bouquets and arrangements.** `bouquet` exists but is crude. Real goal: a vase, a
      handful of *different* species, hand-tied and fanned. Cross-species arrangements
      are the thing people will actually share.
- [ ] **Breeding.** `breed(a, b, rng)` — per-gene pick-from-either-parent plus bounded
      mutation. The tree walker already exists (`lerpTree`). "Cross a sunflower with a
      passionflower" sells the whole project.
- [ ] **Ripeness / opening.** Bud → open → blown. A morning glory lasts one morning; a
      night-blooming cereus opens in two hours, once. Animate the unfurl.
- [ ] **The silly knobs, turned up.** Already there and already funny: spur to 8×,
      doubling to 400 petals, Seussian helix stems, reflex past 180°. Still to add:
      **peloria** (a real mutant — bilateral reverts to radial; one button, botanically
      legit, deeply weird), **fasciation** (cockscomb: the meristem flattens into a
      ribbon), and **nested capitula** (a head whose florets are themselves heads —
      not real, and we should say so).
- [ ] **Bee vision.** A UV false-colour toggle. *Rudbeckia* has a UV bullseye we can't
      see; wild bees prefer heads with exaggerated guides. Nearly free, genuinely
      educational, and nobody else has it.
- [ ] **Dew.** Real and delightful: droplets **cling** to a rose (the "petal effect" —
      superhydrophobic but *high adhesion*, so they stay put even upside down) and
      **roll straight off** a lotus (the "lotus effect"). Two flowers, opposite physics.

## Known approximations

- **Snapdragon** — the real corolla is a hinged, personate mouth; we fake the look.
- **Morning glory / foxglove** — genuinely sympetalous; approximated with free petals.
- **Bird of paradise** — not attempted. Its fused blue arrow and boat-shaped spathe
  need their own primitives.
- **Wind** doesn't recompute normals, so lighting is very slightly stale on a bending
  petal. Invisible in practice, and much cheaper than the alternative.
