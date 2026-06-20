from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
from converters import docx_to_pdf, pptx_to_pdf, image_to_pdf
import merge
import traceback
try:
    import pythoncom
except ImportError:
    pass

app = Flask(__name__)
CORS(app)  # Enable CORS for the Chrome extension

# Ensure temp directory exists
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
os.makedirs(TEMP_DIR, exist_ok=True)

@app.route('/convert', methods=['POST'])
def convert_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    
    with tempfile.NamedTemporaryFile(delete=False, dir=TEMP_DIR, suffix=f".{ext}") as temp_input:
        file.save(temp_input.name)
        input_path = temp_input.name

    output_path = os.path.join(TEMP_DIR, f"{os.path.basename(input_path)}.pdf")
    
    # We must explicitly close the temp file handle if we are passing it to other processes
    # However, NamedTemporaryFile handles closing when the context manager exits,
    # but the file remains on disk due to delete=False
    
    try:
        try:
            pythoncom.CoInitialize()
        except:
            pass

        if ext in ['doc', 'docx']:
            docx_to_pdf.convert(input_path, output_path)
        elif ext in ['ppt', 'pptx']:
            pptx_to_pdf.convert(input_path, output_path)
        elif ext in ['jpg', 'jpeg', 'png']:
            image_to_pdf.convert(input_path, output_path)
        else:
            return jsonify({"error": f"Unsupported file type: {ext}"}), 400
            
        return send_file(output_path, as_attachment=True, download_name=f"{file.filename}.pdf")
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        # Cleanup is delayed if send_file is async, but send_file handles open handles.
        # Actually it's safer to not remove it immediately if send_file is streaming it.
        # But for small PDFs it usually works. A better way is returning a stream and cleaning up after,
        # or relying on a cron cleanup job. For simplicity, we try to remove input.
        if os.path.exists(input_path):
            try: os.remove(input_path)
            except: pass
        # The output_path might be locked by send_file. 

@app.route('/merge', methods=['POST'])
def merge_files():
    # Expects multipart/form-data with multiple files keyed 'files'
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
        
    files = request.files.getlist('files')
    if not files:
        return jsonify({"error": "Empty file list"}), 400
        
    temp_paths = []
    for f in files:
        fd, path = tempfile.mkstemp(dir=TEMP_DIR, suffix=".pdf")
        os.close(fd)
        f.save(path)
        temp_paths.append(path)
        
    output_path = os.path.join(TEMP_DIR, "merged_output.pdf")
    
    try:
        merge.merge_pdfs(temp_paths, output_path)
        return send_file(output_path, as_attachment=True, download_name="Lab_Journal.pdf")
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for p in temp_paths:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass

if __name__ == '__main__':
    app.run(debug=True, port=5000)
