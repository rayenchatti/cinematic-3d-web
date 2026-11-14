import type { MetadataRoute } from 'next'
import { CV_URLS, SITE_URL } from './site'

// Served as /sitemap.xml — the site is one page, plus any CVs so they can be found too
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'monthly', priority: 1 },
    ...CV_URLS.map((url) => ({ url, changeFrequency: 'yearly' as const, priority: 0.5 })),
  ]
}
