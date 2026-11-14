# Building a portfolio from the template

The template (`template/`) is a complete, production-tested portfolio: the author's real site
(rayenchatti.vercel.app) with every personal detail moved into `src/content.ts`. Use it when
someone wants a portfolio and is happy with its scenes (or wants them as a starting point to
change). For new or different scenes, follow the scene workflow in SKILL.md instead or as well
— the template is ordinary code, and new scenes slot into it with `scripts/new-scene.mjs`.

## 1. Gather the content

Ask for everything in one go rather than drip-feeding questions — people answer faster when they
can see the whole list. If they have a CV, LinkedIn export or an existing site, offer to pull the
content from that instead, and only ask for what's missing. If you can't ask (a one-shot request,
an automated run), work from what you were given and list every assumption at the end.

Needed:
- Full name, role/title (e.g. "Frontend Developer"), city and country
- A short bio (Claude splits it into 2–4 beats) and 3 focus areas
- Work history, if they have any: role, company, dates, one-line summary, 1–3 highlights. It goes
  in the Experience timeline — don't drop it just because it doesn't fit the bio.
- 4 stats (years, projects, clients, awards — anything countable)
- Skills grouped into 2–8 categories
- Projects: name, one-sentence description, 2–4 technologies, links (code / live / YouTube demo),
  logo, optional award badge
- Contact email; optional phone, LinkedIn, GitHub
- Accent colour (any colour; default is red)

Optional — the site works without them:
- Work history. With none, the Experience section is removed.
- Achievements (hackathons, awards, certifications). With none, the black-hole section is removed
  and its code isn't downloaded by visitors.
- A photo for the hero. Without one, the hero shows the person's initials.
- CV/résumé PDFs. Without them, the CV buttons disappear.
- The final web address (can be set after the first deploy).

## 2. Create the project

```bash
node <skill-dir>/scripts/create-portfolio.mjs <destination-folder>
cd <destination-folder>
npm install
```

Requires Node.js 20.9+. The script refuses non-empty folders so it can't overwrite anything.

## 3. Fill in `src/content.ts`

This is the only file that needs to change for a normal portfolio. Read
`references/content-guide.md` before writing it — it lists the length limits that keep each
scene looking right (the laptop screen headline, for example, is drawn on a canvas and only fits
about ten capital letters per line; achievement "marks" are shown huge and need to be ≤5
characters).

Write the person's real content in their voice. Keep the bio beats roughly equal in length,
because each beat gets an equal share of the scroll; a very long beat flashes past.

Some fields are design copy rather than facts (laptop-screen headlines, focus-card taglines,
section eyebrows) — write those freely. But never invent facts about the person: no stats,
awards, results, clients or numbers they didn't give you. If the template wants four stats and
you only have three real ones, use a true countable thing from their material (languages
spoken, open-source repos, technologies) or ask; and mention anything you had to choose. An
award that isn't tied to a project can say "—" or the event's theme in `project`.

Every list can grow or shrink: the scroll length, camera paths, ring tilts and progress rails are
all computed from the number of items. Empty `achievements.items`, `cv.files` or a `null`
`portrait` / `phone` hide their parts of the page cleanly.

## 4. Add images

- **Project logos** go in `public/projects/`. Any logo with a transparent background works, PNG or
  SVG: it's used as a CSS mask, so only its shape matters and the site's accent colour lights it.
  A logo on a solid background (a white JPG, for example) will show as a filled rectangle — remove
  the background first. If the person has no logo, make a simple SVG mark from their initials or a
  geometric shape, like the three placeholders.
- **Portrait** (optional): a head-and-shoulders PNG with the background removed, roughly square,
  500–900px wide. Then follow `references/portrait-rig.md` to measure the rig — it takes a few
  minutes and is what makes the head turn and the eyes follow the cursor. Always check the
  result with `?rig` added to the URL.
- **CVs** (optional): PDFs in `public/cv/`, plus an optional first-page preview image.

Delete the placeholder logos once real ones are in.

## 5. Recolour

```bash
node scripts/retheme.mjs . --accent "#3B82F6"
```

(The new project gets its own copy of the script in `scripts/`, so the colour can be changed
later without the skill.)

The accent is a family of ~16 related shades (glows, deep shadows, hot ember highlights) spread
over Tailwind classes, inline styles, canvas drawings and shaders. The script moves the whole
family together: the main accent becomes exactly the colour given, and every other shade keeps
its relationship to it (same hue shift, proportional saturation and lightness), which is what
keeps the design's lighting believable — hand-editing a few hex codes leaves stray reds behind.
It records the current theme in `theme.json`, so it can be run again to try another colour.

- If the person names a colour family rather than a shade ("green"), pick a mid-tone, vivid
  shade — the glows look best with an accent around 50–65% lightness.
- `--keep-brightness` takes only the hue and keeps the template's neon-bright glow, for people
  who want "the same look, but blue".
- Very dark, very light or greyish accents lose the glow; the script warns about these.

## 6. Check it in a browser

Run `npm run build` first — it type-checks `content.ts`, so a missing field or a typo fails fast.
Then `npm run dev` and look at every section, not just the hero. The pinned scenes only show
their content part-way through their scroll, so jump through them, e.g. in the browser console:

```js
go = (id, f) => { const el = document.getElementById(id); scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * f) }
go('about', 0.3); go('skills', 0.3); go('projects', 0.45); go('achievements', 0.4)
```

Look for text overflowing the laptop screen or the cards, long project names wrapping badly, and
the portrait rig. Also check a phone-sized viewport (375×812) — the layouts change there. The
scenes animate in over a moment, so wait a second or two before judging a screenshot. If you
have no browser tool, say plainly that the site was built but not looked at.

## 7. Contact form and deploy

- The contact form emails the person directly through Web3Forms (free). They create an access key
  at https://web3forms.com for their email, then set `NEXT_PUBLIC_WEB3FORMS_KEY` in `.env.local`
  and in the hosting provider's environment settings. Until then, "Send" opens the visitor's
  email app with the message filled in, so the form is never broken.
- Deploy on Vercel: push to GitHub, import the repo at vercel.com/new, keep the detected Next.js
  settings. Then put the final address in `site.url` (it feeds the share card, sitemap and
  search data) and push again.
- The share-card image is generated from `content.ts` (`src/app/opengraph-image.tsx`). To use a
  designed image instead, delete that file and add `src/app/opengraph-image.jpg` (1200×630).

## Changing more than the content

The template is ordinary Next.js code, so anything can be changed. Things people commonly ask for:

- **Remove or reorder a section**: edit `src/app/page.tsx`. Sections are independent, with one
  coupling: the achievements black hole and the contact section share the background warp
  (`components/blackHole.ts`). The contact section already skips its part when there are no
  achievements; keep achievements directly before contact if both stay.
- **Nav links**: `nav` in `content.ts` — keep each `href` pointing at a section `id`.
- **Fonts**: Kanit is set in `src/app/layout.tsx`; the display pair used in the 3D scenes is in
  `components/fonts.ts`.
- **Background**: the `<ColorBends>` props in `layout.tsx` control speed, warp and band width.
- **A section's look or timing**: read the matching entry in `references/effects.md` first — it
  explains how each scene's timeline is laid out, so a change in one place doesn't desynchronise
  the 3D camera from the text.

Every scene has a `prefers-reduced-motion` fallback (a static layout). When changing a scene,
keep its fallback in step, and test with reduced motion turned on in the OS or browser devtools.
