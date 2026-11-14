/* ─────────────────────────────────────────────────────────────────────────────
   Everything personal on the site lives in this one file: names, links, text,
   projects, images. The sections read from here, so editing this file is all it
   takes to make the portfolio yours. Leave a list empty ([]) to hide its section
   or button — achievements, CVs, phone and socials are all optional.
   ───────────────────────────────────────────────────────────────────────────── */

export type Tier = 'gold' | 'silver' | 'bronze' | 'neutral'

/* ── Who you are ── */
export const site = {
  // Public address of the deployed site (used for share cards, sitemap and search data)
  url: 'https://alex-rivera.vercel.app',
  firstName: 'Alex',
  lastName: 'Rivera',
  role: 'Creative Developer',
  // Browser tab title and search-result text
  title: 'Alex Rivera — Creative Developer Portfolio',
  description:
    'Portfolio of Alex Rivera, a creative developer building interactive 3D websites, web apps and motion-driven interfaces.',
  keywords: ['Alex Rivera', 'portfolio', 'creative developer', 'three.js', 'web developer', 'frontend'],
  locale: 'en_US',
  location: {
    label: 'Lisbon, Portugal',
    city: 'Lisbon',
    countryCode: 'PT',
    // IANA time zone, for the live local clock in the contact section
    timeZone: 'Europe/Lisbon',
  },
  email: 'hello@example.com',
  // Set to null to hide the phone card
  phone: { display: '+351 900 000 000', tel: '+351900000000' } as { display: string; tel: string } | null,
  // Remove an entry to hide its contact card
  socials: {
    linkedin: { handle: 'in/alex-rivera', url: 'https://linkedin.com/in/alex-rivera' },
    github: { handle: '@alexrivera', url: 'https://github.com/alexrivera' },
  } as { linkedin?: { handle: string; url: string }; github?: { handle: string; url: string } },
  // Short facts for search engines (schema.org Person)
  knowsAbout: ['Web Development', 'Three.js', 'Creative Coding', 'UI Engineering'],
}

/* ── Hero portrait ──
   A background-removed PNG of you (head and shoulders) in /public. The head turns toward the
   cursor using a depth "rig" measured in the image's own pixels — see the portrait guide in the
   skill (references/portrait-rig.md). Open the site with ?rig in the URL to see the rig drawn
   over the photo while you tune it. Set portrait to null to show a monogram instead. */
export type Ellipse = { cx: number; cy: number; rx: number; ry: number }
export type EyeRig = {
  corners: [number, number] // x of the inner and outer corner (left to right)
  center: [number, number] // iris centre at rest
  lidY: [number, number] // y where the lids meet at each corner
  upper: number // y of the upper lid's control point (smaller = more open)
  lower: number // y of the lower lid's control point
}
export type Portrait = {
  src: string
  alt: string
  width: number // natural pixel size of the PNG
  height: number
  rig: {
    pivot: [number, number] // point the head turns around (roughly between the eyes)
    head: Ellipse // whole head incl. hair
    face: Ellipse // face oval
    nose: Ellipse
    shouldersY: [number, number] // y range where the shoulders start / are fully set back
    eyes?: [EyeRig, EyeRig] // optional: animated eyes that follow the cursor and blink
  }
}

export const portrait: Portrait | null = null

/* ── Hero ── */
export const hero = {
  eyebrow: 'Portfolio',
  heading: ["Hi, I'm", 'Alex'], // one entry per line
  tagline: 'A creative developer turning ideas into interactive, cinematic experiences on the web.',
}

export const nav = [
  { label: 'ABOUT', href: '#about' },
  { label: 'SKILLS', href: '#skills' },
  { label: 'PROJECTS', href: '#projects' },
  { label: 'CONTACT', href: '#contact' },
]

/* ── About: a floating laptop opens while the bio is told in beats ──
   2–4 beats. Each beat's caption blurs in over the 3D scene while the laptop screen shows its
   headline. Words listed in `emphasis` are written in the accent colour (match them exactly,
   punctuation included). */
