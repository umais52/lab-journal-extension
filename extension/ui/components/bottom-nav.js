// extension/ui/components/bottom-nav.js

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            chrome.storage.session.set({ currentView: target });
        });
    });
});
