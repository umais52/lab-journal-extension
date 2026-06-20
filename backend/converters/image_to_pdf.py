import img2pdf
from PIL import Image
import os

def convert(input_path, output_path):
    # Sometimes img2pdf complains about alpha channels. Use Pillow to convert to RGB first if needed.
    try:
        with open(output_path, "wb") as f:
            f.write(img2pdf.convert(input_path))
    except Exception as e:
        # Fallback to Pillow
        image = Image.open(input_path)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        # Save to a temporary jpeg to feed into img2pdf
        temp_jpg = input_path + "_temp.jpg"
        image.save(temp_jpg, "JPEG")
        with open(output_path, "wb") as f:
            f.write(img2pdf.convert(temp_jpg))
        if os.path.exists(temp_jpg):
            os.remove(temp_jpg)
