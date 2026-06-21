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

        let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#9ca3af" viewBox="0 0 16 16"><path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2l-3-3zM4.5 9a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7zM4 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4z"/></svg>';
        if (item.isTitlePage) icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#f29c11" viewBox="0 0 16 16"><path d="M6 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-1 0a.5.5 0 1 0-1 0 .5.5 0 0 0 1 0z"/><path d="M2 1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 1 6.586V2a1 1 0 0 1 1-1zm0 5.586 7 7L13.586 9l-7-7H2v4.586z"/></svg>';
        else if (item.status === 'downloading') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#3b82f6" viewBox="0 0 16 16"><path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"/><path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z"/></svg>';
        else if (item.status === 'converting') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#f59e0b" viewBox="0 0 16 16"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>';
        else if (item.status === 'failed') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ef4444" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';

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
