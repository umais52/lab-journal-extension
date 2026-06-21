// This script is injected into LMS pages to add checkboxes to assignment rows.
(function () {
    if (!window.LMS_CONFIG) {
        console.error("LMS config not found!");
        return;
    }

    const config = window.LMS_CONFIG;

    function init() {
        const rows = document.querySelectorAll(config.rowSelector);
        if (rows.length === 0) return;

        // Inject a floating action button
        injectFAB();

        let firstRow = null;

        rows.forEach(row => {
            // Check if already injected
            if (row.querySelector('.lms-journal-checkbox')) {
                if (!firstRow) firstRow = row;
                return;
            }

            let linkEl = null;
            const potentialLinks = row.querySelectorAll(config.downloadLinkSelector);
            if (config.downloadLinkTextContains) {
                const targetText = config.downloadLinkTextContains.toLowerCase();
                for (let i = 0; i < potentialLinks.length; i++) {
                    if (potentialLinks[i].innerText.toLowerCase().includes(targetText)) {
                        linkEl = potentialLinks[i];
                        break;
                    }
                }
            }
            if (!linkEl && potentialLinks.length > 0) {
                linkEl = potentialLinks[0];
            }

            const titleEl = row.querySelector(config.titleSelector);

            if (!linkEl || !linkEl.href) return;

            const title = titleEl ? titleEl.innerText.trim() : 'Unknown Assignment';
            const url = linkEl.href;

            // Generate a unique ID
            const id = 'item_' + Math.random().toString(36).substr(2, 9);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'lms-journal-checkbox';
            checkbox.dataset.id = id;
            checkbox.dataset.title = title;
            checkbox.dataset.url = url;
            checkbox.style.margin = '0 10px';
            checkbox.style.transform = 'scale(1.5)';
            checkbox.style.cursor = 'pointer';

            if (config.checkboxPosition === 'prepend') {
                if (row.tagName.toLowerCase() === 'tr') {
                    const td = document.createElement('td');
                    td.style.verticalAlign = 'middle';
                    td.style.textAlign = 'center';
                    td.appendChild(checkbox);
                    row.insertBefore(td, row.firstChild);
                } else {
                    row.insertBefore(checkbox, row.firstChild);
                }
            } else {
                if (row.tagName.toLowerCase() === 'tr') {
                    const td = document.createElement('td');
                    td.style.verticalAlign = 'middle';
                    td.style.textAlign = 'center';
                    td.appendChild(checkbox);
                    row.appendChild(td);
                } else {
                    row.appendChild(checkbox);
                }
            }

            if (!firstRow) firstRow = row;
        });

        if (firstRow) {
            injectSelectAllCheckbox(firstRow);
        }
    }

    function injectSelectAllCheckbox(firstRow) {
        const table = firstRow.closest('table');
        if (!table) return;

        if (table.querySelector('.lms-journal-select-all')) return;

        // Try to find the header row
        let headerRow = table.querySelector('thead tr');
        if (!headerRow) {
            const allTrs = table.querySelectorAll('tr');
            if (allTrs.length > 0 && allTrs[0] !== firstRow) {
                headerRow = allTrs[0];
            }
        }

        if (!headerRow) return;

        const selectAllCb = document.createElement('input');
        selectAllCb.type = 'checkbox';
        selectAllCb.className = 'lms-journal-select-all';
        selectAllCb.style.margin = '0 10px';
        selectAllCb.style.transform = 'scale(1.5)';
        selectAllCb.style.cursor = 'pointer';

        selectAllCb.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const checkboxes = table.querySelectorAll('.lms-journal-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = checked;
            });
        });

        const th = document.createElement('th');
        th.style.verticalAlign = 'middle';
        th.style.textAlign = 'center';
        th.appendChild(selectAllCb);

        if (config.checkboxPosition === 'prepend') {
            headerRow.insertBefore(th, headerRow.firstChild);
        } else {
            headerRow.appendChild(th);
        }
    }

    function injectFAB() {
        if (document.getElementById('lms-journal-fab')) return;

        const fab = document.createElement('button');
        fab.id = 'lms-journal-fab';
        fab.innerText = 'Compile';
        fab.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 999999;
            width: 86.525px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgb(0, 128, 0);
            color: white;
            border: 2px solid #00c0ef;
            border-radius: 5px;
            font-size: 14px;    
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        fab.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.lms-journal-checkbox:checked');
            const selectedItems = [];

            checkboxes.forEach(cb => {
                selectedItems.push({
                    id: cb.dataset.id,
                    title: cb.dataset.title,
                    sourceUrl: cb.dataset.url
                });
                cb.checked = false; // uncheck after adding
            });

            if (selectedItems.length > 0) {
                // Check if the extension was updated and context is invalidated
                if (typeof chrome.runtime?.id === 'undefined') {
                    alert('The Lab Journal extension was updated in the background.\n\nPlease REFRESH this LMS webpage (press F5) to continue using the compiler.');
                    return;
                }

                try {
                    chrome.runtime.sendMessage({
                        type: 'OPEN_COMPILER_VIEW',
                        payload: { selectedAssignments: selectedItems }
                    });
                } catch (e) {
                    alert('The Lab Journal extension was updated in the background.\n\nPlease REFRESH this LMS webpage (press F5) to continue using the compiler.');
                }
            } else {
                alert('No items selected.');
            }
        });

        document.body.appendChild(fab);
    }

    // Run after a short delay to allow dynamic content to load (like SPAs)
    setTimeout(init, 2000);
    // Optional: add a MutationObserver if the LMS loads items dynamically
})();
