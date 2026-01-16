import os

from PIL import Image

RAW_DIR = "raw_assets"

print("--- Raw Asset Sizes ---")
if os.path.exists(RAW_DIR):
    for f in sorted(os.listdir(RAW_DIR)):
        if f.endswith(".png"):
            path = os.path.join(RAW_DIR, f)
            try:
                img = Image.open(path)
                print(f"{f}: {img.size}")
            except:
                print(f"{f}: ERROR")
else:
    print("No raw_assets dir found.")
