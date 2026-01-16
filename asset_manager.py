import os
import shutil
import sys

from PIL import Image, ImageChops

# Configuration
RAW_DIR = "raw_assets"
DEST_DIR = "src/assets"
SCENE_PATH = "src/scenes/MainScene.js"
TARGET_SIZE = (64, 64)

# --- Logic: Transparency ---


def is_transparent_candidate(r, g, b, a):
    if a == 0:
        return False
    diff_rb = abs(r - b)
    # Green is lower than R and B (Magenta range), R/B balanced
    if (g + 40 < r) and (g + 40 < b) and (diff_rb < 80):
        return True
    return False

# --- Logic: Process Single Image ---


# --- Logic: Process Single Image ---

def auto_trim(img):
    """
    Applies the 'Zoom In' logic:
    1. Removes 5% safety margin
    2. Auto-crops based on background color with tolerance
    """
    try:
        width, height = img.size

        # 2. SAFETY CROP (5%)
        margin = int(width * 0.05)
        img = img.crop((margin, margin, width - margin, height - margin))

        # 3. AUTO-TRIM (Tolerance)
        corner_color = img.getpixel((0, 0))
        # Ensure RGB
        if len(corner_color) == 4:
            corner_color = corner_color[:3]

        # Create diff
        bg = Image.new("RGB", img.size, corner_color)
        diff = ImageChops.difference(img.convert("RGB"), bg)

        # Tolerance Logic
        diff = diff.convert("L")
        threshold = 40
        diff = diff.point(lambda p: 255 if p > threshold else 0)

        bbox = diff.getbbox()
        if bbox:
            print(f"    Auto-trimmed to {bbox}")
            return img.crop(bbox)

        return img  # Return safety cropped image if no bbox found
    except Exception as e:
        print(f"    Warning: Auto-trim failed ({e}), using original.")
        return img


def quantize_image(img):
    """
    Applies pixel-art palette and binary alpha.
    """
    # 1. Quantize to 32 colors (Fast Octree)
    img = img.quantize(colors=32, method=2, kmeans=1, dither=Image.NONE)

    # 2. Convert back to RGBA to fixing alpha
    img = img.convert("RGBA")

    # 3. Binary Alpha Threshold
    pixels = img.load()
    width, height = img.size
    for x in range(width):
        for y in range(height):
            r, g, b, a = pixels[x, y]
            # Simple threshold
            pixels[x, y] = (r, g, b, 255 if a > 128 else 0)

    return img


def process_and_save(src_path, dest_path):
    """
    Full Pipeline:
    1. Load High-Res
    2. Auto-Trim (Zoom)
    3. Resize to 64x64
    4. Remove Background (Magenta -> Transparent)
    5. Quantize (Pixel Art Look)
    """
    try:
        print(f"  Processing {os.path.basename(src_path)}...")
        img = Image.open(src_path).convert("RGBA")

        # Step 2: Auto-Trim (Zoom In)
        # Only trim if it's huge (likely a raw generation)
        if img.width > 256:
            img = auto_trim(img)

        # Step 3: Resize to 64x64
        if img.size != TARGET_SIZE:
            print(f"    Resizing from {img.size} to {TARGET_SIZE}...")
            img = img.resize(TARGET_SIZE, Image.NEAREST)

        # Step 4: Magenta Transparency
        pixels = img.load()
        width, height = img.size
        # Magenta Removal Logic
        if "raw_fish" not in src_path:
            for x in range(width):
                for y in range(height):
                    r, g, b, a = pixels[x, y]
                    if is_transparent_candidate(r, g, b, a):
                        pixels[x, y] = (0, 0, 0, 0)  # Full transparency

        # Step 5: Quantize / Pixelate
        img = quantize_image(img)

        img.save(dest_path)
        print(f"    Saved finalized asset to {dest_path}")
        return True
    except Exception as e:
        print(f"    ERROR processing image: {e}")
        return False

# --- Logic: Code Injection (MainScene.js) ---


def inject_code(asset_name, filename):
    print(f"  Checking {SCENE_PATH} for injection...")

    import_var = f"{asset_name.upper()}_IMG"
    import_line = f'import {import_var} from "../assets/{filename}";'
    load_line = f'    this.load.image("{asset_name}", {import_var});'

    try:
        with open(SCENE_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()

        if any(import_line in line for line in lines):
            print("    Code already exists. Skipping injection.")
            return

        last_import = 0
        preload_start = 0
        preload_end = 0

        for i, line in enumerate(lines):
            if line.startswith("import "):
                last_import = i
            if "preload() {" in line:
                preload_start = i
            if preload_start > 0 and i > preload_start and "}" in line and preload_end == 0:
                preload_end = i  # First closing brace after preload

        lines.insert(last_import + 1, import_line + "\n")
        preload_end += 1  # Adjusted index
        lines.insert(preload_end, load_line + "\n")

        with open(SCENE_PATH, "w", encoding="utf-8") as f:
            f.writelines(lines)

        print("    Code injected successfully!")

    except Exception as e:
        print(f"    ERROR injecting code: {e}")

# --- CLI Operations ---


def add_asset(src_path, asset_name):
    filename = f"{asset_name}.png"

    if not os.path.exists(RAW_DIR):
        os.makedirs(RAW_DIR)

    # 1. Archive Original (Magenta, High-Res)
    raw_dest = os.path.join(RAW_DIR, filename)
    shutil.copy2(src_path, raw_dest)
    print(f"  Archived original to {raw_dest}")

    # 2. Process & Save (Resize, Clean)
    final_dest = os.path.join(DEST_DIR, filename)
    if process_and_save(raw_dest, final_dest):
        # 3. Inject JS
        inject_code(asset_name, filename)


def rebuild_all():
    print("--- Rebuilding All Assets ---")
    if not os.path.exists(RAW_DIR):
        print("No raw_assets folder found.")
        return

    files = [f for f in os.listdir(RAW_DIR) if f.lower().endswith(".png")]
    for f in files:
        src = os.path.join(RAW_DIR, f)
        dest = os.path.join(DEST_DIR, f)
        process_and_save(src, dest)
    print("--- Rebuild Complete ---")


def main():
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python asset_manager.py add <path_to_image> <asset_name>")
        print("  python asset_manager.py rebuild")
        return

    command = sys.argv[1]

    if command == "add":
        if len(sys.argv) < 4:
            print("Error: Missing arguments for 'add'. Need <path> and <name>.")
            return
        add_asset(sys.argv[2], sys.argv[3])

    elif command == "rebuild":
        rebuild_all()

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
