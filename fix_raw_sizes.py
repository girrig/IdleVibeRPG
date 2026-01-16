import os

from PIL import Image

# Resize all raw assets to 32x32 in-place (preserving Magenta)
RAW_DIR = "raw_assets"
TARGET_SIZE = (32, 32)


def resize_raw_assets():
    if not os.path.exists(RAW_DIR):
        print("No raw_assets dir found!")
        return

    files = [f for f in os.listdir(RAW_DIR) if f.lower().endswith(".png")]
    print(f"Resizing {len(files)} raw assets to 32x32...")

    for f in files:
        path = os.path.join(RAW_DIR, f)
        try:
            img = Image.open(path)
            if img.size != TARGET_SIZE:
                # Nearest Neighbor for pixel art
                img = img.resize(TARGET_SIZE, Image.NEAREST)
                img.save(path)
                print(f"  Resized {f}")
            else:
                print(f"  {f} already 32x32")
        except Exception as e:
            print(f"  Error resizing {f}: {e}")


if __name__ == "__main__":
    resize_raw_assets()
