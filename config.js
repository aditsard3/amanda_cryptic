/**
 * @fileoverview Content for Minute Cryptic Lite. Edit this file to change the
 * puzzles or the confetti images; app.js and confetti.js read these values.
 */

/**
 * @typedef {Object} Puzzle
 * @property {string} id Unique and stable. Progress is saved per id, so
 *     changing an id resets that puzzle's solved state.
 * @property {string} clue The cryptic clue shown on the card.
 * @property {string} answer Target answer (case doesn't matter). Spaces and
 *     hyphens set the enumeration (e.g. 'Pizza oven' -> '(5, 4)') and group
 *     letter boxes by word.
 * @property {string} hint The single hint revealed by "Show Hint".
 */

/** @type {!Array<!Puzzle>} */
const PUZZLES = [
  {id: 'sample-1', clue: 'Most people order chicken; hotspot Aditya initially visited as first date locale.', answer: 'MPOCHA', hint: 'One might order chicken karage before heading to the parlour'},
  {id: 'sample-2', clue: 'Nobel prized institution for some BS?', answer: 'DUKE', hint: 'Where one might write about Investing in Rural Healthcare'},
  {id: 'sample-3', clue: 'Govt. subject in reconnaissance.', answer: 'ECON', hint: 'Dept. where one may write about the Impact of Private Equity Acquisition on Financial and Utilization Outcomes of Rural Hospitals'},
  {id: 'sample-4', clue: 'Medical software industry?', answer: 'BIOTECH', hint: 'Clearview clients for example.'},
  {id: 'sample-5', clue: 'Home for Rishika, Vaishnavi, and Amanda at first.', answer: 'RVA', hint: 'Contains giant Marlboro pillar.'},
  {id: 'sample-6', clue: 'Job said to be helping someone through a tough time and soaking up the sun.', answer: 'CONSULTANT', hint: 'A job for you, but hopefully for not much longer.'},
  {id: 'sample-7', clue: 'Fish in a strange state briefly.', answer: 'SUSHI', hint: 'A favorite food.'},
  {id: 'sample-8', clue: "Sœur, c'est elle-même", answer: 'ESTELLE', hint: 'Akin to a kin.'},
  {id: 'sample-9', clue: "\"Don't worry, this shit's number 1,\" text sent about Tuesday night plans?", answer: 'DWTS', hint: 'Smoothie drinker paid no mind on 8th ave.'},
];

/**
 * Images drawn as confetti particles: paths relative to index.html, or full
 * URLs. SVGs need explicit width/height attributes to draw in every browser.
 * @type {!Array<string>}
 */
const CONFETTI_IMAGE_URLS = [
  'assets/amanda1.png',
  'assets/amanda2.png',
  'assets/amanda3.png',
  'assets/amanda4.png',
  // 'assets/amanda5.jpeg',
];

/**
 * Number and size of image particles in each successful-answer burst.
 * Set `size` for uniform particles, or use `minSize` and `maxSize` for a range.
 * @type {{count: number, size: (number|undefined), minSize: number,
 *     maxSize: number}}
 */
const CONFETTI_OPTIONS = {
  count: 50,
  minSize: 30,
  maxSize: 130,
};
