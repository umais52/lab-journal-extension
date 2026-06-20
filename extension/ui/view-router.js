// extension/ui/view-router.js

const dashboardView = document.getElementById('dashboard-view');
const compilerView = document.getElementById('compiler-view');
const navItems = document.querySelectorAll('.nav-item');

function switchView(viewName) {
    if (viewName === 'dashboard') {
        dashboardView.style.display = 'flex';
        compilerView.style.display = 'none';
    } else if (viewName === 'compiler') {
        dashboardView.style.display = 'none';
        compilerView.style.display = 'flex';
    }

    navItems.forEach(item => {
        if (item.dataset.target === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Initial load
chrome.storage.session.get(['currentView'], (result) => {
    const view = result.currentView || 'dashboard';
    switchView(view);
});

// Listen for background script changes (e.g., OPEN_COMPILER_VIEW)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'session' && changes.currentView) {
        switchView(changes.currentView.newValue);
    }
});
