import os
import shutil
import sys

from PIL import Image

# Configuration
RAW_DIR = "raw_assets"
DEST_DIR = "src/assets"
SCENE_PATH = "src/scenes/MainScene.js"

# Transparency Heuristics (Same as before)


def is_transparent_candidate(r, g, b, a):
    if a == 0:
        return False
    diff_rb = abs(r - b)
    if (g + 40 < r) and (g + 40 < b) and (diff_rb < 80):
        return True
    return False


def process_image(src_path, dest_path):
    print(f"  Processing image...")
    try:
        img = Image.open(src_path).convert("RGBA")
        pixels = img.load()
        width, height = img.size

        # Apply Transparency
        for x in range(width):
            for y in range(height):
                r, g, b, a = pixels[x, y]
                if is_transparent_candidate(r, g, b, a):
                    pixels[x, y] = (0, 0, 0, 0)

        img.save(dest_path)
        print(f"  Saved transparent asset to {dest_path}")
        return True
    except Exception as e:
        print(f"  ERROR processing image: {e}")
        return False


def inject_code(asset_name, filename):
    print(f"  Injecting code into {SCENE_PATH}...")

    import_var = f"{asset_name.upper()}_IMG"
    import_line = f'import {import_var} from "../assets/{filename}";'
    load_line = f'    this.load.image("{asset_name}", {import_var});'

    try:
        with open(SCENE_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()

        if any(import_line in line for line in lines):
            print("  Code already exists. Skipping injection.")
            return

        # Find injection points
        last_import_index = 0
        preload_index = 0
        preload_end_index = 0

        for i, line in enumerate(lines):
            if line.startswith("import "):
                last_import_index = i
            if "preload() {" in line:
                preload_index = i
            if preload_index > 0 and i > preload_index and "}" in line and preload_end_index == 0:
                # Simple heuristic: first closing brace after preload is likely the end
                preload_end_index = i

        # Insert Import (after last import)
        lines.insert(last_import_index + 1, import_line + "\n")

        # Re-calc indices because we added a line
        preload_end_index += 1

        # Insert Load (before end of preload)
        # We assume preload_end_index points to the line with "  }"
        lines.insert(preload_end_index, load_line + "\n")

        with open(SCENE_PATH, "w", encoding="utf-8") as f:
            f.writelines(lines)

        print("  Code injected successfully!")

    except Exception as e:
        print(f"  ERROR injecting code: {e}")


def main():
    if len(sys.argv) < 3:
        print("Usage: python add_game_asset.py <path_to_image> <asset_name>")
        return

    src_path = sys.argv[1]
    asset_name = sys.argv[2]
    filename = f"{asset_name}.png"

    raw_dest = os.path.join(RAW_DIR, filename)
    final_dest = os.path.join(DEST_DIR, filename)

    print(f"--- Adding Asset: {asset_name} ---")

    # 1. Copy to raw_assets (History)
    if not os.path.exists(RAW_DIR):
        os.makedirs(RAW_DIR)
    shutil.copy2(src_path, raw_dest)
    print(f"  Copied to {raw_dest}")

    # 2. Process & Save to src/assets
    if process_image(src_path, final_dest):
        # 3. Inject JS
        inject_code(asset_name, filename)

    print("--- Done ---")


if __name__ == "__main__":
    main()
