import os

from PIL import Image


def process_image(src_path, dest_path, target_height):
    try:
        print(f"Processing {src_path}...")
        img = Image.open(src_path).convert("RGBA")
        datas = img.getdata()

        # 1. Strict Transparency (Remove Magenta #FF00FF and close neighbors)
        new_data = []
        for item in datas:
            # High tolerance for Magenta detection since generation might not be perfect
            # But strict enough to not eat the art
            if item[0] > 230 and item[1] < 30 and item[2] > 230:
                new_data.append((0, 0, 0, 0))  # Transparent
            else:
                new_data.append(item)

        img.putdata(new_data)

        # 2. Auto-Crop (Trim transparent borders)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            print(f"  Cropped to {bbox}")
        else:
            print("  Warning: Empty image!")
            return

        # 3. Resize (Keep aspect ratio, target height)
        # Calculate width based on target height
        w, h = img.size
        aspect = w / h
        new_w = int(target_height * aspect)

        # Use NEAREST to keep pixel art look
        img = img.resize((new_w, target_height), Image.Resampling.NEAREST)
        print(f"  Resized to {new_w}x{target_height}")

        img.save(dest_path, "PNG")
        print(f"  Saved to {dest_path}")

    except Exception as e:
        print(f"Failed {src_path}: {e}")


# Define source (Brain) and target (Assets)
brain_dir = r"C:\Users\girri\.gemini\antigravity\brain\b2e51056-3d10-4ea8-8957-033f2c61a43a"

# Mapping: Substring of filename -> (Output Path, Target Height)
assets_map = {
    'raw_character_magenta': ('src/assets/character.png', 32),
    'raw_tree_magenta': ('src/assets/tree.png', 64),
    'raw_tent_magenta': ('src/assets/tent.png', 64),
    'raw_campfire_magenta': ('src/assets/campfire.png', 32),
    'raw_copper_ore_magenta': ('src/assets/copper_ore.png', 32),
}

# Scan brain dir
for f in os.listdir(brain_dir):
    for key, (out_path, height) in assets_map.items():
        if key in f:
            src_full = os.path.join(brain_dir, f)
            process_image(src_full, out_path, height)