export const about = {
  eyebrow: 'Who I Am',
  title: 'About me',
  // What the laptop screen shows before the first beat
  screenIntro: { eyebrow: 'About', title: ['HELLO,', "I'M ALEX"] as [string, string], sub: 'Creative developer' },
  beats: [
    {
      text: 'I am a creative developer based in Lisbon, working where design meets engineering',
      emphasis: ['creative'],
      screen: { eyebrow: '01 — Craft', title: ['CREATIVE', 'DEVELOPER'] as [string, string], sub: 'Design × engineering' },
    },
    {
      text: 'with a focus on interactive 3D, motion design and fast, accessible web apps.',
      emphasis: ['3D,', 'motion'],
      screen: { eyebrow: '02 — Focus', title: ['3D · MOTION', 'WEB APPS'] as [string, string], sub: 'Three.js, React, WebGL' },
    },
    {
      text: 'I love turning rough ideas into polished, production-ready products people enjoy using.',
      emphasis: ['production-ready'],
      screen: { eyebrow: '03 — Drive', title: ['SHIP', 'IT.'] as [string, string], sub: 'From sketch to production' },
    },
  ],
  // Up to 3 cards that fly out of the laptop screen
  focusCards: [
    { title: 'Interactive 3D', detail: 'Scenes that react' },
    { title: 'Motion Design', detail: 'Interfaces that feel alive' },
    { title: 'Web Apps', detail: 'Fast and accessible' },
  ],
  // Numbers count up when scrolled into view ("12", "5+", "Top 3" all work)
  stats: [
    { value: '6', label: 'Years Coding' },
    { value: '30+', label: 'Projects Shipped' },
    { value: '12', label: 'Happy Clients' },
    { value: '3', label: 'Awards' },
  ],
}

/* ── Experience: jobs, internships, freelance — a timeline whose glowing line draws itself as you
   scroll, with one card per role. Newest first. Leave items empty ([]) to remove the section. ── */
export const experience = {
  eyebrow: 'Career',
  title: 'Experience',
  items: [
    {
      role: 'Senior Creative Developer',
      company: 'Lumen Studio',
      period: '2023 — Now',
      location: 'Lisbon, Portugal',
      summary: 'Lead developer on interactive campaign sites and WebGL product launches for global brands.',
      highlights: ['Led a team of 4 developers', 'Cut average page load from 4s to 1.5s'],
    },
    {
      role: 'Frontend Developer',
      company: 'Northbeam',
      period: '2020 — 2023',
      location: 'Remote',
      summary: 'Built the design system and dashboard used by 50k+ customers every month.',
      highlights: ['Shipped 40+ reusable components', 'Introduced visual regression testing'],
    },
  ] as { role: string; company: string; period: string; location?: string; summary: string; highlights?: string[] }[],
}

/* ── Skills: one orbit per category around a glowing core ──
   2–8 categories; 3–6 tags each reads best. */
export const skills = {
  eyebrow: 'What I Do',
  title: 'Skills',
  categories: [
    { name: 'Languages', tags: ['TypeScript', 'JavaScript', 'GLSL', 'Python'] },
    { name: 'Frontend', tags: ['React', 'Next.js', 'Tailwind CSS', 'Framer Motion', 'HTML/CSS'] },
    { name: '3D & Motion', tags: ['Three.js', 'React Three Fiber', 'Blender', 'Shaders', 'GSAP'] },
    { name: 'Backend', tags: ['Node.js', 'PostgreSQL', 'Supabase', 'REST APIs'] },
    { name: 'Design', tags: ['Figma', 'Prototyping', 'Design Systems', 'Typography'] },
    { name: 'Tools', tags: ['Git', 'GitHub', 'Docker', 'Vercel', 'CI/CD'] },
  ],
}

