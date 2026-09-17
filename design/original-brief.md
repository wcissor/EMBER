# CLAUDE DESIGN PROMPT — Siruply (prescription verification for pharmacies)

**Before sending:** paste everything from `=== PROMPT START ===` into Claude Design. Nothing to fill in — but if you already have a wordmark or brand colour for Siruply, attach it, otherwise the designer will propose one.

---

=== PROMPT START ===

Design the interface for **Siruply** — a tool for pharmacies in Azerbaijan. A pharmacist photographs a doctor's handwritten prescription and gets a structured transcription beside the image: medication name, strength, dosage form, quantity, directions. They check it, resolve anything uncertain, and confirm.

The customer is the pharmacy, not the patient. The owner or chain buys it; the pharmacist behind the counter uses it. The patient never sees this interface.

---

## THE RULE THAT DECIDES EVERY DESIGN CHOICE

**A plausible medicine or a common dose must never silently replace illegible handwriting.**

Two models read the prescription independently. Where they agree, the field is settled. Where they disagree, or where the handwriting is genuinely unreadable, the field is flagged and a human decides. The interface exists to make that boundary visible at a glance: the pharmacist must always know what is settled and what is waiting on them.

Hard consequences, all of them non-negotiable:

1. **A flagged field cannot be skipped.** The complete button stays inactive while any decision is open.
2. **On disagreement, both readings are shown with identical visual weight.** No preselection, no ranking, no "recommended", no model names, and **no confidence percentages** — a number is a ranking and will be read as permission to accept.
3. **"Illegible — check with the doctor" is a valid outcome, not a failure.** It sits at the same level as confirming, in the same place, in the same neutral treatment. Never red, never behind a menu, never worded as an error.
4. **Catalogue hints annotate, they never answer.** A registry suggestion must read unmistakably as a note attached to a field, never as a filled value.

If any screen you design lets a tired person at 7pm accept an unverified field by tapping through, the design has failed regardless of how it looks.

---

## SIGNATURE CONCEPT — THE EVIDENCE STRIP

One idea carries this product. Spend your effort here.

On a phone there is no room for a real side-by-side of photo and fields, but cross-referencing the image is mandatory. So: the fields are the main column, and a **pinned evidence strip** sits above them showing the zoomed crop of the photo for whichever field is currently focused. Change field, the crop slides to that part of the handwriting. The pharmacist's eye never has to hunt.

- Tap the strip → full photo, pinch-zoomable, with the active field's region outlined.
- The strip has a brightness/contrast boost control. Counter photos are dim and glared; let them fix that in one tap without retaking.
- On tablet landscape the strip becomes a real left pane with the full photo, same linked highlighting.

This linkage is the product. Everything else stays quiet around it.

---

## FIELD STATES — design all six, each distinguishable without colour

Glare and colour-blindness both break colour-only status. Every state needs a distinct glyph, a text label in the interface language, and a distinct position/structure. Colour reinforces, never carries.

1. **Agreed by both readings** — one tap to accept. This is the only state that may show as settled, and it may not render until the second reading has landed.
2. **Disagreement** — two readings, equal weight, neither preselected, plus a third equal option: enter my own. Stable neutral ordering (not by model, not by any score); state which rule you used.
3. **Illegible** — a choice between typing it manually and marking "check with the doctor". Both equally easy.
4. **Not written in the prescription** — a separate state, never conflated with illegible. One tap to confirm as absent.
5. **Catalogue flag: not in the registry** — the name isn't in the medicines register.
6. **Catalogue flag: look-alike** — the name is close to a different medicine with a different active ingredient. This is the most dangerous state in the product. Design it so the difference in active ingredient is the thing the eye lands on, not the similar spelling.

---

## PROGRESSIVE LOADING — the hardest problem here

The photo appears instantly. Then the fast reading arrives and fills the form so the pharmacist can already start reading. The second reading follows and sets the flags.

Design this so a partial result can never be mistaken for a finished one:

- No field shows as settled while the second reading is outstanding. The settled state is structurally unavailable, not merely un-styled.
- The complete button is not just disabled during this window — it is replaced by a plain statement of what is still happening, in words and counts, not a spinner. Something with the shape of "Second reading: 4 of 7 fields".
- Fields still awaiting the second reading carry a visible rail or marker that disappears only when the reading lands.
- No skeleton shimmer. Shimmer reads as decoration and it is exactly the wrong signal here.

---

## SCREENS

**1 · Capture.** Camera with a frame guide. Live warnings for blur, glare, and cropped edges — specific, not "photo is bad". Retake offered before processing, not after. Include the state where the photo is acceptable but marginal.

**2 · Verify.** The main screen, the one that matters. Evidence strip, field list with states, disagreement resolution, catalogue annotations, completion control. Design it in every meaningful configuration: all agreed; one disagreement; multiple flags open; a look-alike warning; everything resolved and ready to complete; and mid-loading.

