/*
 * Multi-device stage demo
 * -------------------------------------------------------------
 * Drives the three <ograf-lower-third> instances inside the stage
 * composition (TV, Tablet, Phone). Each instance lives in a logical
 * output canvas with the same aspect ratio as its device. The canvas
 * is scaled to the visible screen while the Graphic derives its own
 * responsive layout from the output dimensions.
 *
 * The LT is the OGraf graphic. Everything else on each screen - the
 * background video, the dark scrim, the device frame - is demo
 * dressing to give the graphic a realistic context. None of that is
 * part of the OGraf spec or template.
 *
 * Architecture (post-iframe migration):
 *   <div .stage-device__screen>
 *     <video .stage-device__bg-video>            <- demo content
 *     <div   .stage-device__bg-overlay>          <- demo content
 *     <div   .stage-device__canvas>              <- logical output, JS-scaled
 *       <ograf-lower-third>                      <- the actual OGraf graphic
 *
 * We talk to the graphic via direct method calls on the custom
 * element (load / playAction / stopAction / updateAction), not via
 * postMessage - there's no iframe boundary anymore.
 */
(function () {
  const screens = [...document.querySelectorAll('.stage-device__screen')];
  const lts     = [...document.querySelectorAll('ograf-lower-third.stage-device__graphic')];
  const backgroundVideos = [...document.querySelectorAll('.stage-device__bg-video')];
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const section = document.querySelector('.section-stage');
  let backgroundVideosActivated = false;
  if (!lts.length) return;

  function loadBackgroundVideos() {
    if (backgroundVideosActivated || motionQuery.matches) return;
    backgroundVideosActivated = true;
    backgroundVideos.forEach(video => {
      video.querySelectorAll('source[data-src]').forEach(source => {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
      });
      video.load();
    });
  }

  function syncBackgroundVideos() {
    backgroundVideos.forEach(video => {
      if (motionQuery.matches || !backgroundVideosActivated) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch (_) {
          /* The video has not loaded enough metadata to seek yet. */
        }
      } else {
        video.play().catch(() => {
          /* Muted video playback can still be blocked by host policy. */
        });
      }
    });
  }

  function activateBackgroundVideos() {
    loadBackgroundVideos();
    syncBackgroundVideos();
  }

  if (section && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      videoObserver.disconnect();
      activateBackgroundVideos();
    }, { rootMargin: '300px 0px' });
    videoObserver.observe(section);
  } else {
    activateBackgroundVideos();
  }

  motionQuery.addEventListener('change', () => {
    if (!motionQuery.matches && section?.getBoundingClientRect().top < window.innerHeight + 300) {
      loadBackgroundVideos();
    }
    syncBackgroundVideos();
  });

  // -- Form / control elements -------------------------------
  const btnToggle = document.getElementById('stage-toggle');
  const btnLabel  = btnToggle ? btnToggle.querySelector('.stage-btn__label') : null;
  const nameIn    = document.getElementById('stage-name');
  const titleIn   = document.getElementById('stage-title');
  const channelIn = document.getElementById('stage-channel');
  const sync      = document.getElementById('stage-sync');
  const syncStatus = sync ? sync.querySelector('.stage__sync-status') : null;
  const syncDetail = sync ? sync.querySelector('.stage__sync-detail') : null;
  let isPlaying   = false;

  // -- Logical output resolution ------------------------------
  const LOGICAL_OUTPUT_HEIGHT = 1080;

  function setSync(state, status, detail = 'All devices') {
    if (!sync) return;
    sync.dataset.state = state;
    if (syncStatus) syncStatus.textContent = status;
    if (syncDetail) syncDetail.textContent = detail;
  }

  function setToggleState(playing) {
    isPlaying = playing;
    if (!btnToggle) return;
    btnToggle.classList.toggle('is-playing', playing);
    if (btnLabel) btnLabel.textContent = playing ? 'Stop' : 'Play In';
  }

  function ltData() {
    return {
      name:    (nameIn.value    || 'Anders Berg').trim(),
      title:   (titleIn.value   || 'Senior Correspondent').trim(),
      channel: (channelIn.value || 'OGraf News').trim(),
    };
  }

  // -- Canvas scaling ----------------------------------------
  // Give every Graphic a real output aspect ratio instead of cropping
  // a 16:9 canvas. A constant logical height keeps typography scaled
  // consistently across the three physical device mockups.
  function scaleCanvas(screen) {
    const canvas = screen.querySelector('.stage-device__canvas');
    if (!canvas) return;
    const screenWidth = screen.clientWidth;
    const screenHeight = screen.clientHeight;
    if (!(screenWidth > 0) || !(screenHeight > 0)) return;

    const logicalWidth = Math.round(
      LOGICAL_OUTPUT_HEIGHT * screenWidth / screenHeight
    );
    const scale = screenHeight / LOGICAL_OUTPUT_HEIGHT;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${LOGICAL_OUTPUT_HEIGHT}px`;
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.transform = `scale(${scale})`;
  }

  function renderCharacteristics(graphic) {
    const canvas = graphic.closest('.stage-device__canvas');

    return {
      resolution: {
        width: Number.parseFloat(canvas.style.width),
        height: Number.parseFloat(canvas.style.height)
      }
    };
  }
  function scaleAll() { screens.forEach(scaleCanvas); }
  scaleAll();
  window.addEventListener('resize', scaleAll);
  if (window.ResizeObserver) {
    screens.forEach(s => new ResizeObserver(() => scaleCanvas(s)).observe(s));
  }

  // -- Custom-element lifecycle ------------------------------
  // graphic.mjs is loaded as `type="module"` (deferred), so it
  // registers <ograf-lower-third> after this script has finished
  // running. We wait for the upgrade and then call OGraf's
  // load() lifecycle method on every instance to build their
  // internal DOM into a hidden initial state - so the very first
  // play() animates instantly without a "first build" stutter.
  customElements.whenDefined('ograf-lower-third').then(async () => {
    await Promise.all(lts.map(el => el.load({
      data: ltData(),
      renderType: 'realtime',
      renderCharacteristics: renderCharacteristics(el)
    })));
    if (btnToggle) btnToggle.disabled = false;
    setSync('ready', 'Ready');
  });

  // -- Toggle button -----------------------------------------
  if (btnToggle) {
    btnToggle.addEventListener('click', async () => {
      activateBackgroundVideos();
      if (isPlaying) {
        // Optimistic UI update - animation runs after.
        setToggleState(false);
        setSync('ready', 'Ready');
        await Promise.all(lts.map(el => el.stopAction({ skipAnimation: false })));
      } else {
        const data = ltData();
        // Apply latest input data silently before the in-animation,
        // so the LT slides in showing the current form values rather
        // than whatever was loaded last.
        await Promise.all(lts.map(el => el.updateAction({
          data,
          skipAnimation: true
        })));
        setToggleState(true);
        setSync('live', 'On Air');
        await Promise.all(lts.map(el => el.playAction({
          goto: 0,
          skipAnimation: false
        })));
      }
    });
  }

  // -- Live update on input ----------------------------------
  // updateAction is a no-op when the LT is hidden (silently swaps
  // internal state) and animates the text out/in when on-air -
  // works in every state without gating.
  [nameIn, titleIn, channelIn].forEach(input => {
    input.addEventListener('input', () => {
      const data = ltData();
      lts.forEach(el => el.updateAction({ data }));
    });
  });

  // -- Auto-play on first scroll into the section ------------
  // The whole point of the section is to *show* the LT running on
  // every device. If the user never clicks Play they just see the
  // muted backgrounds, so we trigger Play once on their behalf when
  // the section enters the viewport.
  //
  // Skipped when:
  //   - user prefers reduced motion
  //   - user has already interacted with the toggle
  //   - we already auto-played once (one-shot per page load)
  if (section && 'IntersectionObserver' in window) {
    let autoPlayed     = false;
    let userInteracted = false;
    let io             = null;
    let autoPlayTimer  = null;

    const stopAutoPlayTracking = () => {
      if (io) io.disconnect();
      io = null;
      window.clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    };

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        userInteracted = true;
        stopAutoPlayTracking();
      }, { once: true });
    }

    const tryAutoPlay = async () => {
      autoPlayTimer = null;
      if (autoPlayed || userInteracted || motionQuery.matches) return;
      autoPlayed = true;
      stopAutoPlayTracking();

      // Element might not have been defined / loaded yet on slow
      // networks - wait for both before triggering play.
      await customElements.whenDefined('ograf-lower-third');
      if (userInteracted || motionQuery.matches) {
        autoPlayed = false;
        return;
      }
      const data = ltData();
      await Promise.all(lts.map(el => el.updateAction({
        data,
        skipAnimation: true
      })));
      setToggleState(true);
      setSync('live', 'On Air');
      lts.forEach(el => el.playAction({ goto: 0, skipAnimation: false }));
    };

    const observeForAutoPlay = () => {
      if (autoPlayed || userInteracted || motionQuery.matches || io) return;
      io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && autoPlayTimer === null) {
            autoPlayTimer = window.setTimeout(tryAutoPlay, 250);
          }
        }
      }, { threshold: 0.35 });
      io.observe(section);
    };

    motionQuery.addEventListener('change', async () => {
      if (motionQuery.matches) {
        stopAutoPlayTracking();
        if (autoPlayed && isPlaying && !userInteracted) {
          setToggleState(false);
          setSync('ready', 'Ready');
          await Promise.all(lts.map(el => el.stopAction({ skipAnimation: true })));
        }
      } else {
        observeForAutoPlay();
      }
    });

    observeForAutoPlay();
  }
})();
