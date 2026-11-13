/**
 * @fileoverview Full-screen image confetti drawn on a fixed <canvas>.
 *
 * Particles burst upward from the centre of the screen, slow down under drag,
 * then drift back down under gravity while spinning and swaying, fading out
 * after 3-5 seconds.
 */

/**
 * @typedef {Object} ConfettiBurstOptions
 * @property {number=} count Number of image particles in the burst.
 * @property {number=} size Fixed particle width in CSS pixels.
 * @property {number=} minSize Minimum randomized particle width in CSS pixels.
 * @property {number=} maxSize Maximum randomized particle width in CSS pixels.
 */

/**
 * Creates a confetti launcher that draws on `canvas`.
 * @param {!HTMLCanvasElement} canvas Full-screen overlay canvas.
 * @param {!Array<string>} imageUrls Images to use as particles.
 * @return {{burst: function(!ConfettiBurstOptions=): void}}
 */
function createConfetti(canvas, imageUrls) {
  const PARTICLE_COUNT = 140;
  // Velocity decay rate (1/s): speeds shrink by e^(-DRAG * dt) each frame.
  const DRAG = 1.6;
  // Downward acceleration in viewport heights per s^2. With DRAG this caps the
  // fall speed at ~0.22 viewport heights per second: a slow drift down.
  const GRAVITY = 0.55;
  const MIN_LIFETIME_S = 3;
  const MAX_LIFETIME_S = 5;
  const FADE_OUT_S = 0.6;
  const MIN_SIZE_PX = 24;
  const MAX_SIZE_PX = 44;

  const context = canvas.getContext('2d');
  /** @type {!Array<!HTMLImageElement>} Images that loaded successfully. */
  const images = [];
  let loadingImages = imageUrls.length;
  let pendingBursts = [];
  let particles = [];
  let frameId = 0;
  let lastFrameMs = 0;

  for (const url of imageUrls) {
    const image = new Image();
    image.onload = () => {
      images.push(image);
      loadingImages--;
      while (pendingBursts.length > 0) {
        const opts = pendingBursts.shift();
        launchBurst(opts);
      }
    };
    image.onerror = () => {
      console.warn(`Confetti image failed to load: ${url}`);
      loadingImages--;
      if (loadingImages === 0 && images.length === 0) pendingBursts = [];
    };
    image.src = url;
  }

  /** Matches the canvas backing store to the viewport and pixel ratio. */
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  /**
   * @param {number} min
   * @param {number} max
   * @return {number} A uniformly random number in [min, max).
   */
  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Validates and fills in burst settings before starting or queueing a burst.
   * @param {!ConfettiBurstOptions=} options
   * @return {!ConfettiBurstOptions}
   */
  function resolveOptions(options = {}) {
    const count = options.count ?? PARTICLE_COUNT;
    const size = options.size;
    const minSize = options.minSize ?? MIN_SIZE_PX;
    const maxSize = options.maxSize ?? MAX_SIZE_PX;

    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError('Confetti count must be a non-negative integer.');
    }
    if (size !== undefined && (!Number.isFinite(size) || size <= 0)) {
      throw new RangeError('Confetti size must be a positive finite number.');
    }
    if (size === undefined &&
        (!Number.isFinite(minSize) || minSize <= 0 ||
         !Number.isFinite(maxSize) || maxSize < minSize)) {
      throw new RangeError(
          'Confetti size range must be positive and maxSize >= minSize.');
    }

    return {count, size, minSize, maxSize};
  }

  /** Launches a burst using one randomly selected loaded image. */
  function launchBurst(options) {
    const image = images[Math.floor(Math.random() * images.length)];
    resize();
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = 0; i < options.count; i++) {
      const size = options.size !== undefined ?
          options.size :
          random(options.minSize, options.maxSize);
      const aspectRatio = (image.naturalWidth > 0 && image.naturalHeight > 0) ?
          image.naturalHeight / image.naturalWidth :
          1;
      particles.push({
        image,
        width: size,
        height: size * aspectRatio,
        x: width / 2 + random(-20, 20),
        y: height / 2 + random(-20, 20),
        // Scale launch speed by DRAG so exponential damping still allows a
        // wide burst before the particles settle into their downward drift.
        vx: random(-0.5, 0.5) * width * DRAG,
        vy: -random(0.35, 0.9) * height * DRAG,
        angle: random(0, 2 * Math.PI),
        spin: random(-5, 5),
        swayPhase: random(0, 2 * Math.PI),
        swaySpeed: random(2, 5),
        swayAmount: random(15, 50),
        age: 0,
        lifetime: random(MIN_LIFETIME_S, MAX_LIFETIME_S),
      });
    }
    if (!frameId) {
      lastFrameMs = performance.now();
      frameId = requestAnimationFrame(step);
    }
  }

  /** Launches a burst, waiting for image loading if necessary. */
  function burst(options = {}) {
    const settings = resolveOptions(options);
    if (!settings.count) return;
    if (images.length) {
      launchBurst(settings);
    } else if (loadingImages > 0) {
      pendingBursts.push(settings);
    }
  }

  /**
   * Advances the simulation by one frame and redraws every live particle.
   * @param {number} nowMs Frame timestamp from requestAnimationFrame.
   */
  function step(nowMs) {
    // Clamp dt so a backgrounded tab doesn't teleport particles on return.
    const dt = Math.min(Math.max(nowMs - lastFrameMs, 0) / 1000, 1 / 30);
    lastFrameMs = nowMs;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const damping = Math.exp(-DRAG * dt);
    const gravity = GRAVITY * height;

    context.clearRect(0, 0, width, height);
    particles = particles.filter((p) => {
      p.age += dt;
      p.vx *= damping;
      p.vy = p.vy * damping + gravity * dt;
      const sway = Math.sin(p.age * p.swaySpeed + p.swayPhase) * p.swayAmount;
      p.x += (p.vx + sway) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.age >= p.lifetime || p.y - p.height > height) return false;

      context.save();
      context.globalAlpha = Math.min(1, (p.lifetime - p.age) / FADE_OUT_S);
      context.translate(p.x, p.y);
      context.rotate(p.angle);
      context.drawImage(
          p.image, -p.width / 2, -p.height / 2, p.width, p.height);
      context.restore();
      return true;
    });
    frameId = particles.length ? requestAnimationFrame(step) : 0;
  }

  window.addEventListener('resize', () => {
    if (frameId) resize();
  });

  return {burst};
}
