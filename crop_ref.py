from PIL import Image, ImageChops


def crop_grid_cell(source_path, output_path, row, col, grid_size=4):
    try:
        img = Image.open(source_path).convert("RGB")
        width, height = img.size
        cell_w = width // grid_size
        cell_h = height // grid_size

        # 0-indexed row/col
        left = col * cell_w
        top = row * cell_h
        right = left + cell_w
        bottom = top + cell_h

        # 1. Initial Grid Crop
        cell = img.crop((left, top, right, bottom))

        # 2. SAFETY CROP: Remove 10% from edges to eliminate grid lines/artifacts
        margin = int(cell_w * 0.05)  # 5% margin on each side (~25px for 512)
        cell = cell.crop((margin, margin, cell_w - margin, cell_h - margin))

        # 3. AUTO-TRIM (Zoom In)
        # Detect background color from new corner
        corner_color = cell.getpixel((0, 0))
        print(f"  Detected background color: {corner_color}")

        bg = Image.new("RGB", cell.size, corner_color)
        diff = ImageChops.difference(cell, bg)

        # Tolerance: Treat differences < 40 as background
        diff = diff.convert("L")
        threshold = 40
        diff = diff.point(lambda p: 255 if p > threshold else 0)

        bbox = diff.getbbox()

        if bbox:
            cell = cell.crop(bbox)
            print(f"  Auto-trimmed to bounding box: {bbox}")
        else:
            print("  Warning: No distinct content found (blank image?)")

        cell.save(output_path)
        print(f"Saved tightly cropped result to {output_path}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    # Row 2 (index 1), Col 2 (index 1) - Bottom Right
    crop_grid_cell(
        r"c:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\backpack_variations_2x2_1768520067368.png",
        "icon_inv_tight_crop.png",
        1, 1, grid_size=2
    )
