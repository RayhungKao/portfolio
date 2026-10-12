---
title: Building this site with Claude: what I decided, what it built, and which skills I picked
date: 2026-10-09
summary: I set the direction and judged the results; Claude wrote the code and tested it. Here is how that split worked, and where my own judgment changed the site.
---
💡 This site was built in a conversation with Claude. I want to be specific about who did what, because that split is the interesting part.

I set the direction, made every product call, and judged the results on my own machine. Claude wrote the code, ran it in a headless browser, and checked its own screenshots before handing anything back to me.

🗂️ Why a desk

At Perfect Corp I have built the editor's Fabric.js canvas since my first day: drag, resize, rotate, snapping guides, zoom and pan. So the portfolio became a desk built on the same ideas. Each piece of work is a card you can pick up and move, and the site itself shows the skill it describes.

🤖 The moment it looked AI-made

The first version worked, and it looked like every AI-generated page I have seen. Looking closer, the reasons were concrete:
- Inter everywhere
- six accent colors, straight from Tailwind's default palette
- every card the same size and weight, so nothing read as most important
- small uppercase labels on every card
- generic copy that could describe any engineer

Some labels did not even fit the content. Four cards said "Case study" while their content was a short summary, and the other two said where the work happened ("Startup", "Research · IEEE"). I asked why, and we renamed them to "Perfect Corp" so all six follow the same logic.

🎞️ From side panel to slides

I wanted the site to behave like a presentation. You start on the desk, click any card, the camera flies in, and the card opens into a full page. Arrow keys flip to the next card, and you can return to the desk anytime.

Three decisions before any code:
1. Stay on Vite + React for now. The interaction is the core of the site, and a later move to Astro can keep the desk as one React island.
2. Animation first, visuals later, so each step can be checked on its own.
3. Keep the existing card content while the presentation changes.

🧰 Choosing skills

Claude Skills are packaged instructions for one kind of task. I downloaded six and asked which one fits. Claude opened each one and checked it:
- No skill for the animation. Flying a camera into a card is a Fabric.js viewport problem, so it was solved directly.
- refactoring-ui for the visual redesign. Its method is grayscale first, color last, with fixed scales for type, spacing, and shadows. That targets exactly what made the site look generated.
- ux-heuristics afterwards, to check whether a first-time visitor knows to click a card and how to get back.
- ui-ux-pro-max as a reference only. My download had only its SKILL.md, without the search scripts and palette data it describes. Its 150–300 ms animation guideline also suits UI components better than a camera moving across a desk.
- app-ux-spec, icon-animation, and ios-hig-design solve other problems: PPTX spec decks, Lottie icon animation, and native iOS design.

🔍 Where my review changed the result

Several times Claude's own checks passed while the site still looked wrong to me:
- I kept seeing a blank flash when a card opened. Claude's first measurement missed it; a frame-by-frame recording confirmed 200–280 ms of an empty white box.
- The opened page never matched the card's height. My suggestion, always fit the width and let the overflow scroll, became the final design: each card is now a scaled copy of its slide.
- Zoomed in, the titles were so large that little content fit. That led to one compact header for card and slide, plus name labels on the desk that stay readable at any zoom.
- The labels then drew over the wrong cards and left copies behind after a drag. They now render in each card's own layer.

✅ What it does now

Click a card and the camera flies to it, straightens it, and dims the rest. Each card is a small copy of its slide, so the zoomed card becomes the readable page in place; longer content scrolls. Flipping to another card pulls the camera back mid-flight so you see the desk before landing. Esc, the back button, or a click outside turns the slide back into its card and returns the camera to where you were. Every card has its own URL, so a link can open straight onto one piece of work.

The implementation details are in a separate post: "Flying a Fabric.js camera into a card, then turning the card into a page".

Next step: a refactoring-ui audit of the current design, with a score before and after the redesign.

#Portfolio #Claude #FabricJS #UIDesign #FrontendEngineering
