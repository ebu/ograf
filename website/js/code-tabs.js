(function () {
    const tabLists = document.querySelectorAll('.code-block__tabs[role="tablist"]');

    function activateTab(tabs, panels, selectedTab, moveFocus = false) {
        tabs.forEach(tab => {
            const isSelected = tab === selectedTab;
            tab.classList.toggle('is-active', isSelected);
            tab.setAttribute('aria-selected', String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
        });

        panels.forEach(panel => {
            const isSelected = panel.id === selectedTab.getAttribute('aria-controls');
            panel.classList.toggle('is-active', isSelected);
            panel.hidden = !isSelected;
        });

        if (moveFocus) selectedTab.focus();
    }

    tabLists.forEach(tabList => {
        const block = tabList.closest('.code-block');
        const tabs = [...tabList.querySelectorAll('[role="tab"]')];
        const panels = [...block.querySelectorAll('[role="tabpanel"]')];

        tabs.forEach(tab => {
            tab.addEventListener('click', () => activateTab(tabs, panels, tab));
        });

        tabList.addEventListener('keydown', event => {
            const currentIndex = tabs.indexOf(document.activeElement);
            if (currentIndex < 0) return;

            let nextIndex = null;
            if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = tabs.length - 1;
            if (nextIndex === null) return;

            event.preventDefault();
            activateTab(tabs, panels, tabs[nextIndex], true);
        });
    });
})();
