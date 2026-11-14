# Setting up the living portrait

The hero portrait is a flat PNG that looks alive: the head turns toward the cursor, the eyes
follow it, it blinks and glances around when idle. All of that comes from a small "rig" in
`content.ts` that says where the head, face, nose, shoulders and (optionally) eyes are, in the
PNG's own pixels. Getting it right takes a few rounds of guess → look → adjust.

## How it works (so the numbers make sense)

`components/PortraitHead.tsx` draws the PNG in a WebGL shader and builds a depth map from the rig:
the head is a dome, the face and nose are smaller domes in front of it, and everything below the
shoulder line sits a little forward as the body. When the cursor moves, near parts shift more than
far parts (parallax), so the picture reads as a head rotating instead of an image sliding. The
eyes, if rigged, are repainted on top: eyeball, iris (colour sampled from the photo at
`center`), pupil, catch-light, and lids that close for blinks (skin colour sampled just above the
upper lid).

If the head ellipse is too small, the hair edge tears when the head turns. If the face or nose
domes are off-centre, the face looks like it's sliding off the skull. If an eye box is wrong, a
painted eye appears over the eyebrow or the skin. All of these are obvious in the `?rig` view.

## The photo

- Head and shoulders, facing the camera (a slight angle is fine), eyes open and visible.
- Background removed (transparent PNG). remove.bg, Photoshop, or Apple/Windows "remove
  background" all work. Stylised or 3D-avatar portraits work just as well as photos.
- 500–900px wide; the shoulders can be cut off by the bottom edge. Roughly square — the hero frame
  is a circle and the head is allowed to rise above it.
- Put it in `public/` (e.g. `public/portrait.png`).

## Steps

### 1. Read the pixel size

```bash
node -e "const b=require('fs').readFileSync(process.argv[1]);console.log(b.readUInt32BE(16)+'x'+b.readUInt32BE(20))" public/portrait.png
```

(PNG stores width and height at bytes 16–23.) These go in `width` and `height` — they must be
exact, since every other number is in this pixel space.

### 2. First guess

Look at the image and estimate the landmarks. As a starting point, these proportions came from
the original 528×472 portrait (head ≈ 300×350 px), and most head-and-shoulders crops are similar:

```ts
export const portrait: Portrait | null = {
  src: '/portrait.png',
  alt: 'Portrait of Sam Lee',
  width: 528,
  height: 472,
  rig: {
    pivot: [270, 200],                               // between the eyes, a bit below the brows
    head: { cx: 270, cy: 170, rx: 150, ry: 175 },    // whole head including hair, generous
    face: { cx: 270, cy: 215, rx: 85, ry: 105 },     // the face oval: brows to chin, cheek to cheek
    nose: { cx: 270, cy: 238, rx: 22, ry: 36 },      // bridge to tip
    shouldersY: [300, 360],                          // neck base → where the shoulders are fully out
    eyes: [
      // left eye (on the image), then right eye
      { corners: [210, 250], center: [232.5, 183], lidY: [186.5, 188], upper: 154, lower: 204 },
      { corners: [291, 331], center: [308, 183], lidY: [187.5, 187.5], upper: 154, lower: 205 },
    ],
  },
}
```

Scale every number by (new head size / 300) and move it by the head's offset.

Eye fields:
- `corners` — x of the two corners of the eye opening.
- `center` — the iris centre when looking straight ahead.
- `lidY` — y where the upper and lower lids meet at each corner (usually ~equal).
- `upper`, `lower` — y of the quadratic control points of the lid curves. The visible curve only
  reaches halfway to its control point, so `upper` sits about twice as far above the corners as
  the top of the eye opening. Same for `lower`, below.

### 3. Look at it with `?rig`

Run the dev server and open `http://localhost:3000/?rig`. The overlay draws a 50 px grid (labelled
every 100 px) in image pixels, the head/face/nose ellipses, the shoulder lines, the pivot dot, the
eye-lid curves and an iris circle. Screenshot or zoom into the hero and compare:

- **head** (cyan) wraps all of the hair with a little margin.
- **face** (green) runs from the eyebrows to the chin.
- **nose** (yellow) covers the nose, bridge to tip.
- **shoulder lines** (pink): dashed at the base of the neck, solid where the shoulders are.
- **eye curves** (red) trace the visible lids; the white circle sits on the iris.

Read the grid to correct the numbers, save, and reload — usually two or three rounds.

### 4. Check it moving

Remove `?rig`, move the cursor around the page and watch for: hair tearing at the edges (head
ellipse too small), the face sliding (face/nose off-centre), eyes appearing where there's skin or
brows (eye boxes wrong), or a painted eye that doesn't match the photo (check `center` sits on the
iris). Wait a few seconds without moving to see the idle glances and blinks.

### No eyes / glasses / closed-eye photos

Leave `eyes` out. The head still turns with parallax; the eyes just aren't animated. This is the
right choice for sunglasses, heavy glasses glare, or eyes that are small in the frame (under ~20 px
wide), where repainting would look worse than the photo.

### Reduced motion and no WebGL

The plain `<img>` is always rendered underneath; the WebGL canvas fades in over it only when it's
ready. With reduced motion turned on, or without WebGL, visitors simply see the photo.
