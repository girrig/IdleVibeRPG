import os
import shutil

from PIL import Image

# Configuration
RAW_DIR = "raw_assets"
DEST_DIR = "src/assets"
BG_COLOR_KEY = (255, 0, 255)  # Magenta (Reference)

# Transparency Heuristics


def is_transparent_candidate(r, g, b, a):
    # Already transparent?
    if a == 0:
        return False

    # Heuristic: Magenta-ish?
    # Condition: Green is significantly lower than Red and Blue (Purple/Pink/Magenta range)
    # And Red/Blue are relatively balanced (avoiding pure Red or Pure Blue)
    diff_rb = abs(r - b)
    if (g + 40 < r) and (g + 40 < b) and (diff_rb < 80):
        return True
    return False


def process_image(filename):
    src_path = os.path.join(RAW_DIR, filename)
    dest_path = os.path.join(DEST_DIR, filename)

    print(f"Processing {filename}...")

    try:
        img = Image.open(src_path).convert("RGBA")

        # 1. Apply Transparency (Unless explicitly skipped or already transparent source)
        # raw_fish.png is known to be pre-processed transparently
        if filename != "raw_fish.png":
            pixels = img.load()
            width, height = img.size

            for x in range(width):
                for y in range(height):
                    r, g, b, a = pixels[x, y]
                    if is_transparent_candidate(r, g, b, a):
                        pixels[x, y] = (0, 0, 0, 0)  # Transparent

        # 2. Save (No Resize)
        img.save(dest_path)
        print(f"  Saved to {dest_path}")

    except Exception as e:
        print(f"FAILED to process {filename}: {e}")


def main():
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)

    if not os.path.exists(RAW_DIR):
        print(f"Error: {RAW_DIR} directory not found.")
        return

    files = [f for f in os.listdir(RAW_DIR) if f.lower().endswith(".png")]

    print(f"Found {len(files)} assets in {RAW_DIR}")

    for f in files:
        process_image(f)

    print("Done!")


if __name__ == "__main__":
    main()
