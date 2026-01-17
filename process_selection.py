
import math
import os
import sys

from PIL import Image

TARGET_SIZE = (64, 64)


# Custom Flood Fill with Tolerance
def flood_fill_transparency(img, tolerance=100):
    img = img.convert("RGBA")
    width, height = img.size
    pixels = img.load()

    # Target color is the top-left pixel
    tr, tg, tb, _ = pixels[0, 0]

    # Check if a pixel matches target within tolerance
    def matches(r, g, b, a):
        dist = math.sqrt((r - tr)**2 + (g - tg)**2 + (b - tb)**2)
        return dist < tolerance

    # BFS Queue
    queue = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    visited = set(queue)

    # Process queue
    for x, y in queue:
        # Set transparent
        pixels[x, y] = (0, 0, 0, 0)

        # Check neighbors
        for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
            if 0 <= nx < width and 0 <= ny < height:
                if (nx, ny) not in visited:
                    r, g, b, a = pixels[nx, ny]
                    if matches(r, g, b, a):
                        visited.add((nx, ny))
                        queue.append((nx, ny))

    return img


# Helper to remove EXACT magenta background (Global)
def remove_exact_magenta(img):
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []

    for item in datas:
        # Check exact RGB (255, 0, 255)
        # item is (r, g, b, a)
        if item[0] == 255 and item[1] == 0 and item[2] == 255:
            new_data.append((0, 0, 0, 0))  # Transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    return img

# Removed remove_white_halo (User Rejected)


def process_selection(grid_path, selection, dest_path):
    """
    grid_path: absolute path to source grid (2x2)
    selection: 'TL', 'TR', 'BL', 'BR'
    dest_path: relative or absolute path for output
    """
    if not os.path.exists(grid_path):
        print(f"Error: Grid file not found at {grid_path}")
        return

    img = Image.open(grid_path).convert("RGBA")
    w, h = img.size

    # Calculate crop coordinates for 2x2 grid
    # Assuming standard 1024x1024 input -> 512x512 cells
    cell_w = w // 2
    cell_h = h // 2

    crop_box = None
    if selection == 'TL':
        crop_box = (0, 0, cell_w, cell_h)
    elif selection == 'TR':
        crop_box = (cell_w, 0, w, cell_h)
    elif selection == 'BL':
        crop_box = (0, cell_h, cell_w, h)
    elif selection == 'BR':
        crop_box = (cell_w, cell_h, w, h)
    else:
        print(f"Invalid selection '{selection}'. Use TL, TR, BL, BR.")
        return

    print(f"Processing {os.path.basename(grid_path)} -> {selection}...")

    # 0. Fixed Palette Quantization
    # Crop first (The missing line was here)
    crop = img.crop(crop_box)

    # Load the master palette
    if os.path.exists("src/assets/palette_32.png"):
        # Load palette image
        p_img = Image.open("src/assets/palette_32.png")
        if p_img.mode != "P":
            p_img = p_img.convert("P")

        # Enforce Palette
        # We must convert source to RGB first, then quantize using the palette image
        crop = crop.convert("RGB").quantize(palette=p_img, dither=Image.NONE)

        # Now convert back to RGBA for transparency handling
        crop = crop.convert("RGBA")
    else:
        print("WARNING: palette_32.png not found! Using adaptive quantization.")
        crop = crop.quantize(colors=32, method=2, dither=Image.NONE).convert("RGBA")

    # DEBUG: Check color count
    unique_colors = len(set(crop.getdata()))
    print(f"DEBUG: Colors after quantize: {unique_colors}")
    if unique_colors > 32:
        print("CRITICAL WARNING: Quantization FAILED. Image has too many colors.")

    # 1. Remove Magenta (Global Exact)
    # We trust the palette quantization made the background pure FF00FF
    crop = remove_exact_magenta(crop)

    # 2. Trim Transparency (Auto-Crop)
    bbox = crop.getbbox()
    if bbox:
        crop = crop.crop(bbox)

    # 3. Center in Square Canvas (Before Resize)
    # Beacuse the user wants centering done before the final resize
    max_dim = max(crop.width, crop.height)
    # Add a little padding optionally, or just fit tight
    square_size = (max_dim, max_dim)

    centered = Image.new("RGBA", square_size, (0, 0, 0, 0))
    offset_x = (max_dim - crop.width) // 2
    offset_y = (max_dim - crop.height) // 2
    centered.paste(crop, (offset_x, offset_y))

    # 4. Resize to Target (64x64)
    # Now we are resizing a square to a square, so it fits perfectly
    centered.thumbnail(TARGET_SIZE, Image.NEAREST)

    # Save
    centered.save(dest_path)
    print(f"Success! Saved to {dest_path}")


if __name__ == "__main__":
    # Example usage parsing:
    # python process_selection.py <grid_path> <TL|TR|BL|BR> <output_name>
    if len(sys.argv) < 4:
        print("Usage: python process_selection.py <grid_path> <selection> <output_path>")
        # Default test mode if run without args (optional)
    else:
        grid = sys.argv[1]
        sel = sys.argv[2]
        out = sys.argv[3]
        process_selection(grid, sel, out)
