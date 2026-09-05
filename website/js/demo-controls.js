(function () {
    const MESSAGE_ORIGIN = window.location.origin;
    const READY_PING_INTERVAL_MS = 250;
    const READY_PING_TIMEOUT_MS = 10_000;
    const FORMATS = {
        '16/9': { width: 1920, height: 1080 },
        '4/3': { width: 1440, height: 1080 },
        '1/1': { width: 1080, height: 1080 },
        '9/16': { width: 1080, height: 1920 }
    };

    function initialiseController(controller) {
        const iframe = controller.querySelector('[data-demo-iframe]');
        const player = controller.querySelector('[data-demo-player]');
        const btnPlay = controller.querySelector('[data-demo-action="play"]');
        const btnUpdate = controller.querySelector('[data-demo-action="update"]');
        const btnStop = controller.querySelector('[data-demo-action="stop"]');
        const customActionButtons = [
            ...controller.querySelectorAll('[data-demo-custom-action]')
        ];
        const statusEl = controller.querySelector('[data-demo-status]');
        const aspectButtons = [...controller.querySelectorAll('.demo-aspect-btn')];
        const aspectGroup = aspectButtons[0]?.closest('[role="radiogroup"]');
        const fields = Object.fromEntries(
            [...controller.querySelectorAll('[data-demo-field]')]
                .map(field => [field.dataset.demoField, field])
        );

        let isReady = false;
        let readinessTimer = null;
        let currentFormat = FORMATS[player.dataset.ratio || '16/9'];

        function send(action, data) {
            iframe.contentWindow.postMessage({ action, data }, MESSAGE_ORIGIN);
        }

        function getFieldData() {
            return Object.fromEntries(
                Object.entries(fields).map(([name, field]) => {
                    const value = field.dataset.demoValueType === 'number'
                        ? Number(field.value)
                        : field.value;

                    return [name, value];
                })
            );
        }

        function setStatus(state, text) {
            statusEl.dataset.state = state;
            statusEl.textContent = text;
        }

        function scaleIframe() {
            const scale = player.clientWidth / currentFormat.width;
            iframe.style.setProperty('width', `${currentFormat.width}px`, 'important');
            iframe.style.setProperty('height', `${currentFormat.height}px`, 'important');
            iframe.style.transform = `scale(${scale})`;
        }

        function setFormat(ratio, moveFocus = false) {
            currentFormat = FORMATS[ratio];
            player.dataset.ratio = ratio;
            aspectButtons.forEach(button => {
                const isSelected = button.dataset.ratio === ratio;
                button.classList.toggle('is-active', isSelected);
                button.setAttribute('aria-checked', String(isSelected));
                button.tabIndex = isSelected ? 0 : -1;
            });
            scaleIframe();
            if (moveFocus) {
                aspectButtons.find(button => button.dataset.ratio === ratio)?.focus();
            }
        }

        iframe.addEventListener('load', () => {
            requestReady();
        });
        aspectButtons.forEach(button => {
            button.addEventListener('click', () => setFormat(button.dataset.ratio));
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
            setFormat(aspectButtons[nextIndex].dataset.ratio, true);
        });
        scaleIframe();
        window.addEventListener('resize', scaleIframe);
        if (window.ResizeObserver) {
            new ResizeObserver(scaleIframe).observe(player);
        }

        window.addEventListener('message', ({ data, origin, source }) => {
            if (source !== iframe.contentWindow || origin !== MESSAGE_ORIGIN) return;
            const { event } = data ?? {};
            if (!event) return;

            if (event === 'ready') {
                isReady = true;
                window.clearInterval(readinessTimer);
                setStatus('ready', 'Ready');
                btnPlay.disabled = false;
            }
            if (event === 'playing') {
                setStatus('playing', 'On Air');
                btnPlay.disabled = true;
                btnUpdate.disabled = false;
                btnStop.disabled = false;
                customActionButtons.forEach(button => { button.disabled = false; });
            }
            if (event === 'resetting') {
                setStatus('loading', 'Resetting...');
                btnPlay.disabled = true;
                btnUpdate.disabled = true;
                btnStop.disabled = true;
                customActionButtons.forEach(button => { button.disabled = true; });
            }
            if (event === 'stopped') {
                setStatus('ready', 'Ready');
                btnPlay.disabled = false;
                btnUpdate.disabled = true;
                btnStop.disabled = true;
                customActionButtons.forEach(button => { button.disabled = true; });
            }
        });

        function requestReady() {
            if (!isReady) send('ping');
        }

        requestReady();
        readinessTimer = window.setInterval(requestReady, READY_PING_INTERVAL_MS);
        window.setTimeout(
            () => window.clearInterval(readinessTimer),
            READY_PING_TIMEOUT_MS
        );

        btnPlay.addEventListener('click', () => {
            if (isReady) send('play', getFieldData());
        });
        btnUpdate.addEventListener('click', () => send('update', getFieldData()));
        customActionButtons.forEach(button => {
            button.addEventListener('click', () => send('custom', {
                id: button.dataset.demoCustomAction
            }));
        });
        btnStop.addEventListener('click', () => send('stop'));
    }

    document.querySelectorAll('[data-demo-controller]').forEach(initialiseController);
})();
