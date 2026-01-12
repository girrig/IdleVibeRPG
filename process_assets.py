import os

from PIL import Image


def remove_magenta(input_path, output_path):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        new_data = []
        # Target Magenta: 255, 0, 255
        # We allow a small tolerance in case of compression artifacts, but pixel art should be sharp.
        for item in datas:
            # Check for Magenta-ish (R>200, G<50, B>200)
            if item[0] > 200 and item[1] < 50 and item[2] > 200:
                new_data.append((255, 255, 255, 0))  # Transparent
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Processed {input_path} -> {output_path}")
    except Exception as e:
        print(f"Failed to process {input_path}: {e}")


assets = {
    'raw_character_magenta_1768195738841.png': 'src/assets/character.png',
    'raw_tree_magenta_1768195751294.png': 'src/assets/tree.png',
    'raw_tent_magenta_1768195763043.png': 'src/assets/tent.png',
    # Will need to fill in timestamps for campfire/ore after generation
}

# Scan directory for 'raw_campfire' and 'raw_copper_ore' to find the exact filenames
brain_dir = r"C:\Users\girri\.gemini\antigravity\brain\b2e51056-3d10-4ea8-8957-033f2c61a43a"
for f in os.listdir(brain_dir):
    full_path = os.path.join(brain_dir, f)
    if "raw_campfire_magenta" in f:
        assets[f] = 'src/assets/campfire.png'  # Single frame overwrite
    if "raw_copper_ore_magenta" in f:
        assets[f] = 'src/assets/copper_ore.png'

print("Starting processing...")
for src_name, dest_rel in assets.items():
    src_full = os.path.join(brain_dir, src_name)
    if os.path.exists(src_full):
        remove_magenta(src_full, dest_rel)
    else:
        print(f"Source not found: {src_full}")
