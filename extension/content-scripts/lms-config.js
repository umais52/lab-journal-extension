// Configuration for detecting assignments on the LMS page.
// Update these selectors based on the specific LMS (Canvas, Blackboard, etc.)

const LMS_CONFIG = {
    // We'll broaden the row selector to catch table rows (tr) which are very common
    rowSelector: 'tr, .assignment-list-item, .item-row', 
    
    // Using a case-insensitive search (the "i") to catch "Download.php"
    downloadLinkSelector: 'a.download-btn, a[href*="download" i], a.label-info',
    
    // Specifically prefer links that contain this text (e.g. to avoid downloading the assignment prompt)
    downloadLinkTextContains: 'submission',
    
    // Try to catch the first cell of a table for the title, or common heading tags
    titleSelector: 'td:first-child, .assignment-title, h3, h4',

    // Where to inject the checkbox in the row (e.g., 'prepend' or 'append')
    checkboxPosition: 'prepend'
};

// Expose globally for the content script
window.LMS_CONFIG = LMS_CONFIG;
