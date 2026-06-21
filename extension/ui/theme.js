// theme.js
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    function updateIcons(isDark) {
        if (isDark) {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        }
    }

    // Initialize Dark Mode from storage
    chrome.storage.local.get(['darkMode'], (result) => {
        if (result.darkMode) {
            document.body.classList.add('dark-mode');
            updateIcons(true);
        } else {
            updateIcons(false);
        }
    });

    // Theme Toggle Handler
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        updateIcons(isDark);
        chrome.storage.local.set({ darkMode: isDark });
    });
});
