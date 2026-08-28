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
      // The site opens light, so an unset theme means light.
      const root = document.documentElement;
      const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
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

  const cadastre = document.querySelector('[data-cadastre]');
  if (cadastre) drawCadastre(cadastre);

  /**
   * Draw a real rooftop solar cadastre.
   *
   * Each shape is an actual roof surface in one Geneva neighbourhood, taken
   * from the published roof-solar dataset, coloured by the annual irradiation
   * it genuinely receives. A threshold sweeps across the range, dimming the
   * roofs below it — which is the question a solar cadastre exists to answer:
   * given a cut-off, which roofs are worth equipping?
   *
   * @param {Element} root The [data-cadastre] container.
   */
  async function drawCadastre(root) {
    const canvas = root.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!context) return;

    let data;
    try {
      const response = await fetch(root.dataset.src, { cache: 'force-cache' });
      if (!response.ok) throw new Error(String(response.status));
      data = await response.json();
    } catch {
      // The picture is illustrative; the page is fine without it.
      root.setAttribute('hidden', '');
      return;
    }

    const roofs = data.roofs ?? [];
    if (!roofs.length) { root.setAttribute('hidden', ''); return; }

    const lo = data.min ?? Math.min(...roofs.map((r) => r.i));
    const hi = data.max ?? Math.max(...roofs.map((r) => r.i));

    const readout = root.querySelector('[data-cadastre-readout]');
    const scale = root.querySelector('[data-cadastre-scale]');
    if (scale) {
      scale.querySelector('.cadastre__scale-min').textContent = String(lo);
      scale.querySelector('.cadastre__scale-max').textContent = `${hi} ${data.unit ?? ''}`;
      scale.hidden = false;
    }
    if (readout) readout.hidden = false;

    let palette = readPalette();
    let width = 0;
    let height = 0;
    let scaleFactor = 1;
    let offsetX = 0;
    let offsetY = 0;

    /** Colours come from the stylesheet, so the drawing follows the theme. */
    function readPalette() {
      const styles = getComputedStyle(document.documentElement);
      const get = (name, fallback) => (styles.getPropertyValue(name) || fallback).trim();
      return {
        accent: get('--accent', '#b8500c'),
        ink: get('--ink', '#14161a'),
        line: get('--line', '#e7e3db'),
        muted: get('--ink-3', '#8b919a'),
        surface: get('--surface-2', '#f6f4f0'),
      };
    }

    /**
     * Position on the colour ramp for one irradiation value.
     *
     * @param {number} value Annual irradiation, kWh/m²/yr.
     * @returns {number} 0 at the lowest roof, 1 at the highest.
     */
    const ramp = (value) => Math.max(0, Math.min(1, (value - lo) / Math.max(1, hi - lo)));

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      // Fit the extent, preserving its aspect ratio, with a small margin.
      const spanX = data.extent?.spanX ?? 1;
      const spanY = data.extent?.spanY ?? 1;
      const margin = 0.04;
      scaleFactor = Math.min(width / spanX, height / spanY) * (1 - margin * 2);
      offsetX = (width - spanX * scaleFactor) / 2;
      offsetY = (height - spanY * scaleFactor) / 2;
    }

    function draw(threshold) {
      context.clearRect(0, 0, width, height);

      let above = 0;

      for (const roof of roofs) {
        const points = roof.p;
        context.beginPath();
        context.moveTo(offsetX + points[0][0] * scaleFactor, offsetY + points[0][1] * scaleFactor);
        for (let i = 1; i < points.length; i += 1) {
          context.lineTo(offsetX + points[i][0] * scaleFactor, offsetY + points[i][1] * scaleFactor);
        }
        context.closePath();

        const qualifies = roof.i >= threshold;
        if (qualifies) above += 1;

        const t = ramp(roof.i);
        if (qualifies) {
          // Warmer and more opaque the more sun the roof receives.
          context.globalAlpha = 0.25 + t * 0.75;
          context.fillStyle = palette.accent;
        } else {
          context.globalAlpha = 0.16;
          context.fillStyle = palette.muted;
        }
        context.fill();

        context.globalAlpha = qualifies ? 0.35 : 0.18;
        context.strokeStyle = palette.ink;
        context.lineWidth = 0.4;
        context.stroke();
      }

      context.globalAlpha = 1;

      if (readout) {
        const pct = Math.round((above / roofs.length) * 100);
        readout.querySelector('.cadastre__threshold').textContent =
          `≥ ${Math.round(threshold)} ${data.unit ?? ''}`;
        readout.querySelector('.cadastre__count').textContent =
          `${above} / ${roofs.length} · ${pct}%`;
      }
    }

    let frame = 0;
    let running = false;

    function loop(time) {
      // A slow sweep across the middle of the range, where the decision sits.
      const low = lo + (hi - lo) * 0.35;
      const high = lo + (hi - lo) * 0.92;
      const phase = (Math.sin(time / 7000) + 1) / 2;
      draw(low + (high - low) * phase);
      frame = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(frame);
      resize();
      if (reducedMotion.matches) {
        // A conventional suitability cut-off, held still.
        draw(Math.min(1000, lo + (hi - lo) * 0.7));
        running = false;
      } else {
        running = true;
        frame = requestAnimationFrame(loop);
      }
    }

    function stop() {
      cancelAnimationFrame(frame);
      running = false;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      }, { threshold: 0 }).observe(canvas);
    }

    window.addEventListener('resize', () => { resize(); if (!running) start(); }, { passive: true });
    window.addEventListener('themechange', () => { palette = readPalette(); });
    reducedMotion.addEventListener('change', start);

    start();
  }
})();
