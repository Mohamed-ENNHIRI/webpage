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

  /*
   * La barre de filtres n'existe pas au chargement : publications.js la pose
   * une fois data/publications.json lu. On branche donc les filtres deux fois,
   * maintenant pour ce qui est déjà là, et à nouveau quand la liste est prête.
   */
  function bindFilters() {
  document.querySelectorAll('[data-filters]:not([data-bound])').forEach((bar) => {
    bar.setAttribute('data-bound', '');
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
  }

  bindFilters();
  document.addEventListener('publications:ready', bindFilters);

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

  const sunpath = document.querySelector('[data-sunpath]');
  if (sunpath) drawSunPath(sunpath);

  /**
   * A sun path diagram: where the sun stands in the sky through the year.
   *
   * Nothing here is decorative or fetched. Solar declination, the equation of
   * time and the hour angle are computed from the date and the latitude of the
   * laboratory, and the curves fall out of the geometry — which is the same
   * geometry every irradiation model on this site starts from.
   *
   * @param {Element} root The [data-sunpath] container.
   */
  function drawSunPath(root) {
    const canvas = root.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!context) return;

    const LAT = Number(root.dataset.lat) || 45.64;
    const RAD = Math.PI / 180;

    const readout = root.querySelector('[data-sunpath-now]');
    let labels = {};
    try {
      labels = JSON.parse(root.dataset.labels || '{}');
    } catch { /* the drawing works without the readout */ }

    /**
     * The clock at the laboratory, whatever timezone the visitor is in.
     *
     * @param {Date} when The moment.
     * @returns {string} Hours and minutes.
     */
    function labClock(when) {
      try {
        return new Intl.DateTimeFormat(document.documentElement.lang || 'fr', {
          hour: '2-digit', minute: '2-digit', timeZone: root.dataset.tz || 'Europe/Paris',
        }).format(when);
      } catch {
        return `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
      }
    }

    /**
     * Turn a bearing into a compass name.
     *
     * @param {number} azimuth Degrees from north, clockwise.
     * @returns {string}
     */
    function compass(azimuth) {
      const names = labels.compass;
      if (!Array.isArray(names) || names.length !== 8) return '';
      return names[Math.round(((azimuth % 360) + 360) % 360 / 45) % 8];
    }

    /**
     * Solar declination and the equation of time for a day of the year.
     *
     * Spencer's Fourier expansion — a few terms, accurate to well under a
     * degree, which is far finer than this drawing can show.
     *
     * @param {number} dayOfYear 1 to 365.
     * @returns {{declination: number, equationOfTime: number}} Radians, minutes.
     */
    function solarDay(dayOfYear) {
      const b = ((dayOfYear - 1) * 2 * Math.PI) / 365;
      const declination =
        0.006918
        - 0.399912 * Math.cos(b) + 0.070257 * Math.sin(b)
        - 0.006758 * Math.cos(2 * b) + 0.000907 * Math.sin(2 * b)
        - 0.002697 * Math.cos(3 * b) + 0.001480 * Math.sin(3 * b);
      const equationOfTime =
        229.18 * (0.000075
          + 0.001868 * Math.cos(b) - 0.032077 * Math.sin(b)
          - 0.014615 * Math.cos(2 * b) - 0.040849 * Math.sin(2 * b));
      return { declination, equationOfTime };
    }

    /**
     * Where the sun is, for a day and a solar hour.
     *
     * @param {number} dayOfYear 1 to 365.
     * @param {number} solarHour Solar time in hours, 12 being solar noon.
     * @returns {{elevation: number, azimuth: number}} Degrees; azimuth from north, clockwise.
     */
    function sunPosition(dayOfYear, solarHour) {
      const { declination } = solarDay(dayOfYear);
      const hourAngle = (solarHour - 12) * 15 * RAD;
      const lat = LAT * RAD;

      const sinElevation =
        Math.sin(lat) * Math.sin(declination)
        + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
      const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation)));

      const azimuth = Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
      );

      return {
        elevation: elevation / RAD,
        azimuth: ((azimuth / RAD) + 180 + 360) % 360,
      };
    }

    /** Day of the year for a date. */
    const dayOfYear = (date) =>
      Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);

    /** One day's path, sampled where the sun is above the horizon. */
    function pathForDay(day) {
      const points = [];
      for (let h = 0; h <= 24; h += 0.25) {
        const p = sunPosition(day, h);
        if (p.elevation >= -0.5) points.push(p);
      }
      return points;
    }

    // Twelve monthly paths, plus the two solstices to bound them.
    const MONTH_DAYS = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
    const SUMMER = 172;
    const WINTER = 355;

    let palette = readPalette();
    let width = 0;
    let height = 0;
    let plot = { x: 0, y: 0, w: 0, h: 0 };

    function readPalette() {
      const styles = getComputedStyle(document.documentElement);
      const get = (name, fallback) => (styles.getPropertyValue(name) || fallback).trim();
      return {
        accent: get('--accent', '#b8500c'),
        ink: get('--ink', '#14161a'),
        muted: get('--ink-3', '#8b919a'),
        line: get('--line', '#e7e3db'),
      };
    }

    /** Azimuth and elevation to canvas coordinates. */
    const project = (azimuth, elevation) => ({
      x: plot.x + ((azimuth - 45) / 270) * plot.w,
      y: plot.y + plot.h - (elevation / 70) * plot.h,
    });

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const padX = Math.max(28, width * 0.07);
      const padTop = Math.max(18, height * 0.09);
      const padBottom = Math.max(26, height * 0.13);
      plot = { x: padX, y: padTop, w: width - padX * 2, h: height - padTop - padBottom };
    }

    /** Draw one path as a polyline. */
    function stroke(points, colour, alpha, lineWidth) {
      if (points.length < 2) return;
      context.beginPath();
      points.forEach((p, i) => {
        const { x, y } = project(p.azimuth, p.elevation);
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.globalAlpha = alpha;
      context.strokeStyle = colour;
      context.lineWidth = lineWidth;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();
      context.globalAlpha = 1;
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      if (plot.w <= 0) return;

      const smallText = Math.max(9, Math.min(11, width / 46));
      context.font = `500 ${smallText}px Inter, system-ui, sans-serif`;
      context.textBaseline = 'middle';

      // Elevation grid, every 15°.
      context.textAlign = 'right';
      for (let e = 0; e <= 60; e += 15) {
        const { y } = project(0, e);
        context.beginPath();
        context.moveTo(plot.x, y);
        context.lineTo(plot.x + plot.w, y);
        context.globalAlpha = e === 0 ? 0.85 : 0.4;
        context.strokeStyle = palette.line;
        context.lineWidth = 1;
        context.stroke();
        context.globalAlpha = 0.75;
        context.fillStyle = palette.muted;
        context.fillText(`${e}°`, plot.x - 6, y);
      }
      context.globalAlpha = 1;

      // Compass points along the horizon.
      context.textAlign = 'center';
      context.fillStyle = palette.muted;
      for (const [azimuth, label] of [[90, 'E'], [180, 'S'], [270, 'O']]) {
        const { x } = project(azimuth, 0);
        context.globalAlpha = 0.8;
        context.fillText(label === 'O' && document.documentElement.lang !== 'fr' ? 'W' : label,
          x, plot.y + plot.h + smallText + 6);
      }
      context.globalAlpha = 1;

      // The twelve monthly paths, faint.
      for (const day of MONTH_DAYS) {
        stroke(pathForDay(day), palette.ink, 0.16, 1);
      }

      // The solstices bound the year: everything else falls between them.
      stroke(pathForDay(SUMMER), palette.ink, 0.42, 1.25);
      stroke(pathForDay(WINTER), palette.ink, 0.42, 1.25);

      // Hour lines: the sun's position at the same solar hour, month by month.
      for (let h = 5; h <= 19; h += 1) {
        const points = [];
        for (let d = 1; d <= 365; d += 5) {
          const p = sunPosition(d, h);
          if (p.elevation >= 0) points.push(p);
        }
        if (points.length > 3) stroke(points, palette.muted, 0.22, 0.9);
      }

      // Today, in the accent colour.
      const now = new Date();
      const today = dayOfYear(now);
      stroke(pathForDay(today), palette.accent, 0.95, 2);

      // And the sun itself, if it is up.
      const { equationOfTime } = solarDay(today);
      const localSolarHour =
        now.getHours() + now.getMinutes() / 60
        + equationOfTime / 60
        + (Number(root.dataset.lon) || 0) / 15
        - now.getTimezoneOffset() / -60;
      const sun = sunPosition(today, localSolarHour);

      // Say in words what the dot means, and where the sun is when it is down.
      if (readout && labels.now) {
        const clock = labClock(now);
        readout.querySelector('.sunpath__now-label').textContent =
          `${labels.now} · ${clock} ${labels.atLab}`;
        readout.querySelector('.sunpath__now-value').textContent = sun.elevation > 0
          ? `${labels.height} ${Math.round(sun.elevation)}° · ${labels.bearing} ${Math.round(sun.azimuth)}° ${compass(sun.azimuth)}`
          : labels.below;
        readout.hidden = false;
      }

      if (sun.elevation > 0) {
        const { x, y } = project(sun.azimuth, sun.elevation);
        context.beginPath();
        context.arc(x, y, Math.max(9, width / 62), 0, Math.PI * 2);
        context.globalAlpha = 0.16;
        context.fillStyle = palette.accent;
        context.fill();

        context.beginPath();
        context.arc(x, y, Math.max(3.5, width / 150), 0, Math.PI * 2);
        context.globalAlpha = 1;
        context.fillStyle = palette.accent;
        context.fill();
      }
      context.globalAlpha = 1;
    }

    function start() {
      resize();
      draw();
    }

    window.addEventListener('resize', start, { passive: true });
    window.addEventListener('themechange', () => { palette = readPalette(); draw(); });

    // The sun moves slowly enough that once a minute is generous.
    setInterval(draw, 60_000);

    start();
  }
})();
