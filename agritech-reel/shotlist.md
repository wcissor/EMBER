# Shot list

Every shot is real footage or real satellite imagery. Anything drawn on top is a diagram, and where it shows a machine we can't film, it is labelled "illustration".
Each shot stays on screen for 1.2–2 s.

**Total cost: $0.** All 17 Adobe Stock clips are in Adobe Stock's free collection: the search marks each one "free" and not made with generative AI. The satellite imagery is free (NASA and Copernicus).

**Licensed:** all 17 clips, on 16 Nov 2026, through the Adobe connector, at $0. The records are in `licenses/adobe-stock/`. 14 are in the reel; the 3 alternatives are not used.

**Preview:**
- `shotlist-contact-sheet.jpg` shows one frame of every pick.
- Each ID below links to an Adobe Stock search for that clip, where it plays.

A horizontal 4K clip still fills the vertical frame at full sharpness: a 9:16 crop of it is 1215×2160 pixels, more than the 1080×1920 the reel needs.

## Clips

| Line | Code | Adobe Stock ID | What it shows | Format | Price | Role |
|---|---|---|---|---|---|---|
| H1 | H1-a | [820742732](https://stock.adobe.com/search?k=820742732) | Vertical farm racks under LED lights | vertical 4K | $0 | pick |
| H1 | H1-c | [469320194](https://stock.adobe.com/search?k=469320194) | Hydroponic lettuce channels | 4K | $0 | pick, second shot |
| B1 | B1-a | [710929741](https://stock.adobe.com/search?k=710929741) | Flying low over wheat at sunset | vertical HD | $0 | pick |
| B1b | B1-b | [788101373](https://stock.adobe.com/search?k=788101373) | Tractor from directly above, at sunset | vertical 4K | $0 | pick |
| B8 | B1-c | [1527068097](https://stock.adobe.com/search?k=1527068097) | Golden fields at sunset | 4K | $0 | pick |
| B2, H2 | B2-a | [275600505](https://stock.adobe.com/search?k=275600505) | Crop rows from the air | 4K | $0 | pick |
| B2, H2 | B2-b | [566524463](https://stock.adobe.com/search?k=566524463) | Young corn rows at ground level | vertical HD | $0 | pick |
| B2 | B2-c | [179491109](https://stock.adobe.com/search?k=179491109) | Soybean rows from the air | 4K | $0 | alternative |
| B3 | B3-a | [608684392](https://stock.adobe.com/search?k=608684392) | Spray drone over corn | 4K | $0 | pick |
| B3 | B3-d | [488053406](https://stock.adobe.com/search?k=488053406) | Farmer flying a spray drone | 4K | $0 | pick, second shot |
| B3 | B3-b | [375274226](https://stock.adobe.com/search?k=375274226) | Low flight over rice fields | 4K | $0 | alternative |
| B4, H3 | B4-a | [247370608](https://stock.adobe.com/search?k=247370608) | Herd on pasture in **New Zealand**, from a drone | 4K | $0 | pick |
| B4, B4s | B4-b | [841343330](https://stock.adobe.com/search?k=841343330) | One cow grazing, close-up, slow motion | vertical 4K | $0 | pick (collar drawing) |
| B4, B4s | B4-c | [293665831](https://stock.adobe.com/search?k=293665831) | Herd from directly above | 4K | $0 | pick (dotted fence) |
| B6 | B6-a | [368399272](https://stock.adobe.com/search?k=368399272) | Sprinklers over young corn | 4K | $0 | pick |
| B6 | B6-b | [781897184](https://stock.adobe.com/search?k=781897184) | Rain-cannon irrigation, aerial | vertical 4K | $0 | pick |
| B6 | B6-c | [867071605](https://stock.adobe.com/search?k=867071605) | Drip irrigation close-up | vertical HD | $0 | alternative |

**Rejected:**
- 429651436: looks like a 3D render.
- 211286407: a tractor sprayer, not a drone.
- 489888619: a small camera drone, not a farm drone.
- 518206688: a strong lens flare.
- Adobe Stock has no Azerbaijani farmland footage: searches for "Azerbaijan farmland" and "Azerbaijan" return only Baku landmarks, flags and maps. B7 uses real satellite imagery instead.

## Satellite (B5, B7)

- **From orbit:**
  - NASA Blue Marble imagery (NASA GIBS) of the Caucasus and the Caspian.
  - Credit: "Imagery: NASA".
- **Fields:**
  - A real Sentinel-2 true-colour image of the Kura–Araz lowland near Saatlı, at 10 m per pixel.
  - Scene `S2A_39TTE_20260723`: 23 July 2026, 0.02% cloud. Preview: `research/satellite/s2-20260723-saatli-12km.jpg` (12 km across).
  - Credit: "Contains modified Copernicus Sentinel data 2026".
- **The zoom:**
  - One continuous push-in from orbit to the fields.
  - The Blue Marble hands over to Sentinel-2 where its detail runs out.
- **B5:** a thin olive frame closes on one field, like a photo being taken. There is no flash.
- **B7:** the zoom lands on Azerbaijan, with its border as a thin olive outline. The border comes from Natural Earth map data, which is public domain.

## Drawn on top

- **Laser weeder (B2, H2):**
  - Olive crosshairs lock onto weeds between real crop rows, with tiny laser ticks, labelled "illustration".
  - No robot is shown unless Carbon Robotics allows its press footage.
- **Collars (B4, B4s, H3):**
  - A line-drawn collar on the real cow, labelled "illustration", with small sound and vibration marks.
  - A dotted virtual fence drawn on the real herd.
- **Numbers:** counters land exactly on the sourced number, each with a mono source tag (see `sources.md`).

## As built (16 Nov 2026)

What each line shows in the finished reel, with each shot's length in seconds (English / Azerbaijani).
No shot runs longer than 2.5 s except the closing question. `python3 scripts/shots.py` recomputes the lengths from the cut rules in `src/scenes.tsx`.

| Line | Shots |
|---|---|
| H1 | H1-a racks (1.6 / 1.7) → H1-c lettuce channels (1.5 / 1.6) → H1-a racks, lights out (1.9 / 2.2) |
| H2 | B2-a rows (1.1 / 1.2) → B2-a punch-in (1.8 / 1.1) → B2-a rows (1.8 / 1.4) |
| H3 | B4-a2 NZ herd (1.5 / 1.8) → B4-a1 NZ herd (1.4 / 1.3) |
| B1 | B1-a wheat (1.1 / 0.8) → B1-a punch-in (1.8 / 1.5) |
| B1b | B1-b tractor from above (1.1 / 2.0) → B1-a wheat at sunset (2.0 / 2.3) |
| B2 | B2-a rows (1.1 / 1.4) → B2-a punch-in, detections (1.6 / 2.0) → B2-b corn, crosshairs (1.8 / 1.4) → B2-a rows, 10,000 (1.8 / 1.6) → B2-a punch-in (1.0 / 0.8) |
| B3 | B3-a spray drone (1.5 / 1.1) → B3-d pilot and drone (2.3 / 2.3) |
| B4 | B4-a1 NZ herd (1.5 / 1.6) → B4-b cow, collar inset (1.6 / 1.7) → B4-b punch-in, sound (1.9 / 2.1) → B4-c herd from above, fence (1.4 / 1.7) |
| B4s | B4-b cow, collar inset (1.7 / 2.3) → B4-b punch-in, sound (1.9 / 2.1) → B4-c herd from above, fence (1.4 / 1.2) |
| B5 | globe, orbit diagram (1.9 / 2.3) → Sentinel-2 Kansas, capture frame (2.2 / 1.9) → Sentinel-2 Kansas, punch-in (1.4 / 0.5) |
| B6 | B6-a sprinklers (1.1 / 2.2) → B6-b rain cannon (1.9 / 1.9) → B6-b punch-in (1.5 / 1.2) |
| B7 | map zoom to Azerbaijan (1.7 / 2.1) → Sentinel-2 Kura-Araz (2.5 / 1.6) → Sentinel-2 Kura-Araz, punch-in (1.7 / 2.1) |
| B8 | B1-c golden field, the question (3.4 / 3.1) |

**Changes from the plan below:**
- **B5** shows centre-pivot fields in Kansas (Sentinel-2, 2 Aug 2026), after a turning NASA globe with Sentinel-2's orbit drawn as a labelled diagram. The Kura–Araz image is used in B7 only.
- **B4, B4s:** the collar is a line drawing in a dark round inset, linked to the cow's neck. A drawing straight on the white fur didn't read.
- **H2** uses three B2-a shots, dimmed under the "10,000 a minute" number, instead of opening on B2-b.
- **B2** punches in on the field as the detection boxes appear ("spots weeds"), which keeps every shot under 2.5 s.

## Shots per variant (the plan at Checkpoint 2)

### Variant A: H1, B1, B2, B3, B4, B5, B6, B7, B8 (about 42 s)

| Line | Shots (seconds) |
|---|---|
| H1 | H1-a racks (1.6) → H1-c channels as the lights cut out: "Nearly $1B raised. Filed for bankruptcy." (2.0) |
| B1 | B1-a low over wheat: "OUTSIDE." (1.8) |
| B2 | B2-a rows as the crosshairs lock (1.8) → B2-b laser ticks, "illustration" (1.6) → B2-a: "10,000 / min · maker's figure" (2.0) |
| B3 | B3-a spray drone (1.6) → B3-d drone and pilot: "300,000+" (1.8) |
| B4 | B4-a New Zealand herd (1.6) → B4-b collar drawing (1.8) → B4-c dotted fence (1.8) |
| B5 | Push-in from orbit (2.0) → Sentinel-2 fields as the frame closes on one field: "Every 5 days · free" (2.0) |
| B6 | B6-a sprinklers (1.6) → B6-b rain cannon: "≈70%" (2.0) |
| B7 | The zoom lands on Azerbaijan with the olive outline (2.0) → Kura–Araz fields: "36% of workers" (2.0) |
| B8 | B1-c golden fields at dusk with the question (about 3) → cut to the first frame |

### Variant B: H2, B1b, B3, B4, B5, B6, B7, B8

| Line | Shots |
|---|---|
| H2 | B2-b, with laser ticks and "10,000 / min · maker's figure" already in the first frame → B2-a as the crosshairs lock |
| B1b | B1-b tractor from above |
| B3–B8 | As in variant A |

### Variant C: H3, B4s, B1b, B2, B3, B5, B6, B7, B8

| Line | Shots |
|---|---|
| H3 | B4-a, with the dotted fence drawing itself across the pasture in the first frame |
| B4s | B4-b collar drawing → B4-c dotted fence |
| B1b | B1-b tractor from above |
| B2, B3, B5–B8 | As in variant A |

The Azerbaijani versions use the same pictures, with Azerbaijani captions and number formats.
