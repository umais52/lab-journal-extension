// Background Service Worker

let queue = [];
let isProcessing = false;

const initPromise = new Promise((resolve) => {
    chrome.storage.local.get(['queue'], (result) => {
        if (result.queue) {
            queue = result.queue;
        }
        resolve();
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_QUEUE') {
        initPromise.then(() => sendResponse({ queue }));
        return true; // Keep the message channel open for the async response
    }

    if (message.type === 'OPEN_COMPILER_VIEW') {
        // Set view to compiler
        chrome.storage.session.set({ currentView: 'compiler' }).catch(() => {});

        // Process incoming items
        if (message.payload && message.payload.selectedAssignments) {
            initPromise.then(() => {
                const items = message.payload.selectedAssignments.map(item => ({
                    ...item,
                    status: 'queued',
                    blobRef: null,
                    fileType: 'unknown'
                }));
                
                queue = queue.concat(items);
                broadcastQueue();
                
                if (!isProcessing) {
                    processQueue();
                }
            });
        }

        // Open the panel, preserving user gesture context
        if (sender && sender.tab) {
            chrome.sidePanel.open({ windowId: sender.tab.windowId });
        } else {
            chrome.windows.getCurrent({populate: false}, (window) => {
                chrome.sidePanel.open({windowId: window.id});
            });
        }
        return;
    }

    if (message.type === 'OPEN_SIDE_PANEL') {
        if (sender && sender.tab) {
            chrome.sidePanel.open({ windowId: sender.tab.windowId });
        } else {
            chrome.windows.getCurrent({populate: false}, (window) => {
                chrome.sidePanel.open({windowId: window.id});
            });
        }
        return;
    }

    initPromise.then(() => {
        if (message.type === 'UPDATE_QUEUE_ORDER') {
            queue = message.queue;
            broadcastQueue();
        } else if (message.type === 'CLEAR_QUEUE') {
            queue = [];
            broadcastQueue();
        } else if (message.type === 'ADD_LOCAL_FILE') {
            const isPdf = message.item.title.toLowerCase().endsWith('.pdf');
            
            // Local file added directly from UI
            queue.push({
                id: message.item.id,
                title: message.item.title,
                status: isPdf ? 'ready' : 'queued_local',
                blobRef: message.item.base64, // Storing as base64 for passing back and forth
                fileType: isPdf ? 'pdf' : 'unknown',
                isTitlePage: message.item.isTitlePage
            });
            
            // Sort if it's title page
            if (message.item.isTitlePage) {
               const titleIdx = queue.findIndex(q => q.id === message.item.id);
               if (titleIdx > 0) {
                   const titleItem = queue.splice(titleIdx, 1)[0];
                   queue.unshift(titleItem);
               }
            }
            
            broadcastQueue();
            
            if (!isProcessing) {
                processQueue();
            }
        } else if (message.type === 'REMOVE_ITEM') {
            queue = queue.filter(q => q.id !== message.id);
            broadcastQueue();
        }
    });
});

function broadcastQueue() {
    chrome.storage.local.set({ queue }).catch(() => {});
    chrome.runtime.sendMessage({ type: 'QUEUE_UPDATED', queue }).catch(() => {});
}

async function processQueue() {
    isProcessing = true;

    for (let i = 0; i < queue.length; i++) {
        let item = queue[i];
        if (item.status === 'queued') {
            await processItem(item);
            broadcastQueue();
        } else if (item.status === 'queued_local') {
            await processLocalItem(item);
            broadcastQueue();
        }
    }

    isProcessing = false;
}

async function processItem(item) {
    item.status = 'downloading';
    broadcastQueue();

    try {
        // Fetch the file using fetch API. This uses the browser's session/cookies.
        const response = await fetch(item.sourceUrl);
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        
        // 1. Check magic bytes for PDF (%PDF)
        const textStart = await blob.slice(0, 5).text();
        const isPdfMagic = textStart.startsWith('%PDF-');

        // 2. Best effort to get filename from headers or base64 URL
        let filename = '';
        const cd = response.headers.get('content-disposition');
        if (cd && cd.includes('filename=')) {
            filename = cd.split('filename=')[1].replace(/"/g, '').replace(/;/g, '');
        } else if (item.sourceUrl.includes('k=')) {
            try {
                // Decode Bahria LMS base64 URL parameter
                const kParam = item.sourceUrl.split('k=')[1].split('&')[0];
                const decoded = atob(kParam);
                if (decoded.includes('.pdf')) filename = 'file.pdf';
                else if (decoded.includes('.pptx')) filename = 'file.pptx';
                else if (decoded.includes('.ppt')) filename = 'file.ppt';
                else if (decoded.includes('.docx')) filename = 'file.docx';
                else if (decoded.includes('.doc')) filename = 'file.doc';
            } catch(e) {}
        }
        
        if (!filename && item.sourceUrl.split('?')[0].split('/').pop().includes('.')) {
            filename = item.sourceUrl.split('?')[0].split('/').pop();
        }

        // 3. Determine if it's a PDF
        const contentType = response.headers.get('content-type') || '';
        const isPdf = isPdfMagic || contentType.includes('pdf') || filename.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            item.status = 'ready';
            item.blobRef = await blobToBase64(blob);
            item.fileType = 'pdf';
        } else {
            item.status = 'converting';
            broadcastQueue();

            // Needs conversion
            let ext = getExtensionFromContentType(contentType) || 'docx'; // Fallback
            if (!filename || !filename.includes('.')) {
                filename = `file.${ext}`;
            }

            const formData = new FormData();
            formData.append('file', blob, filename);

            const convertRes = await fetch('http://127.0.0.1:5000/convert', {
                method: 'POST',
                body: formData
            });

            if (!convertRes.ok) throw new Error('Conversion failed');

            const pdfBlob = await convertRes.blob();
            item.status = 'ready';
            item.blobRef = await blobToBase64(pdfBlob);
            item.fileType = 'pdf';
        }
    } catch (e) {
        console.error(e);
        item.status = 'failed';
    }
}

async function processLocalItem(item) {
    item.status = 'converting';
    broadcastQueue();

    try {
        const res = await fetch(item.blobRef);
        const blob = await res.blob();
        
        const formData = new FormData();
        formData.append('file', blob, item.title);

        const convertRes = await fetch('http://127.0.0.1:5000/convert', {
            method: 'POST',
            body: formData
        });

        if (!convertRes.ok) throw new Error('Conversion failed');

        const pdfBlob = await convertRes.blob();
        item.status = 'ready';
        item.blobRef = await blobToBase64(pdfBlob);
        item.fileType = 'pdf';
    } catch (e) {
        console.error(e);
        item.status = 'failed';
    }
}

function getExtensionFromContentType(ct) {
    if (ct.includes('wordprocessingml')) return 'docx';
    if (ct.includes('presentationml')) return 'pptx';
    if (ct.includes('msword')) return 'doc';
    if (ct.includes('powerpoint')) return 'ppt';
    if (ct.includes('jpeg')) return 'jpg';
    if (ct.includes('png')) return 'png';
    return null;
}

function blobToBase64(blob) {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
}

// Side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
