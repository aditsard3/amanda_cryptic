# Minute Cryptic Lite

A tiny cryptic-clue game inspired by
[Minute Cryptic](https://www.minutecryptic.com/). It is plain HTML, CSS, and
JavaScript: no build step, no dependencies, no server.

## Play

Open `index.html` in a browser (double-click it or drag it into a tab).

Solved clues are saved in the browser's `localStorage`, so they survive reloads.
Use **Reset progress** at the bottom of the page to start over.

## Add your puzzles

Edit `PUZZLES` in `config.js`:

```js
const PUZZLES = [
  {id: 'sample-1', clue: 'Most people order chicken; hotspot Aditya initially visited as first date locale', answer: 'MPOCHA', hint: 'One might order chicken karage before heading to the parlour'},
  {id: 'sample-2', clue: 'Nobel prized institution for some BS?', answer: 'DUKE', hint: 'Where one might write about Investing in Rural Healthcare'},
];
```

*   `id`: any unique string. Progress is saved per `id`, so keep it stable.
*   `answer`: letters A-Z only, any case. Its length sets the number of boxes.
*   `hint`: the one hint shown by **Show Hint**.

## Swap the confetti images

Put your images in `assets/` and list them in `CONFETTI_IMAGE_URLS` in
`config.js`. PNG, JPG, GIF, and SVG work; SVGs need `width` and `height`
attributes on the `<svg>` tag. HEIC/HEICS images work only in browsers that can
decode them; unsupported images are skipped, so PNG or JPG is the most reliable
choice.

Set `CONFETTI_OPTIONS` in `config.js` to control each burst. `count` is the
number of image particles; `minSize` and `maxSize` set their randomized width
in pixels. Use `size` instead to give every particle the same width.

## Files

*   `index.html`: page markup.
*   `styles.css`: colors, type, layout, and animations.
*   `config.js`: your puzzles and confetti images.
*   `app.js`: gameplay (letter boxes, hints, checking, saved progress).
*   `confetti.js`: the full-screen canvas celebration.

## Put it online (optional)

Because the site is static, it can be hosted as-is: copy the folder into a
GitHub repository and turn on GitHub Pages for it.
