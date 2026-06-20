// extension/ui/dashboard.js
import { HARDCODED_EXTENSIONS } from '../background/hardcoded-extensions.js';

const dashboardCards = document.getElementById('dashboard-cards');
const customExtContainer = document.getElementById('custom-extensions-container');
const addCustomExtBtn = document.getElementById('add-custom-ext-btn');
const restoreDefaultsBtn = document.getElementById('restore-defaults-btn');
const customExtModal = document.getElementById('custom-ext-modal');
const saveCustomExtBtn = document.getElementById('save-custom-ext');
const cancelCustomExtBtn = document.getElementById('cancel-custom-ext');
const openWebstoreBtn = document.getElementById('open-webstore-btn');

const customExtSelect = document.getElementById('custom-ext-select');

async function checkInstallStatus(id) {
    return new Promise((resolve) => {
        chrome.management.get(id, (info) => {
            if (chrome.runtime.lastError || !info) {
                resolve(null);
            } else {
                resolve(info);
            }
        });
    });
}

function createExtensionCard(ext, isCustom = false) {
    const card = document.createElement('div');
    card.className = 'extension-card';

    const icon = document.createElement('div');
    icon.className = 'extension-icon';
    // Display custom name if exists, else original name
    const currentName = ext.customName || ext.name;
    icon.textContent = currentName ? currentName.substring(0, 2).toUpperCase() : 'EX';

    const info = document.createElement('div');
    info.className = 'extension-info';

    const nameContainer = document.createElement('div');
    nameContainer.style.display = 'flex';
    nameContainer.style.alignItems = 'center';

    const name = document.createElement('h4');
    name.className = 'extension-name';
    name.textContent = currentName;
    name.style.margin = '0';
    name.style.paddingRight = '8px';

    const editBtn = document.createElement('span');
    editBtn.innerHTML = '&#9998;'; // pencil icon
    editBtn.style.cursor = 'pointer';
    editBtn.style.fontSize = '14px';
    editBtn.style.color = '#6b7280';
    editBtn.title = 'Edit Name';
    editBtn.onclick = () => {
        const newName = prompt("Enter new name for this extension:", name.textContent);
        if (newName && newName.trim() !== "") {
            saveCustomName(ext.id, newName.trim());
        }
    };

    nameContainer.appendChild(name);
    nameContainer.appendChild(editBtn);

    const status = document.createElement('p');
    status.className = 'extension-status';
    status.textContent = 'Checking...';

    info.appendChild(nameContainer);
    info.appendChild(status);

    const action = document.createElement('div');
    action.className = 'extension-action';

    const actionBtn = document.createElement('button');
    actionBtn.className = 'btn btn-secondary';
    actionBtn.textContent = 'Wait';
    actionBtn.disabled = true;

    action.appendChild(actionBtn);

    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(action);

    // Delete button for ALL extensions
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-item';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.style.marginLeft = '10px';
    deleteBtn.style.fontSize = '20px';
    deleteBtn.title = 'Remove Extension';
    deleteBtn.onclick = () => {
        if (isCustom) {
            deleteCustomExtension(ext.id);
        } else {
            hideHardcodedExtension(ext.id);
        }
    };
    card.appendChild(deleteBtn);

    // Default local icon fallback if not installed
    if (ext.icon && !isCustom) {
        icon.textContent = '';
        const img = document.createElement('img');
        img.src = `../${ext.icon}`;
        img.alt = 'icon';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.addEventListener('error', function () {
            this.style.display = 'none';
            icon.textContent = currentName ? currentName.substring(0, 2).toUpperCase() : 'EX';
        });
        icon.appendChild(img);
    }

    // Check status asynchronously
    checkInstallStatus(ext.id).then(info => {
        actionBtn.disabled = false;
        if (info) {
            // Only update name if user hasn't set a custom one
            if (!ext.customName) {
                name.textContent = info.name;
                // update fallback text in case icon fails
                if (!icon.querySelector('img')) {
                    icon.textContent = info.name.substring(0, 2).toUpperCase();
                }
            }

            // Render the official Chrome extension icon using chrome protocol
            icon.textContent = '';
            const img = document.createElement('img');
            img.src = `chrome://extension-icon/${ext.id}/128/1`;
            img.alt = 'icon';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.addEventListener('error', function () {
                // Try fallback to the URL provided in info.icons if chrome protocol fails
                const fallbackUrl = (info.icons && info.icons.length > 0) ? info.icons[info.icons.length - 1].url : null;
                if (fallbackUrl && this.src !== fallbackUrl) {
                    this.src = fallbackUrl;
                } else {
                    this.style.display = 'none';
                    icon.textContent = (ext.customName || info.name).substring(0, 2).toUpperCase();
                }
            });
            icon.appendChild(img);

            status.textContent = info.enabled ? 'Installed & Enabled' : 'Installed & Disabled';
            status.style.color = info.enabled ? '#10b981' : '#f59e0b';
            actionBtn.textContent = 'Manage';
            actionBtn.className = 'btn btn-secondary';
            actionBtn.style.padding = '8px 12px';
            actionBtn.style.fontSize = '0.8rem';
            actionBtn.onclick = () => {
                chrome.tabs.create({ url: `chrome://extensions/?id=${ext.id}` });
            };
        } else {
            status.textContent = 'Not installed';
            actionBtn.textContent = 'Install';
            actionBtn.className = 'btn btn-primary';
            actionBtn.style.padding = '8px 12px';
            actionBtn.style.fontSize = '0.8rem';
            actionBtn.onclick = () => {
                chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/${ext.id}` });
            };
        }
    });

    return card;
}

async function renderDashboard() {
    dashboardCards.innerHTML = '';
    customExtContainer.innerHTML = '';

    chrome.storage.local.get(['customExtensions', 'hiddenExtensions', 'customNames'], (result) => {
        const custom = result.customExtensions || [];
        const hidden = result.hiddenExtensions || [];
        const customNames = result.customNames || {};

        if (hidden.length > 0) {
            restoreDefaultsBtn.style.display = 'block';
        } else {
            restoreDefaultsBtn.style.display = 'none';
        }

        // Render Hardcoded
        HARDCODED_EXTENSIONS.forEach(ext => {
            if (!hidden.includes(ext.id) && !custom.find(c => c.id === ext.id)) {
                dashboardCards.appendChild(createExtensionCard({ ...ext, customName: customNames[ext.id] }, false));
            }
        });

        // Render Custom
        custom.forEach(ext => {
            customExtContainer.appendChild(createExtensionCard({ ...ext, customName: customNames[ext.id] }, true));
        });
    });
}

function saveCustomName(id, newName) {
    chrome.storage.local.get(['customNames'], (result) => {
        const customNames = result.customNames || {};
        customNames[id] = newName;
        chrome.storage.local.set({ customNames }, renderDashboard);
    });
}

function deleteCustomExtension(id) {
    chrome.storage.local.get(['customExtensions'], (result) => {
        let custom = result.customExtensions || [];
        custom = custom.filter(ext => ext.id !== id);
        chrome.storage.local.set({ customExtensions: custom }, renderDashboard);
    });
}

function hideHardcodedExtension(id) {
    chrome.storage.local.get(['hiddenExtensions'], (result) => {
        let hidden = result.hiddenExtensions || [];
        if (!hidden.includes(id)) {
            hidden.push(id);
            chrome.storage.local.set({ hiddenExtensions: hidden }, renderDashboard);
        }
    });
}

// Modal Handlers
restoreDefaultsBtn.addEventListener('click', () => {
    chrome.storage.local.remove('hiddenExtensions', renderDashboard);
});

addCustomExtBtn.addEventListener('click', () => {
    chrome.management.getAll((extensions) => {
        customExtSelect.innerHTML = '<option value="">Select an installed extension...</option>';

        chrome.storage.local.get(['customExtensions', 'hiddenExtensions'], (result) => {
            const custom = result.customExtensions || [];
            const hidden = result.hiddenExtensions || [];
            const activeIds = new Set();
            HARDCODED_EXTENSIONS.forEach(e => {
                if (!hidden.includes(e.id)) activeIds.add(e.id);
            });
            custom.forEach(e => activeIds.add(e.id));

            extensions.forEach(ext => {
                if (ext.type === 'extension' && ext.id !== chrome.runtime.id && !activeIds.has(ext.id)) {
                    const opt = document.createElement('option');
                    opt.value = ext.id;
                    opt.textContent = ext.name;
                    customExtSelect.appendChild(opt);
                }
            });
            customExtModal.style.display = 'flex';
        });
    });
});

cancelCustomExtBtn.addEventListener('click', () => {
    customExtModal.style.display = 'none';
});

saveCustomExtBtn.addEventListener('click', () => {
    const rawId = customExtSelect.value;
    if (!rawId) {
        alert("Please select an extension.");
        return;
    }

    const name = customExtSelect.options[customExtSelect.selectedIndex].text;

    chrome.storage.local.get(['customExtensions'], (result) => {
        const custom = result.customExtensions || [];
        // Prevent duplicates
        if (custom.find(e => e.id === rawId)) {
            alert("Extension is already in your custom list.");
            return;
        }

        custom.push({ id: rawId, name: name });
        chrome.storage.local.set({ customExtensions: custom }, () => {
            customExtModal.style.display = 'none';
            renderDashboard();
        });
    });
});

openWebstoreBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: "https://chromewebstore.google.com/" });
});

document.addEventListener('DOMContentLoaded', renderDashboard);