/* ── Projects: each logo ignites, its details land, then it burns out into embers ──
   `logo` is a white-on-transparent shape (PNG or SVG) used as a mask, so it carries no colours
   of its own and gets lit by the site's accent. Any field marked optional can be left out. */
export const projects = {
  eyebrow: 'Selected Work',
  title: 'Projects',
  items: [
    {
      name: 'Nebula Studio',
      description: 'A browser-based 3D scene editor with real-time collaboration and one-click publishing.',
      stack: ['React', 'Three.js', 'WebRTC'],
      award: 'Featured', // optional badge
      tier: 'gold' as Tier, // colour of the badge and light: gold, silver, bronze or neutral
      logo: '/projects/nebula.svg',
      repo: 'https://github.com/alexrivera/nebula-studio', // optional "View code" button
      live: 'https://example.com', // optional "Visit site" button
    },
    {
      name: 'Pulse Analytics',
      description: 'Real-time analytics dashboard with animated charts and a natural-language query bar.',
      stack: ['Next.js', 'Supabase', 'D3'],
      award: 'Hackathon Winner',
      tier: 'silver' as Tier,
      logo: '/projects/pulse.svg',
      repo: 'https://github.com/alexrivera/pulse',
      // demo: 'abc123XYZ', // optional YouTube video id (the part after watch?v=): adds a "Watch demo" button
    },
    {
      name: 'Orbit UI',
      description: 'An open-source library of motion-first React components used by thousands of developers.',
      stack: ['TypeScript', 'Framer Motion', 'Storybook'],
      tier: 'neutral' as Tier,
      logo: '/projects/orbit.svg',
      repo: 'https://github.com/alexrivera/orbit-ui',
    },
  ] as {
    name: string
    description: string
    stack: string[]
    award?: string
    tier: Tier
    logo: string
    repo?: string
    live?: string
    demo?: string
  }[],
}

/* ── Achievements: a black hole swallows the title, then the camera dives through one gate per
   result. Leave items empty ([]) to remove the whole section. */
export const achievements = {
  eyebrow: 'Milestones',
  title: 'Achievements',
  items: [
    {
      title: 'Global Game Jam',
      location: 'Lisbon, Portugal',
      result: '1st Prize',
      mark: '1st', // big outlined text on the card
      year: '2025',
      project: 'Nebula Studio',
      tier: 'gold' as Tier,
    },
    {
      title: 'Awwwards Honourable Mention',
      location: 'Online',
      result: 'Honourable Mention',
      mark: 'HM',
      year: '2024',
      project: 'Orbit UI',
      tier: 'silver' as Tier,
    },
    {
      title: 'Web Summit Hackathon',
      location: 'Lisbon, Portugal',
      result: '3rd Place',
      mark: '3rd',
      year: '2024',
      project: 'Pulse Analytics',
      tier: 'bronze' as Tier,
    },
  ] as { title: string; location: string; result: string; mark: string; year: string; project: string; tier: Tier }[],
}

/* ── Contact ── */
export const contact = {
  eyebrow: 'Get In Touch',
  headline: ["Let's", 'build', 'something', 'together.'], // last word gets the accent
  blurb: 'Open for freelance projects, full-time roles and creative collaborations. Feel free to reach out!',
  form: {
    intro: 'Tell me what you have in mind — a project, a role or just an idea.',
    topics: ['Project', 'Job Opportunity', 'Collaboration', 'Just saying hi'],
    messagePlaceholder: "Hi Alex, I'd love to talk about…",
  },
}

/* ── CV / résumé: PDFs in /public/cv. Leave the list empty to hide every CV button. ──
   `preview` is an optional image of the first page. */
export const cv = {
  updated: 'Jan 2026',
  files: [] as { code: string; language: string; url: string; filename: string; preview?: string }[],
  // Example: { code: 'en', language: 'English', url: '/cv/Alex-Rivera-CV.pdf', filename: 'Alex-Rivera-CV.pdf', preview: '/cv/preview-en.png' }
}
