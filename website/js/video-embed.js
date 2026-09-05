(function () {
    const embed = document.querySelector('.section-video__embed[data-video-id]');
    if (!embed) return;

    const consentButton = embed.querySelector('.section-video__consent');
    if (!consentButton) return;

    consentButton.addEventListener('click', () => {
        const videoId = embed.dataset.videoId;
        if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
        iframe.title = 'OGraf workflow - from design to playout';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.tabIndex = 0;

        embed.replaceChildren(iframe);
        iframe.focus();
    }, { once: true });
})();
