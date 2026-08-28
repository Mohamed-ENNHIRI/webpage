/**
 * Site behaviour: theme, navigation, publication filters, and the hero visual.
 *
 * Everything here is progressive. With JavaScript disabled the site still
 * reads: the menu is a plain list, every publication is visible, and the hero
 * simply shows its background.
 */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------- theme */

  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const current = root.dataset.theme || (systemDark ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';

      root.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch { /* private browsing; the choice simply will not persist */ }

      window.dispatchEvent(new CustomEvent('themechange'));
    });
  }

  /* -------------------------------------------------------- navigation */

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        navToggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        navToggle.focus();
      }
    });
  }

  // A hairline under the header, but only once the page has scrolled.
  const header = document.querySelector('.header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------- publication filters */

  document.querySelectorAll('[data-filters]').forEach((bar) => {
    const scope = bar.parentElement;
    const buttons = [...bar.querySelectorAll('[data-filter]')];

    bar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;

      const filter = button.dataset.filter;

      buttons.forEach((other) => {
        const active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });

      scope.querySelectorAll('.pub').forEach((item) => {
        item.hidden = filter !== 'all' && item.dataset.type !== filter;
      });

      // A year with nothing left under it should go too.
      scope.querySelectorAll('.pub-year').forEach((section) => {
        section.hidden = section.querySelectorAll('.pub:not([hidden])').length === 0;
      });
    });
  });

  /* -------------------------------------------------------- scroll reveal */

  const revealable = document.querySelectorAll('.section, .card, .pub-year, .news');
  if (revealable.length && !reducedMotion.matches && 'IntersectionObserver' in window) {
    revealable.forEach((el) => el.setAttribute('data-reveal', ''));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    revealable.forEach((el) => observer.observe(el));
  }

  /* ----------------------------------------------------- the hero visual */

  const canvas = document.querySelector('[data-solar-canvas]');
  if (canvas) startSolarCadastre(canvas);

  /**
   * An abstract solar cadastre.
   *
   * A block of city seen from above: each footprint is shaded by how much sun
   * its roof receives, and taller neighbours cast shadows that move as the sun
   * comes round. It is the subject of the research, drawn rather than
   * described — and it is decorative, so it is hidden from assistive software
   * and stands still when the visitor asks for reduced motion.
   *
   * @param {HTMLCanvasElement} canvas The canvas to draw into.
   */
  function startSolarCadastre(canvas) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const COLS = 30;
    const ROWS = 22;

    // A fixed seed keeps the skyline identical on every visit and every build.
    let seed = 20260828;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Lay out blocks separated by streets, then give each block a height.
    const heights = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const street = row % 6 === 0 || col % 7 === 0 || (col % 7 === 3 && row % 11 > 6);
        heights[row][col] = street ? 0 : 0.25 + random() * random() * 3.4;
      }
    }

    let palette = readPalette();
    let width = 0;
    let height = 0;
    let cell = 0;
    let originX = 0;
    let originY = 0;

    /** Read the colours from CSS so the drawing follows the theme. */
    function readPalette() {
      const styles = getComputedStyle(document.documentElement);
      const get = (name, fallback) => (styles.getPropertyValue(name) || fallback).trim();
      return {
        accent: get('--accent', '#b8500c'),
        ink: get('--ink', '#14161a'),
        line: get('--line', '#e7e3db'),
        low: get('--ink-3', '#8b919a'),
      };
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      cell = Math.min(width / (COLS + 2), height / (ROWS + 2));
      originX = (width - cell * COLS) / 2;
      originY = (height - cell * ROWS) / 2;
    }

    /**
     * How much sun a roof receives, given where the sun is.
     *
     * A crude ray march: step towards the sun and see whether anything tall
     * enough gets in the way. Enough to make the picture behave like a real
     * shading map, without pretending to be one.
     */
    function irradiance(row, col, sunX, sunY, elevation) {
      const own = heights[row][col];
      if (own === 0) return -1;

      let shaded = 0;
      for (let step = 1; step <= 6; step += 1) {
        const r = Math.round(row + sunY * step);
        const c = Math.round(col + sunX * step);
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;

        const blocker = heights[r][c] - own;
        const needed = step * elevation;
        if (blocker > needed) shaded = Math.max(shaded, Math.min(1, (blocker - needed) / 2));
      }

      // Taller roofs see more sky, so they collect a little more.
      const openness = 0.55 + Math.min(own, 3.5) / 9;
      return Math.max(0, Math.min(1, openness * (1 - shaded * 0.85)));
    }

    /** Blend between the muted and the accent colour. */
    function shade(value) {
      const alpha = 0.12 + value * 0.85;
      return { fill: palette.accent, alpha };
    }

    function draw(time) {
      context.clearRect(0, 0, width, height);
      if (cell <= 0) return;

      // The sun goes round slowly; a fixed angle when motion is reduced.
      const angle = reducedMotion.matches ? 2.2 : (time / 26000) % (Math.PI * 2);
      const sunX = Math.cos(angle);
      const sunY = Math.sin(angle) * 0.55;
      const elevation = 0.55 + Math.sin(angle * 2) * 0.18;

      const inset = cell * 0.11;

      for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
          const value = irradiance(row, col, sunX, sunY, elevation);
          const x = originX + col * cell;
          const y = originY + row * cell;

          if (value < 0) {
            // Street: a faint grid line, so the fabric of the block reads.
            context.fillStyle = palette.line;
            context.globalAlpha = 0.5;
            context.fillRect(x + cell * 0.42, y + cell * 0.42, cell * 0.16, cell * 0.16);
            continue;
          }

          const { fill, alpha } = shade(value);
          const lift = Math.min(heights[row][col], 3.5) * cell * 0.055;

          context.globalAlpha = 0.16;
          context.fillStyle = palette.ink;
          context.fillRect(x + inset + lift * 0.5, y + inset + lift * 0.9, cell - inset * 2, cell - inset * 2);

          context.globalAlpha = alpha;
          context.fillStyle = fill;
          context.fillRect(x + inset - lift * 0.15, y + inset - lift * 0.55, cell - inset * 2, cell - inset * 2);
        }
      }

      context.globalAlpha = 1;
    }

    let frame = 0;
    function loop(time) {
      draw(time);
      frame = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(frame);
      resize();
      if (reducedMotion.matches) {
        draw(0);
      } else {
        frame = requestAnimationFrame(loop);
      }
    }

    // Only animate while the hero is actually on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) start();
          else cancelAnimationFrame(frame);
        });
      }, { threshold: 0 }).observe(canvas);
    }

    window.addEventListener('resize', start, { passive: true });
    window.addEventListener('themechange', () => { palette = readPalette(); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { palette = readPalette(); });
    reducedMotion.addEventListener('change', start);

    start();
  }
})();
