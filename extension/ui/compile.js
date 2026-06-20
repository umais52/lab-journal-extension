let currentQueue = [];

// DOM Elements
const queueList = document.getElementById('queue-list');
const compileBtn = document.getElementById('compile-btn');
const compileStatus = document.getElementById('compile-status');
const titlePageUpload = document.getElementById('title-page-upload');
const customFileUpload = document.getElementById('custom-file-upload');
const clearQueueBtn = document.getElementById('clear-queue');

// Initialize Sortable
const sortable = new Sortable(queueList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: function () {
        updateOrderFromDOM();
    }
});

// Load initial queue
chrome.runtime.sendMessage({ type: 'GET_QUEUE' }, (response) => {
    if (response && response.queue) {
        currentQueue = response.queue;
        renderQueue();
    }
});

// Listen for updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'QUEUE_UPDATED') {
        currentQueue = message.queue;
        renderQueue();
    }
});

function renderQueue() {
    queueList.innerHTML = '';
    
    let allReady = true;
    let hasItems = currentQueue.length > 0;

    currentQueue.forEach(item => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        li.dataset.id = item.id;
        
        if (item.status !== 'ready') allReady = false;

        let icon = '📄';
        if (item.isTitlePage) icon = '🏷️';
        else if (item.status === 'downloading') icon = '⬇️';
        else if (item.status === 'converting') icon = '⚙️';
        else if (item.status === 'failed') icon = '❌';

        li.innerHTML = `
            <div class="item-icon">${icon}</div>
            <div class="item-details">
                <div class="item-title">${item.title}</div>
                <div class="item-status status-${item.status}">${item.status}</div>
            </div>
            <div class="delete-item" title="Remove file">✖</div>
            <div class="drag-handle">☰</div>
        `;
        
        // Add event listener to delete button
        li.querySelector('.delete-item').addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'REMOVE_ITEM', id: item.id });
        });

        queueList.appendChild(li);
    });

    compileBtn.disabled = !hasItems || !allReady;
}

function updateOrderFromDOM() {
    const newOrderIds = Array.from(queueList.children).map(li => li.dataset.id);
    const reorderedQueue = [];
    
    newOrderIds.forEach(id => {
        const item = currentQueue.find(q => q.id === id);
        if (item) reorderedQueue.push(item);
    });
    
    // Ensure title page is always at the top if it exists
    const titleIdx = reorderedQueue.findIndex(q => q.isTitlePage);
    if (titleIdx > 0) {
        const titleItem = reorderedQueue.splice(titleIdx, 1)[0];
        reorderedQueue.unshift(titleItem);
        // Force re-render to snap back
        currentQueue = reorderedQueue;
        renderQueue();
        chrome.runtime.sendMessage({ type: 'UPDATE_QUEUE_ORDER', queue: currentQueue });
        return;
    }

    currentQueue = reorderedQueue;
    chrome.runtime.sendMessage({ type: 'UPDATE_QUEUE_ORDER', queue: currentQueue });
}

clearQueueBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_QUEUE' });
});

async function handleFileUpload(file, isTitlePage) {
    if (!file) return;
    
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    let base64 = null;
    let status = 'ready';
    
    const id = 'local_' + Math.random().toString(36).substr(2, 9);
    
    if (isPdf) {
        base64 = await fileToBase64(file);
        chrome.runtime.sendMessage({
            type: 'ADD_LOCAL_FILE',
            item: {
                id,
                title: (isTitlePage ? '[Title] ' : '') + file.name,
                base64,
                isTitlePage
            }
        });
    } else {
        // Needs conversion via backend
        compileStatus.innerText = `Converting ${file.name}...`;
        compileStatus.className = 'status-converting';
        try {
            const formData = new FormData();
            formData.append('file', file, file.name);

            const res = await fetch('http://127.0.0.1:5000/convert', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Conversion failed');

            const pdfBlob = await res.blob();
            base64 = await fileToBase64(pdfBlob);
            
            chrome.runtime.sendMessage({
                type: 'ADD_LOCAL_FILE',
                item: {
                    id,
                    title: (isTitlePage ? '[Title] ' : '') + file.name,
                    base64,
                    isTitlePage
                }
            });
            compileStatus.innerText = '';
        } catch (e) {
            console.error(e);
            compileStatus.innerText = `Failed to convert ${file.name}`;
            compileStatus.className = 'status-failed';
        }
    }
}

titlePageUpload.addEventListener('change', (e) => {
    handleFileUpload(e.target.files[0], true);
    e.target.value = '';
});

customFileUpload.addEventListener('change', (e) => {
    handleFileUpload(e.target.files[0], false);
    e.target.value = '';
});

compileBtn.addEventListener('click', async () => {
    compileBtn.disabled = true;
    compileStatus.innerText = 'Merging PDFs...';
    compileStatus.className = 'status-converting';

    try {
        const formData = new FormData();
        
        for (let i = 0; i < currentQueue.length; i++) {
            const item = currentQueue[i];
            if (item.blobRef && item.status === 'ready') {
                const blob = await fetch(item.blobRef).then(r => r.blob());
                // Give each file a distinct name in form
                formData.append('files', blob, `file_${i}.pdf`);
            }
        }

        const res = await fetch('http://127.0.0.1:5000/merge', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Merge failed');

        const mergedBlob = await res.blob();
        const mergedUrl = URL.createObjectURL(mergedBlob);

        // Download the final PDF
        chrome.downloads.download({
            url: mergedUrl,
            filename: `Lab_Journal_${new Date().toISOString().split('T')[0]}.pdf`
        });

        compileStatus.innerText = 'Success! Downloading...';
        compileStatus.className = 'status-ready';
    } catch (e) {
        console.error(e);
        compileStatus.innerText = 'Merge failed. Is the backend running?';
        compileStatus.className = 'status-failed';
    } finally {
        compileBtn.disabled = false;
    }
});

function fileToBase64(file) {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
}
