---
title: Flying a Fabric.js camera into a card, then turning the card into a page
date: 2026-10-09
summary: Treat the viewport as a camera, draw each card as a scaled copy of its slide, and let the URL drive every animation.
---
The home page of this site is a Fabric.js desk. Click a card and the camera flies to it, then the card becomes a readable page. Four pieces make that work.

1. Treat the viewport as a camera

A Fabric viewport is a matrix: [zoom, 0, 0, zoom, panX, panY]. Tweening those six numbers directly makes the target drift sideways while it scales. So I describe the camera as a zoom plus the scene point at the center of the screen, and rebuild the matrix every frame:

`panX = width / 2 - centerX * zoom`

The center moves linearly. Zoom interpolates on a log scale, so going from 1x to 3x feels as fast as going from 3x back to 1x.

Cards sit slightly tilted on the desk, so during the flight the card rotates back to 0° and every other card fades to 18% opacity. Its original angle is restored on the way out.

2. Pull back between cards

Flying straight from one zoomed card to another feels like a jump cut. For card-to-card flights I add a dip to the zoom:

`log(zoom) = lerp(log(z0), log(z1), t) + log(0.25) * sin(π t)`

At the midpoint the camera is at a quarter of the straight-line zoom, so you see the desk and where you are heading before landing.

3. Make the card a scaled copy of the slide

Canvas text cannot be selected, read by a screen reader, or scrolled, so the opened page is HTML. The hand-off from canvas card to HTML slide took three versions, and each failure was visible on screen.

Version 1, FLIP with scale. I scaled the slide's box onto the card. Card and slide had different heights, so text squashed mid-animation, and to hide that I kept the slide's text invisible at first. A frame-by-frame recording showed 5 to 7 frames, about 200–280 ms, of an empty white box.

Version 2, unfold with clip-path. No scaling: the slide started clipped to the card's rect and opened downward. Text no longer stretched, but the box still changed size, and blank frames remained. A per-frame probe found why: the canvas card was hidden by a 200 ms setTimeout, while the slide's fade was a CSS transition that only started after a 120 ms main-thread stall. The card disappeared while the slide was only 58% opaque, and the longer the stall, the more transparent the slide at that moment.

Version 3 removes the mismatch at the source:
- Every slide has one fixed layout width. The desk card is not a separate design: it is that same layout, measured from the DOM and drawn on the canvas at card scale. The summary sits at the top and the details sit below in small type, like a page thumbnail.
- The canvas copies the browser's exact line breaks. Each text element is split into its rendered lines with Range rects, and each line becomes its own canvas text object.
- The camera always fits the card's width and puts its top edge near the top of the screen. The zoomed card and the slide are then the same box, so opening is only a cross-fade. Longer content scrolls.
- Hand-offs wait for the animation's own finished promise from the Web Animations API, never a timer. The canvas card is hidden only after the slide is fully opaque, and shown again before the slide starts to fade out.
- The header has one compact size, shared by slide and card, so the first screen shows the details too and nothing resizes or re-wraps after the hand-off.
- That makes card titles tiny on the desk, so each card gets a name label drawn at a constant screen size, like frame names in Figma, which fades out as the camera flies in. Each label is drawn right after its own card, so cards stacked above cover it. My first version drew labels in a render hook that also fires for Fabric's selection canvas; that canvas is not cleared every frame, so stale copies stayed behind after a drag.

A per-frame probe now checks one invariant: in every frame, either the canvas card or the slide is fully visible.

4. Let the URL drive everything

Every open card has a route: #/work/ai-agent. Clicking a card only changes the hash. A single effect reads the route and runs the sequence: fade the current slide back into its card, fly the camera, fade in the next slide.

That gives deep links and a working Back button for free. Opening pushes a history entry, flipping replaces it, and closing goes back. Fast clicks are safe too: each sequence takes a number from a counter, and any step that finishes after a newer sequence has started simply stops. If the desk itself is rebuilt mid-sequence, by a hot reload or by switching to the list view and back, the same effect re-runs against the new desk instead of waiting for an animation that will never finish.

⏱️ Timing

The camera flight takes 700 ms, the cross-fade 180 ms. Common UI guidance says 150–300 ms, and that fits buttons and menus. A camera crossing a desk needs longer, otherwise you lose track of where you went. With prefers-reduced-motion on, every animation jumps straight to its end state.

#FabricJS #Canvas #Animation #React #FrontendEngineering
