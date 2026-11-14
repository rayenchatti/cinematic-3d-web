import { ImageResponse } from 'next/og'
import { site } from '@/content'

// Social share card (the preview shown when the link is posted), drawn at build time from content.ts.
// To use a designed image instead, delete this file and add app/opengraph-image.jpg (1200×630).
export const alt = `${site.firstName} ${site.lastName} — ${site.role}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          background: 'radial-gradient(circle at 78% 40%, #B00000 0%, #3D0000 38%, #03010A 75%)',
          color: '#D7E2EA',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 10, textTransform: 'uppercase', color: '#FF3B3B' }}>Portfolio</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 132, fontWeight: 900, lineHeight: 0.95, marginTop: 24, textTransform: 'uppercase', color: '#FFFFFF' }}>
          <span>{site.firstName}</span>
          <span>{site.lastName}</span>
        </div>
        <div style={{ fontSize: 38, marginTop: 36, color: '#9a9aa3' }}>{site.role}</div>
      </div>
    ),
    size
  )
}
