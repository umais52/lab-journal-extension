# 📓 LMS Lab Journal Compiler

> A Chrome Extension + Flask backend system that automates the creation of a single, merged Lab Journal PDF from your LMS assignment submissions.

Built specifically for **Bahria University LMS** (`lms.bahria.edu.pk`), but designed to be configurable for any LMS platform.

---

## ✨ Features

### 🗂️ Dashboard
- View a curated list of **recommended extensions** for LMS workflows (Assignment Tracker, Survey Filler, Study Assistant)
- **Add any installed Chrome extension** to your dashboard from a dropdown of all your installed extensions
- **Remove** any card from the dashboard — default ones can be restored with one click
- **Rename** any extension card using the inline pencil edit icon (names persist across sessions)
- Install missing extensions directly from the Chrome Web Store

### ⚙️ Compiler
- **Drag-and-drop queue** to reorder files before compilation (using SortableJS)
- **Add Title Page** — pin a PDF or image to the very top of the journal
- **Add Local File** — upload `.docx`, `.pptx`, `.pdf`, `.jpg`, or `.png` from your computer
- Each item shows a live status: `queued → downloading → converting → ready`
- **Compile Journal** — merges all ready PDFs into a single `Lab_Journal_<date>.pdf`, automatically downloaded

### 🌐 LMS Content Script
- Automatically injects **checkboxes** next to every assignment row on the LMS page
- A **Select All** checkbox is injected into the table header
- A floating **Compile** button (FAB) is injected on the page — click it after selecting assignments to send them straight to the compiler queue
- Automatically handles Bahria LMS base64-encoded download URLs and detects file types from response headers/magic bytes

### 🔧 Flask Backend
- **File conversion** endpoint (`/convert`): converts `.docx`, `.pptx`, `.jpg`, `.png` → PDF using Microsoft Office COM automation (`docx2pdf`, `comtypes`)
- **PDF merge** endpoint (`/merge`): accepts multiple PDF files and merges them in order using `PyPDF2`
- CORS-enabled for Chrome Extension communication
- Temp file cleanup after each request

---

## 🏗️ Project Structure

```
lab-journal-extension/
├── backend/                        # Flask backend server
│   ├── app.py                      # Main Flask application (routes: /convert, /merge)
│   ├── merge.py                    # PDF merge utility using PyPDF2
│   ├── requirements.txt            # Python dependencies
│   ├── test_pptx.py                # Manual test script for PPTX conversion
│   ├── temp/                       # Temporary files during conversion (auto-cleaned)
│   │   └── .gitkeep
│   └── converters/                 # File-type specific conversion modules
│       ├── __init__.py
│       ├── docx_to_pdf.py          # .docx/.doc → PDF via docx2pdf
│       ├── pptx_to_pdf.py          # .pptx/.ppt → PDF via comtypes (PowerPoint COM)
│       └── image_to_pdf.py         # .jpg/.png → PDF via img2pdf / Pillow
│
└── extension/                      # Chrome Extension (Manifest V3)
    ├── manifest.json               # Extension config: permissions, CSP, side panel
    ├── icons/                      # Extension card icons for the dashboard
    │   ├── assignment.png
    │   ├── survey.png
    │   └── study-assis.png
    ├── background/
    │   ├── service-worker.js       # Background SW: queue management, file download, conversion orchestration
    │   └── hardcoded-extensions.js # List of curated extensions shown on the dashboard
    ├── content-scripts/
    │   ├── lms-config.js           # ⚙️ CONFIGURE THIS: CSS selectors for your LMS
    │   └── lms-detector.js         # Injected into LMS pages: adds checkboxes + FAB
    └── ui/                         # Side panel UI
        ├── sidepanel.html          # Main HTML shell
        ├── styles.css              # All UI styles (vanilla CSS)
        ├── dashboard.js            # Dashboard logic: extension cards, modal, storage
        ├── compile.js              # Compiler logic: queue rendering, file upload, merge trigger
        ├── view-router.js          # Switches between Dashboard and Compiler views
        ├── Sortable.min.js         # Vendored SortableJS library (drag-and-drop)
        └── components/
            └── bottom-nav.js       # Bottom navigation tab switching
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Browser Extension | Chrome Extension Manifest V3 |
| Extension UI | Vanilla HTML, CSS, JavaScript |
| Drag & Drop | [SortableJS](https://sortablejs.github.io/Sortable/) |
| Backend Server | Python 3 + Flask |
| DOCX → PDF | `docx2pdf` (via Microsoft Word COM) |
| PPTX → PDF | `comtypes` (via Microsoft PowerPoint COM) |
| Image → PDF | `img2pdf` + `Pillow` |
| PDF Merging | `PyPDF2` |
| Cross-Origin | `flask-cors` |

---

## ✅ Prerequisites

- **Chrome** or **Edge** browser
- **Python 3.9+** installed and added to PATH
- **Windows OS** with **Microsoft Office installed** (Word + PowerPoint required for accurate `.docx`/`.pptx` conversion via COM automation)

---

## 🚀 Setup

### 1. Backend (Flask Server)

```bash
# Navigate to the backend directory
cd backend

# (Recommended) Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

The server runs on `http://127.0.0.1:5000`. **Keep this terminal open** while using the extension.

### 2. Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. Pin the extension to your toolbar

---

## ⚙️ Configuration

### Targeting Your LMS

Open `extension/content-scripts/lms-config.js` and update the selectors to match your LMS's HTML:

```js
const LMS_CONFIG = {
    // CSS selector for assignment rows in the table
    rowSelector: 'tr, .assignment-list-item, .item-row',

    // CSS selector for the download link inside a row
    downloadLinkSelector: 'a.download-btn, a[href*="download" i], a.label-info',

    // Only pick links whose text includes this word (to avoid downloading prompts)
    downloadLinkTextContains: 'submission',

    // CSS selector for the assignment title inside a row
    titleSelector: 'td:first-child, .assignment-title, h3, h4',

    // Where to inject the checkbox: 'prepend' or 'append'
    checkboxPosition: 'prepend'
};
```

### Targeting a Different LMS Domain

Open `extension/manifest.json` and update `host_permissions`:

```json
"host_permissions": [
    "*://your-lms-domain.edu/*",
    "http://127.0.0.1:5000/*"
]
```

### Customizing Dashboard Extensions

Open `extension/background/hardcoded-extensions.js` to add/remove/rename the curated extension cards shown by default on the dashboard:

```js
export const HARDCODED_EXTENSIONS = [
    { id: "<chrome-extension-id>", name: "My Extension", icon: "icons/my-icon.png" },
];
```

---

## 📖 Usage

1. Navigate to your LMS assignment list page.
2. The extension injects **checkboxes** next to each assignment row. Check the ones you want.
3. Click the green floating **Compile** button at the bottom right of the page.
4. The extension's **Side Panel** opens automatically on the Compiler tab.
5. _(Optional)_ Drag items to reorder them. Add a title page or local files.
6. Wait for all items to show status **READY**.
7. Click **Compile** — the merged `Lab_Journal_<date>.pdf` downloads automatically.

---

## ⚠️ Known Limitations

- DOCX/PPTX conversion requires **Microsoft Office** to be installed on the machine running the backend. LibreOffice is not currently supported.
- The backend server must be running locally on port `5000` before using the Compiler.
- Chrome Extensions cannot access `chrome://` pages for extension icons directly due to CSP restrictions; the dashboard falls back gracefully to initials if the icon cannot be loaded.

---

## 🪪 License

MIT
