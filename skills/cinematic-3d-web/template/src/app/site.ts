import { cv, portrait, site } from '@/content'

// The site's public address — used for share links, the sitemap and search metadata
export const SITE_URL = site.url.replace(/\/$/, '')

export const FULL_NAME = `${site.firstName} ${site.lastName}`.trim()

// Structured data (schema.org) so search engines know this page is about a person,
// and can tie it to the same person's other profiles
export const PERSON_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: FULL_NAME,
  url: SITE_URL,
  ...(portrait ? { image: `${SITE_URL}${portrait.src}` } : {}),
  jobTitle: site.role,
  description: site.description,
  email: `mailto:${site.email}`,
  address: { '@type': 'PostalAddress', addressLocality: site.location.city, addressCountry: site.location.countryCode },
  knowsAbout: site.knowsAbout,
  sameAs: Object.values(site.socials).map((s) => s.url),
}

export const CV_URLS = cv.files.map((f) => `${SITE_URL}${f.url}`)
