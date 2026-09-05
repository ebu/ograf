(function () {
  const MESSAGE_ORIGIN = window.location.origin;
  const READY_PING_INTERVAL_MS = 250;
  const READY_PING_TIMEOUT_MS = 10_000;
  const iframe   = document.getElementById('sb-iframe');
  const player   = document.getElementById('sb-player');
  const btnPlay  = document.getElementById('sb-play');
  const btnNext  = document.getElementById('sb-next');
  const btnGHome = document.getElementById('sb-goal-home');
  const btnGAway = document.getElementById('sb-goal-away');
  const btnUpdate = document.getElementById('sb-update');
  const btnStop  = document.getElementById('sb-stop');
  const statusEl = document.getElementById('sb-status');
  const aspectButtons = [...document.querySelectorAll('.demo-card--scoreboard .demo-aspect-btn')];
  const aspectGroup = aspectButtons[0]?.closest('[role="radiogroup"]');

  const liveButtons = [btnNext, btnGHome, btnGAway, btnUpdate, btnStop];
  let isReady = false, isPlaying = false;
  let readinessTimer = null;

  // Fixed resolutions for each aspect ratio (broadcast-standard sizes)
  const RESOLUTIONS = {
    '16/9': { w: 1920, h: 1080 },
    '4/3':  { w: 1440, h: 1080 },
    '1/1':  { w: 1080, h: 1080 },
    '9/16': { w: 1080, h: 1920 },
  };
  let currentRes = RESOLUTIONS['16/9'];

  function send(action, data) {
    iframe.contentWindow.postMessage({ action, data }, MESSAGE_ORIGIN);
  }

  function requestReady() {
    if (!isReady) send('ping');
  }

  iframe.addEventListener('load', requestReady);

  function setStatus(state, text) {
    statusEl.dataset.state = state;
    statusEl.textContent   = text;
  }

  // Scale the fixed-size iframe to fit the player container
  function scaleIframe() {
    const scale = player.clientWidth / currentRes.w;
    iframe.style.setProperty('width',  currentRes.w + 'px', 'important');
    iframe.style.setProperty('height', currentRes.h + 'px', 'important');
    iframe.style.transform = `scale(${scale})`;
  }

  scaleIframe();
  window.addEventListener('resize', scaleIframe);
  if (window.ResizeObserver) {
    new ResizeObserver(scaleIframe).observe(player);
  }

  // -- Aspect ratio switcher --

  function setFormat(button, moveFocus = false) {
    aspectButtons.forEach(candidate => {
      const isSelected = candidate === button;
      candidate.classList.toggle('is-active', isSelected);
      candidate.setAttribute('aria-checked', String(isSelected));
      candidate.tabIndex = isSelected ? 0 : -1;
    });
    const ratio = button.dataset.ratio;
    currentRes = RESOLUTIONS[ratio];
    player.style.setProperty('aspect-ratio', ratio.replace('/', ' / '));
    player.dataset.ratio = ratio;
    scaleIframe();
    if (moveFocus) button.focus();
  }

  aspectButtons.forEach(button => {
    button.addEventListener('click', () => setFormat(button));
  });

  aspectGroup?.addEventListener('keydown', event => {
    const currentIndex = aspectButtons.indexOf(document.activeElement);
    if (currentIndex < 0) return;

    let nextIndex = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + aspectButtons.length) % aspectButtons.length;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % aspectButtons.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = aspectButtons.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    setFormat(aspectButtons[nextIndex], true);
  });

  // -- Messages from the iframe --

  window.addEventListener('message', ({ data, origin, source }) => {
    // Only handle messages from the scoreboard iframe
    if (source !== iframe.contentWindow || origin !== MESSAGE_ORIGIN) return;
    const { event, state } = data ?? {};
    if (!event) return;

    if (event === 'ready') {
      isReady = true;
      window.clearInterval(readinessTimer);
      setStatus('ready', 'Ready');
      btnPlay.disabled = false;
    }
    if (event === 'playing') {
      isPlaying = true;
      setStatus('playing', 'On Air');
      btnPlay.disabled = true;
      liveButtons.forEach(b => b.disabled = false);
    }
    if (event === 'resetting') {
      isPlaying = false;
      setStatus('loading', 'Resetting...');
      btnPlay.disabled = true;
      liveButtons.forEach(b => b.disabled = true);
    }
    if (event === 'stopped') {
      isPlaying = false;
      setStatus('ready', 'Ready');
      btnPlay.disabled = false;
      btnNext.disabled = false;
      btnNext.textContent = 'Kick-off';
      liveButtons.forEach(b => b.disabled = true);
    }
    if (event === 'state' && state) {
      // Update step button label
      const nextLabels = { 'pre-match': 'Kick-off', 'live': 'Half-Time', 'half-time': '2nd Half', 'second-half': 'End Game', 'full-time': 'End Game' };
      btnNext.textContent = nextLabels[state.step] || 'Next Step';
      if (state.step === 'full-time') btnNext.disabled = true;
      const liveSteps = ['live', 'second-half'];
      setStatus('playing', liveSteps.includes(state.step) ? 'Live' : state.step === 'half-time' ? 'Half-Time' : state.step === 'full-time' ? 'Full-Time' : 'On Air');
    }
  });

  requestReady();
  readinessTimer = window.setInterval(requestReady, READY_PING_INTERVAL_MS);
  window.setTimeout(
    () => window.clearInterval(readinessTimer),
    READY_PING_TIMEOUT_MS,
  );

  // -- Button handlers --

  function getTeamData() {
    const home = document.getElementById('sb-home').value.toUpperCase().substring(0, 4);
    const away = document.getElementById('sb-away').value.toUpperCase().substring(0, 4);
    return {
      homeShort: home || 'FCZ',
      awayShort: away || 'AJX',
    };
  }

  btnPlay.addEventListener('click', () => {
    if (!isReady) return;
    send('play', getTeamData());
    btnNext.textContent = 'Kick-off';
  });

  btnNext.addEventListener('click', () => send('step', { delta: 1 }));
  btnGHome.addEventListener('click', () => send('custom', { id: 'goal-home' }));
  btnGAway.addEventListener('click', () => send('custom', { id: 'goal-away' }));

  btnUpdate.addEventListener('click', () => send('update', getTeamData()));

  btnStop.addEventListener('click', () => send('stop'));
})();