**3 · Archive.** Confirmed prescriptions for the current branch. Search by active ingredient, date, and number. Photo and transcription open together — never one without the other. Records that ended in "check with the doctor" appear as a normal, unashamed outcome in the list.

**4 · Sign-in and branch selection.** Who verified is recorded, so identity matters. The counter device is shared across a shift: design a fast user switch that doesn't require a full sign-out, with the current user always visible on the verify screen.

**Roles:** pharmacist — capture, verify, own branch archive. Manager — the same plus other branches. A pharmacist never sees another branch.

---

## ENVIRONMENT — design for it literally

- Pharmacy counter. Someone is standing there waiting. Speed is the product; anything that lengthens verification destroys its value.
- One hand, phone or tablet, often glare and bad light. Primary actions in the bottom third. Large targets, generous spacing between anything confirmable and anything destructive.
- **Light theme first, very high contrast.** Body text at 7:1 or better, no mid-grey labels, no low-contrast placeholder text, no white text over photographs. This is a daylight tool; the dark cinematic direction that suits consumer products is wrong here and would cost legibility. If you propose a dark mode, it's for night shifts only and it is not the default.
- Type: minimum 16px body, medicine names and doses larger and heavier than everything else on screen. Numbers in a face where 1/7, 0/O, and 5/S are unmistakable — dosage errors start in typography.
- Interface languages: **Azerbaijani and Russian**. Every typeface you choose must carry the full Azerbaijani Latin set (ə, ğ, ı, İ, ö, ş, ü) and Cyrillic. Verify this, don't assume it.
- Prescriptions themselves mix Latin, Cyrillic, Latin drug names, and handwritten abbreviations. Field values must render all of that in one line without fallback-font jumps.

---

## MICROCOPY

Produce every string in Russian and Azerbaijani. Show Russian in the main frames, and produce an Azerbaijani version of the Verify screen to prove the layout survives longer strings. Mark the Azerbaijani for native review before build — don't present it as final.

Voice: a work tool under time pressure. Plain, operational, no apology, no reassurance. Never the word "AI" at field level, never "we think", never "probably".

Russian reference strings to set the register:

- Disagreement: `Два прочтения разошлись` / option footer: `Ввести своё`
- Illegible: `Не разобрать` → actions `Ввести вручную` · `Уточнить у врача`
- Absent: `В рецепте не указано`
- Registry: `Нет в реестре` · look-alike: `Похоже на {X} — другое действующее вещество`
- Loading: `Второе прочтение: 4 из 7 полей`
- Completion blocked: `Осталось решений: 2`

---

## DO NOT DESIGN

Substitutes or analogues · stock levels · prices · margin · sales reports · demand analytics · insurance calculations · anything patient-facing · drug interaction checking · batch processing of several prescriptions in a row. None of it is part of this product. Don't add it "for completeness".

Also avoid: illustrations, mascots, empty-state artwork, sparkle or "magic" iconography, gradient chrome, confidence meters, progress rings, and any visual language borrowed from consumer AI products. This sits next to a cash register in a pharmacy.

---

## DELIVERABLES

1. **Tokens page** — palette (4–6 named values), type scale with the numeral treatment called out, spacing, radii, contrast ratios stated per pair.
2. **Component sheet, all states** — field row in all six states, dual-reading resolver, catalogue annotation, evidence strip, boost control, capture warnings, completion bar, user chip, archive row.
3. **Frames** — phone 390×844 for every screen and every Verify configuration listed above; tablet 1024×768 landscape for Capture, Verify, and Archive.
4. **One Azerbaijani Verify frame** at the longest plausible string lengths.
5. **A short written rationale** — three paragraphs, no more: how the photo/field relationship works on a phone, how you kept the two readings unranked, and how you made a partial result impossible to mistake for a finished one.
6. **One clickable prototype** of the Verify screen: field focus moving the evidence crop, resolving a disagreement, marking a field for the doctor, and the completion control unlocking only when nothing is open.

## ACCEPTANCE CHECKLIST

- [ ] No path exists that completes a prescription with an unresolved field.
- [ ] Cover the two readings' labels and neither looks preferred.
- [ ] "Check with the doctor" is reachable in the same number of taps as confirming.
- [ ] Every field state is identifiable in greyscale.
- [ ] A settled state cannot appear before the second reading lands.
- [ ] A catalogue hint can't be mistaken for a value.
- [ ] "Not in the prescription" and "illegible" can never be confused.
- [ ] Every screen is operable one-handed with the actions in the bottom third.
- [ ] Nothing on screen is decoration.

**Before you build:** write the compact design plan first — tokens, the Verify layout concept with ASCII wireframes, and how the evidence strip behaves. Review it against this brief, name anything that reads as a generic default rather than a choice made for a pharmacy counter, revise it, then design.

=== PROMPT END ===
