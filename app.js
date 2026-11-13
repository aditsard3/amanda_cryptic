/**
 * @fileoverview Gameplay for Minute Cryptic Lite: renders the current puzzle,
 * handles letter-box input, checks answers, and remembers solved puzzle ids in
 * localStorage.
 */

/* global PUZZLES, CONFETTI_IMAGE_URLS, CONFETTI_OPTIONS, createConfetti */

(() => {
  'use strict';

  const STORAGE_KEY = 'minute-cryptic-lite:solved-ids';
  const ERROR_MESSAGES = ['Goofy answer! Try again!', 'Not quite my tempo.', 'You STINKY!'];
  const SUCCESS_MESSAGE = 'BANG!!';
  const SHAKE_KEYFRAMES = [0, -8, 8, -6, 6, -3, 3, 0].map(
      (px) => ({transform: `translateX(${px}px)`}));

  const clueText = document.getElementById('clue-text');
  const enumeration = document.getElementById('enumeration');
  const answerForm = document.getElementById('answer-form');
  const cellRow = document.getElementById('cells');
  const feedback = document.getElementById('feedback');
  const submitButton = document.getElementById('submit');
  const hintToggle = document.getElementById('hint-toggle');
  const hint = document.getElementById('hint');
  const scratchToggle = document.getElementById('scratch-toggle');
  const scratchpad = document.getElementById('scratchpad');
  const scratchBoard = document.getElementById('scratch-board');
  const scratchEmpty = document.getElementById('scratch-empty');
  const scratchShuffle = document.getElementById('scratch-shuffle');
  const scratchClear = document.getElementById('scratch-clear');
  const prevButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const dots = document.getElementById('dots');
  const resetButton = document.getElementById('reset');

  const confetti =
      createConfetti(document.getElementById('confetti'), CONFETTI_IMAGE_URLS);
  const solvedIds = loadSolvedIds();
  const dotButtons = PUZZLES.map((_, index) => {
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.type = 'button';
    dot.addEventListener('click', () => showPuzzle(index));
    return dot;
  });
  dots.replaceChildren(...dotButtons);
  let currentIndex = 0;
  /** @type {!Array<!HTMLInputElement>} Letter boxes for the current puzzle. */
  let cells = [];
  /** @type {!Array<!HTMLButtonElement>} Active scratchpad letter tiles. */
  let scratchTiles = [];
  let topTileZ = 1;
  let wrongGuesses = 0;

  /** @return {!Set<string>} Ids of puzzles solved in this browser. */
  function loadSolvedIds() {
    try {
      const ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(ids) ? ids : []);
    } catch {
      return new Set();  // Corrupt or blocked storage: start fresh.
    }
  }

  function saveSolvedIds() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...solvedIds]));
    } catch {
      // Storage is blocked; progress lasts until the page is reloaded.
    }
  }

  /** @return {number} The first unsolved puzzle, or 0 if all are solved. */
  function firstUnsolvedIndex() {
    const index = PUZZLES.findIndex((puzzle) => !solvedIds.has(puzzle.id));
    return Math.max(index, 0);
  }

  /**
   * @param {string} text
   * @return {string} `text` uppercased, keeping only the letters A-Z.
   */
  function toLetters(text) {
    return text.toUpperCase().replace(/[^A-Z]/g, '');
  }

  /**
   * Formats cryptic enumeration from `rawAnswer` (e.g. 'Pizza oven' -> '(5,
   * 4)').
   * @param {string} rawAnswer
   * @return {string}
   */
  function formatEnumeration(rawAnswer) {
    const counts = rawAnswer.trim()
                       .split(/\s+/)
                       .map(
                           (word) => word.split('-')
                                         .map((part) => toLetters(part).length)
                                         .filter(Boolean)
                                         .join('-'))
                       .filter(Boolean)
                       .join(', ');
    return `(${counts})`;
  }

  /**
   * @param {number} index
   * @param {string} letter A single letter, or '' to clear the cell.
   */
  function setCell(index, letter) {
    cells[index].value = letter;
    cells[index].classList.toggle('is-filled', letter !== '');
  }

  /** @param {number} index Clamped to the first or last cell. */
  function focusCell(index) {
    cells[Math.min(Math.max(index, 0), cells.length - 1)].focus();
  }

  /**
   * Writes `letters` into consecutive cells from `start`, dropping any that
   * don't fit, then focuses the cell after the last one written.
   * @param {number} start
   * @param {string} letters
   */
  function fillFrom(start, letters) {
    const fitting = letters.slice(0, cells.length - start);
    [...fitting].forEach((letter, offset) => setCell(start + offset, letter));
    focusCell(start + fitting.length);
  }

  /**
   * @param {!KeyboardEvent} event
   * @param {number} index
   */
  function onCellKeydown(event, index) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;  // e.g. paste
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (cells[index].value) {
        setCell(index, '');
      } else {
        focusCell(index - 1);
      }
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusCell(event.key === 'ArrowLeft' ? index - 1 : index + 1);
    } else if (event.key.length === 1) {
      // A printable character: type letters, swallow everything else.
      event.preventDefault();
      const letter = toLetters(event.key);
      if (letter) fillFrom(index, letter);
    }
  }

  /**
   * Handles edits that skip the keydown path (mobile keyboards, IME,
   * autocomplete, native deletion) by normalising the cell to one letter.
   * @param {!InputEvent} event
   * @param {number} index
   */
  function onCellInput(event, index) {
    const typed = toLetters(event.data ?? cells[index].value);
    if (typed) {
      fillFrom(index, typed);
    } else {
      setCell(index, toLetters(cells[index].value).charAt(0));
    }
  }

  /**
   * @param {!ClipboardEvent} event
   * @param {number} index
   */
  function onCellPaste(event, index) {
    event.preventDefault();
    const letters = toLetters(event.clipboardData.getData('text'));
    if (letters) fillFrom(index, letters);
  }

  /**
   * @param {number} index
   * @param {number} length Answer length, for the accessible label.
   * @return {!HTMLInputElement}
   */
  function createCell(index, length) {
    const cell = document.createElement('input');
    cell.className = 'cell';
    cell.type = 'text';
    cell.autocomplete = 'off';
    cell.spellcheck = false;
    cell.setAttribute('autocapitalize', 'characters');
    cell.setAttribute('autocorrect', 'off');
    cell.setAttribute('aria-label', `Letter ${index + 1} of ${length}`);
    cell.style.setProperty('--index', String(index));
    cell.addEventListener('keydown', (event) => onCellKeydown(event, index));
    cell.addEventListener('input', (event) => onCellInput(event, index));
    cell.addEventListener('paste', (event) => onCellPaste(event, index));
    return cell;
  }

  /** @param {boolean} solved Locks the cells and submit button when true. */
  function setSolved(solved) {
    for (const cell of cells) cell.disabled = solved;
    submitButton.disabled = solved;
    submitButton.textContent = solved ? 'Solved' : 'Submit';
  }

  /**
   * @param {string} message
   * @param {boolean=} isError
   */
  function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', isError);
  }

  /** @param {boolean} visible */
  function setHintVisible(visible) {
    hint.hidden = !visible;
    hintToggle.textContent = visible ? 'Hide Hint' : 'Show Hint';
    hintToggle.setAttribute('aria-expanded', String(visible));
  }

  /** @param {boolean} visible */
  function setScratchpadVisible(visible) {
    scratchpad.hidden = !visible;
    const label = visible ? 'Hide scratchpad' : 'Show scratchpad';
    scratchToggle.setAttribute('aria-expanded', String(visible));
    scratchToggle.setAttribute('aria-label', label);
    scratchToggle.title = label;
  }

  let lastBoardWidth = 0;

  /** Positions all active `scratchTiles` across `scratchBoard`. */
  function layoutScratchTiles() {
    scratchEmpty.hidden = scratchTiles.length > 0;
    if (!scratchTiles.length) {
      scratchBoard.style.minHeight = '';
      return;
    }
    const boardWidth = scratchBoard.clientWidth || 320;
    lastBoardWidth = boardWidth;
    const tileStep = 46;
    const cols = Math.max(1, Math.floor((boardWidth - 16) / tileStep));
    const totalRows = Math.ceil(scratchTiles.length / cols);
    const boardHeight = Math.max(150, totalRows * tileStep + 24);
    scratchBoard.style.minHeight = `${boardHeight}px`;
    const startY = Math.max(12, (boardHeight - totalRows * tileStep) / 2);

    scratchTiles.forEach((tile, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const rowCount = Math.min(cols, scratchTiles.length - row * cols);
      const rowWidth = rowCount * 38 + (rowCount - 1) * 8;
      const startX = Math.max(8, (boardWidth - rowWidth) / 2);
      const jitterY = Math.round((Math.random() - .5) * 10);
      tile.style.left = `${Math.round(startX + col * tileStep)}px`;
      tile.style.top = `${
          Math.min(
              Math.max(4, Math.round(startY + row * tileStep + jitterY)),
              boardHeight - 42)}px`;
    });
  }

  /**
   * Re-lays out tiles only when the board width changes (e.g. orientation or
   * window width change), ignoring height-only resizes from mobile keyboards.
   */
  function handleBoardResize() {
    if (!scratchTiles.length || scratchpad.hidden) return;
    const boardWidth = scratchBoard.clientWidth;
    if (boardWidth && boardWidth !== lastBoardWidth) {
      layoutScratchTiles();
    }
  }

  /**
   * Creates a draggable, highlightable letter tile for the scratchpad.
   * @param {string} letter Lowercase letter a-z.
   * @param {number} wordIndex Index of the source word in the clue.
   * @return {!HTMLButtonElement}
   */
  function createScratchTile(letter, wordIndex) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.type = 'button';
    tile.textContent = letter;
    tile.dataset.wordIndex = String(wordIndex);
    tile.setAttribute('aria-label', `Tile ${letter.toUpperCase()}`);
    tile.setAttribute('aria-pressed', 'false');

    const toggleHighlight = () => {
      const highlighted = tile.classList.toggle('is-highlighted');
      tile.setAttribute('aria-pressed', String(highlighted));
    };

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;

    tile.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      originLeft = tile.offsetLeft;
      originTop = tile.offsetTop;
      tile.style.zIndex = String(++topTileZ);
      tile.classList.add('is-dragging');
      tile.setPointerCapture(event.pointerId);
    });

    tile.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      const maxLeft =
          Math.max(4, scratchBoard.clientWidth - tile.offsetWidth - 4);
      const maxTop =
          Math.max(4, scratchBoard.clientHeight - tile.offsetHeight - 4);
      tile.style.left =
          `${Math.min(Math.max(4, Math.round(originLeft + dx)), maxLeft)}px`;
      tile.style.top =
          `${Math.min(Math.max(4, Math.round(originTop + dy)), maxTop)}px`;
    });

    tile.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      tile.classList.remove('is-dragging');
      if (!moved) toggleHighlight();
    });
    tile.addEventListener('pointercancel', () => {
      dragging = false;
      tile.classList.remove('is-dragging');
    });
    tile.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleHighlight();
      }
    });
    return tile;
  }

  /** Clears all scratchpad tiles and deselects clue words. */
  function clearScratchpad() {
    for (const tile of scratchTiles) tile.remove();
    scratchTiles = [];
    for (const wordBtn of clueText.querySelectorAll('.clue-word.is-active')) {
      wordBtn.classList.remove('is-active');
      wordBtn.setAttribute('aria-pressed', 'false');
    }
    scratchEmpty.hidden = false;
  }

  /**
   * Renders `clue` into `clueText` with clickable word buttons that spawn or
   * remove letter tiles in the scratchpad.
   * @param {string} clue
   */
  function renderClueWords(clue) {
    let wordCounter = 0;
    const nodes = clue.split(/(\s+)/).map((token) => {
      const letters = toLetters(token).toLowerCase();
      if (!letters) return document.createTextNode(token);
      const wordIndex = wordCounter++;
      const wordBtn = document.createElement('button');
      wordBtn.className = 'clue-word';
      wordBtn.type = 'button';
      wordBtn.textContent = token;
      wordBtn.setAttribute('aria-pressed', 'false');
      wordBtn.title = 'Click to toggle letters in scratchpad';
      wordBtn.addEventListener('click', () => {
        const active = wordBtn.classList.toggle('is-active');
        wordBtn.setAttribute('aria-pressed', String(active));
        if (scratchpad.hidden) setScratchpadVisible(true);
        if (active) {
          for (const letter of letters) {
            const tile = createScratchTile(letter, wordIndex);
            scratchTiles.push(tile);
            scratchBoard.appendChild(tile);
          }
        } else {
          scratchTiles = scratchTiles.filter((tile) => {
            if (tile.dataset.wordIndex === String(wordIndex)) {
              tile.remove();
              return false;
            }
            return true;
          });
        }
        layoutScratchTiles();
      });
      return wordBtn;
    });
    clueText.replaceChildren(...nodes);
  }

  /** Updates the previous/next arrows and the progress dots. */
  function renderNav() {
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === PUZZLES.length - 1;
  
    // Limit dots to 7, centered around the current index
    const maxDots = 7;
    const half = Math.floor(maxDots / 2);
    const start = Math.max(0, Math.min(currentIndex - half, PUZZLES.length - maxDots));
    const end = Math.min(start + maxDots, PUZZLES.length);
  
    dots.replaceChildren(...dotButtons.slice(start, end));
  
    PUZZLES.forEach((puzzle, index) => {
      const solved = solvedIds.has(puzzle.id);
      const dot = dotButtons[index];
      dot.classList.toggle('is-solved', solved);
      dot.setAttribute(
          'aria-label', `Clue ${index + 1}${solved ? ' (solved)' : ''}`);
      if (index === currentIndex) {
        dot.setAttribute('aria-current', 'step');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Shows the puzzle at `index`; solved puzzles come back filled in and locked.
   * @param {number} index
   */
  function showPuzzle(index) {
    currentIndex = index;
    const puzzle = PUZZLES[index];
    const words =
        puzzle.answer.trim().split(/[\s-]+/).map(toLetters).filter(Boolean);
    const answer = words.join('');
    const solved = solvedIds.has(puzzle.id);

    renderClueWords(puzzle.clue);
    enumeration.textContent = formatEnumeration(puzzle.answer);
    cellRow.setAttribute('aria-label', `Answer, ${answer.length} letters`);
    cells = [];
    const wordElements = words.map((word) => {
      const wordGroup = document.createElement('div');
      wordGroup.className = 'word';
      for (let i = 0; i < word.length; i++) {
        const cell = createCell(cells.length, answer.length);
        cells.push(cell);
        wordGroup.appendChild(cell);
      }
      return wordGroup;
    });
    cellRow.replaceChildren(...wordElements);
    if (solved) [...answer].forEach((letter, i) => setCell(i, letter));
    setSolved(solved);

    clearScratchpad();
    setScratchpadVisible(false);
    hint.textContent = puzzle.hint;
    setHintVisible(false);
    setFeedback('');
    renderNav();
    if (!solved) {
      cells[0].focus();
    } else if (document.activeElement === document.body) {
      (nextButton.disabled ? hintToggle : nextButton).focus();
    }
  }

  // Add a tracker element for solved clues
  const tracker = document.createElement('span');
  tracker.id = 'solved-tracker';
  tracker.textContent = `solved ${solvedIds.size} / ${PUZZLES.length} clues`;
  document.querySelector('.title').appendChild(tracker); // Assuming `.title` is the container for "Amanda Cryptic"

  /**
   * Updates the solved tracker text.
   */
  function updateSolvedTracker() {
    tracker.textContent = `Solved ${solvedIds.size} / ${PUZZLES.length} clues`;
  }

  answerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const puzzle = PUZZLES[currentIndex];
    const guess = cells.map((cell) => cell.value).join('');
    if (guess === toLetters(puzzle.answer)) {
      solvedIds.add(puzzle.id);
      saveSolvedIds();
      setSolved(true);
      setFeedback(SUCCESS_MESSAGE);
      renderNav();
      updateSolvedTracker();
      (nextButton.disabled ? hintToggle : nextButton).focus();
      
      confetti.burst(CONFETTI_OPTIONS);
    } else {
      // Randomly select an error message from the list
      const message = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];
      setFeedback(message, true);
      cellRow.animate(SHAKE_KEYFRAMES, {duration: 400, easing: 'ease-in-out'});
    }
  });

  hintToggle.addEventListener('click', () => setHintVisible(hint.hidden));
  scratchToggle.addEventListener('click', () => {
    setScratchpadVisible(scratchpad.hidden);
    if (!scratchpad.hidden && scratchTiles.length &&
        !scratchTiles[0].style.left) {
      layoutScratchTiles();
    }
  });
  scratchShuffle.addEventListener('click', () => {
    for (let i = scratchTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scratchTiles[i], scratchTiles[j]] = [scratchTiles[j], scratchTiles[i]];
    }
    layoutScratchTiles();
  });
  scratchClear.addEventListener('click', clearScratchpad);
  window.addEventListener('resize', handleBoardResize);
  prevButton.addEventListener('click', () => showPuzzle(currentIndex - 1));
  nextButton.addEventListener('click', () => showPuzzle(currentIndex + 1));
  resetButton.addEventListener('click', () => {
    if (!window.confirm('Reset progress? All solved clues will be cleared.')) {
      return;
    }
    solvedIds.clear();
    saveSolvedIds();
    showPuzzle(0);
  });

  showPuzzle(firstUnsolvedIndex());
})();
