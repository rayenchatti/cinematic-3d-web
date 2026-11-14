# content.ts field guide

Every field of `template/src/content.ts`, what it drives on the page, and the limits that keep
each scene looking right. Limits are soft — going over usually means wrapping or shrinking, not
breaking — but the scenes were designed around them.

## site

| Field | Shows up | Notes |
|---|---|---|
| `url` | share card, sitemap, search data | Final deployed address, no trailing slash. Placeholder is fine until the first deploy. |
| `firstName`, `lastName` | hero monogram, laptop screen, footer wordmark, copyright | The footer wordmark is huge: outlined first name, solid last name. Very long names shrink with the viewport (they're `vw`-sized) — check a phone width. |
| `role` | share card, search data | "Frontend Developer", "3D Artist", … |
| `title`, `description` | browser tab, Google result, link previews | Description ≈ 150 characters. |
| `keywords` | meta keywords | Include name variants. |
| `locale` | `<html lang>`, Open Graph | `en_US`, `fr_FR`, … |
| `location.label` | contact card | What people read: "Berlin, Germany". |
| `location.city`, `countryCode` | search data | ISO country code (`DE`). |
| `location.timeZone` | live clock on the contact card | IANA name: `Europe/Berlin`, `America/New_York`, `Asia/Tokyo`. A wrong name crashes the page at build time — check it. |
| `email` | contact card, copy button, form fallback | |
| `phone` | contact card | `null` hides it. `tel` has no spaces. |
| `socials.linkedin`, `socials.github` | contact cards, search data | Delete a key to hide its card. An odd number of cards is handled (the last one spans the row). |
| `knowsAbout` | search data | 3–6 topics. |

## portrait

`null` → initials monogram in the hero and on the laptop screen. Otherwise see
`portrait-rig.md`. `width`/`height` must be the PNG's real pixel size: the rig is measured in
those pixels.

## hero

- `eyebrow` — tiny label above the name ("Portfolio").
- `heading` — one string per line, each letter rises out of a mask. Two short lines read best:
  `["Hi, I'm", 'Sam']`. More than ~10 characters per line gets very wide on desktop.
- `tagline` — one sentence, ≤ 110 characters.

## nav

Up to 4 links fit on a phone. Each `href` is a section id: `#about`, `#experience`, `#skills`,
`#projects`, `#achievements`, `#contact`. Don't link to a section whose list is empty.

## about

The section pins for 4 screen-heights while a laptop floats in 3D: the lid opens, each bio beat
blurs in as a caption over the scene while the laptop screen swaps its headline, the focus cards
fly out of the screen, embers rise, the lid closes.

- `beats` — 2 to 4. Each one is a caption of ≤ 130 characters; keep them roughly equal, since each
  gets an equal slice of scroll. Read together, the beats are one continuous bio (the reduced
  motion fallback joins them into a paragraph), so beats 2+ can start mid-sentence.
- `beats[].emphasis` — words drawn in the accent colour and italic. Each entry is a word or a
  phrase (`'clean APIs'` highlights both words). Match the words in `text` exactly, punctuation
  included (`'Cybersecurity.'`, not `'Cybersecurity'`).
- `beats[].screen` and `screenIntro` — what the laptop screen shows. `title` is two lines drawn
  at 84px on a canvas; anything wider than ~10 capital letters is shrunk to fit, so short words
  look best ("SHIP" / "IT."). `eyebrow` ≤ 20 characters, `sub` ≤ 45.
- `focusCards` — up to 3 (extra ones are ignored: there are three flight paths). Title ≤ 16
  characters, detail ≤ 28.
- `stats` — 4 tiles in a row on desktop, 2×2 on phones. `value` counts up from 0 if it contains
  one number ("12", "30+", "Top 3"); otherwise it's shown as is. `label` ≤ 20 characters.

## experience

A vertical timeline under the About section: a glowing line draws itself as you scroll and each
role's card slides in from alternating sides. Not pinned, so any number of roles works.

- `items: []` removes the section. Newest first.
- `role` ≤ 40 characters, `company`, `period` (free text: "2021 — 2023", "Summer 2024"),
  optional `location`.
- `summary` — one sentence of what the job was. `highlights` — 0–3 short results ("Led a team
  of 4", "Cut load time from 6s to 1.2s"). Take these from the person's material; don't invent
  numbers.
- Internships, freelance work and volunteering all fit here.

## skills

Pinned scene: one tilted orbit per category around a glowing core. The camera swings to face
each ring in turn while its caption and tag list blur in.

- `categories` — 2 to 8 (scroll length grows with the count). 3–6 tags each; the lit ring places
  its tags as labels around the circle, so 8+ tags crowd.
- `name` ≤ 18 characters (shown big, wraps at ~16).

## projects

Pinned "forge": each project's logo forms in the centre with a hot sweep, slides to its column
while the details land one by one, then (except the last) burns out into embers.

- `name` ≤ 22 characters. `description` one or two sentences, ≤ 160 characters.
- `stack` 2–4 short tags.
- `award` optional badge text ("1st Prize", "Featured"); `tier` colours the badge and the light
  line: `gold`, `silver`, `bronze`, `neutral`. Use `neutral` for projects without an award.
- `logo` path in `/public` — transparent background required (it's a mask).
- `repo`, `live`, `demo` — each optional, each adds a button. `demo` is a YouTube video id (the
  part after `watch?v=`); it plays in a pop-up.
- 2–6 projects works best; each adds one screen of scroll.

## achievements

Pinned portal: a black hole tears open, swallows the section title letter by letter while warping
the page background, then the camera dives through a tunnel with one gate per achievement.

- `items: []` removes the whole section (and its background warp).
- `mark` — shown huge in outline: ≤ 5 characters ("1st", "Top 5", "HM", "2025").
- `title` ≤ 40 characters. `result` ≤ 22. `project` is free text ("VeritasLearn", "CTF").
- `tier` colours that gate and its rail tick.

## contact

- `headline` — words that fill in from an outline as you scroll; the last one is in the accent.
  3–5 words.
- `blurb` — one or two sentences.
- `form.topics` — 3–5 chips. `form.messagePlaceholder` usually addresses the owner by first name.

## cv

- `files: []` hides every CV button and the CV card.
- Each file: `code` (badge text, e.g. `en`), `language` (card title), `url` and `filename`
  (in `/public/cv/`), optional `preview` image of the first page (portrait aspect, ~600px wide).
- `updated` is shown in the CV pop-up header.
