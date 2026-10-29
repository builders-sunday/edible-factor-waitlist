(() => {
  'use strict';
  const themeButton = document.querySelector('.theme-toggle');
  const scheme = matchMedia('(prefers-color-scheme: dark)');
  let chosenTheme;
  try { chosenTheme = localStorage.getItem('plate-marketing-theme'); } catch {}
  function applyTheme() {
    const theme = ['light', 'dark'].includes(chosenTheme) ? chosenTheme : (scheme.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    themeButton.textContent = theme === 'dark' ? 'Light' : 'Dark';
    themeButton.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' appearance');
    document.querySelector('meta[name=theme-color]').content = theme === 'dark' ? '#161c21' : '#e8eef1';
  }
  applyTheme();
  themeButton.addEventListener('click', () => { chosenTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('plate-marketing-theme', chosenTheme); } catch {} applyTheme(); });
  scheme.addEventListener('change', applyTheme);
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  function closeMenu() { links.dataset.open = 'false'; toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); links.dataset.open = String(open); });
  links.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
  matchMedia('(min-width:768px)').addEventListener('change', closeMenu);

  function tabs(listSelector, tabData, panelSelector, panelData) {
    const list = document.querySelector(listSelector);
    const buttons = [...list.querySelectorAll('[role=tab]')];
    function select(button, focus) {
      buttons.forEach(item => { const active = item === button; item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1; });
      document.querySelectorAll(panelSelector).forEach(panel => { panel.hidden = panel.dataset[panelData] !== button.dataset[tabData]; });
      if (focus) button.focus();
    }
    buttons.forEach(button => button.addEventListener('click', () => select(button, false)));
    list.addEventListener('keydown', event => {
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next !== undefined) { event.preventDefault(); select(buttons[next], true); }
    });
  }
  tabs('.product-nav', 'tab', '[data-panel]', 'panel');
  tabs('.room-tabs', 'room', '[data-room-panel]', 'roomPanel');

  const demo = document.querySelector('[data-demo]');
  const settings = [...demo.querySelectorAll('[data-setting]')];
  function updateDemo(changed) {
    const values = Object.fromEntries(settings.map(input => [input.dataset.setting, input.checked]));
    demo.querySelector('[data-diner-card]').hidden = !values.menu;
    demo.querySelector('[data-menu-hidden]').hidden = values.menu;
    demo.querySelectorAll('[data-field]').forEach(field => { field.hidden = !values[field.dataset.field]; });
    if (changed) {
      const name = changed.getAttribute('aria-label').replace(/^Show /, '');
      demo.querySelector('.demo-hint').textContent = changed.dataset.setting === 'menu'
        ? (changed.checked ? 'The menu is visible in this example.' : 'The menu is hidden in this example. Turn it back on to preview dish details.')
        : name.charAt(0).toUpperCase() + name.slice(1) + (changed.checked ? ' shown' : ' hidden') + (values.menu ? ' in the example.' : '. The full menu is still hidden.');
    }
  }
  settings.forEach(input => input.addEventListener('change', () => updateDemo(input)));
  updateDemo();
  const formats = {
    poster: { src: '/plate-assets/01-system-handshake.webp', alt: 'Plate menu and QR poster design', text: "A clear menu and QR layout for your restaurant's physical space." },
    receipt: { src: '/plate-assets/04-receipt.webp', alt: 'Plate receipt-inspired printed menu design', text: 'A compact receipt-inspired layout. A menu design, not a billing or payment feature.' },
    photo: { src: '/plate-assets/05-flyer-food-photo.webp', alt: 'Plate photo flyer design featuring food photography', text: 'A photo-led flyer layout that brings the dishes into the printed experience.' }
  };
  document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
    const value = formats[button.dataset.format];
    document.querySelectorAll('[data-format]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const image = document.getElementById('print-example');
    image.src = value.src; image.alt = value.alt;
    document.querySelector('.format-spec').textContent = value.text;
  }));
  const form = document.querySelector('.claim-form');
  const message = document.getElementById('contact-message');
  form.querySelectorAll('input').forEach(input => input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); message.textContent = ''; form.querySelector('[data-email-draft]').hidden = true; }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const inputs = [...form.querySelectorAll('input')];
    const missing = inputs.find(input => !input.value.trim());
    if (missing) { missing.setAttribute('aria-invalid', 'true'); missing.setAttribute('aria-describedby', 'contact-message'); message.textContent = 'Please enter your ' + missing.getAttribute('aria-label').toLowerCase() + '.'; missing.focus(); return; }
    const [restaurant, area] = inputs.map(input => input.value.trim());
    const subject = 'Plate introduction: ' + restaurant;
    const body = 'Hello Edible Factor,\n\nI would like to explore Plate for ' + restaurant + ' in ' + area + '.\n\nPlease share a walkthrough and current setup and pricing information.\n\nThank you';
    const draft = form.querySelector('[data-email-draft]');
    draft.href = 'mailto:hello@ediblefactor.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    draft.hidden = false;
    message.textContent = 'Your introduction is ready to open in your email app. Nothing has been sent. If your email app is unavailable, write to hello@ediblefactor.com.';
  });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function setMotion() { document.querySelectorAll('svg').forEach(svg => { if (motion.matches && svg.pauseAnimations) svg.pauseAnimations(); else if (svg.unpauseAnimations) svg.unpauseAnimations(); }); }
  motion.addEventListener('change', setMotion); setMotion();

  // The poster is always available. Fetch video only when playback is wanted.
  const film = document.getElementById('hero-film');
  const filmButton = document.querySelector('.hero-play');
  const media = document.querySelector('.hero-media');
  const connection = navigator.connection;
  let inView = false;
  let userPaused = false;
  let optedIn = false;
  let failed = false;
  let pendingPlay = false;
  const mayPlay = () => inView && !document.hidden && !userPaused && !failed &&
    (optedIn || (!motion.matches && !connection?.saveData));
  function updateFilmButton() {
    filmButton.textContent = failed ? 'Retry product loop' : (!film.paused ? 'Pause product loop' : 'Play product loop');
  }
  function syncFilm() {
    if (!mayPlay()) { film.pause(); updateFilmButton(); return; }
    if (pendingPlay || !film.paused) return;
    if (!film.getAttribute('src')) { film.src = film.dataset.src; film.load(); }
    pendingPlay = true;
    film.play().then(() => {
      pendingPlay = false;
      if (!mayPlay()) film.pause();
      updateFilmButton();
    }).catch(() => { pendingPlay = false; media.dataset.playing = 'false'; updateFilmButton(); });
  }
  film.addEventListener('playing', () => {
    if (!mayPlay()) { film.pause(); return; }
    media.dataset.playing = 'true'; updateFilmButton();
  });
  film.addEventListener('pause', updateFilmButton);
  film.addEventListener('error', () => { failed = true; media.dataset.playing = 'false'; updateFilmButton(); });
  filmButton.hidden = false;
  filmButton.addEventListener('click', () => {
    if (!film.paused) { userPaused = true; film.pause(); }
    else {
      userPaused = false; optedIn = true;
      if (failed) { failed = false; film.removeAttribute('src'); }
      syncFilm();
    }
  });
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting; syncFilm();
  }, { threshold: 0.15 }).observe(media);
  document.addEventListener('visibilitychange', syncFilm);
  function preferenceChanged() {
    optedIn = false;
    media.dataset.playing = 'false';
    syncFilm();
  }
  motion.addEventListener('change', preferenceChanged);
  connection?.addEventListener('change', preferenceChanged);
})();
