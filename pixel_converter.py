import os
import sys

from PIL import Image


def convert_to_pixel_art(image_path, num_colors=32):
    try:
        # Load and convert to RGBA
        img = Image.open(image_path).convert("RGBA")

        # 1. Handle Alpha (Transparency)
        # Resize often creates semi-transparent pixels at edges.
        # We need to make them fully solid or fully transparent (Binary Alpha).
        # Get alpha channel
        r, g, b, a = img.split()
        # Threshold alpha: If > 128, make it 255, else 0
        a = a.point(lambda x: 255 if x > 128 else 0)

        # 2. Quantize RGB (Color Palettization)
        # This groups similar colors (e.g. "blurry light brown" and "dark brown")
        # into a single solid color.
        # Create an RGB image from the channels for quantization
        rgb_img = Image.merge("RGB", (r, g, b))

        # Quantize to 'num_colors' (e.g. 32)
        # method=1 (FastOctree) is usually good, or 2 (MedianCut)
        # dither=Image.NONE is CRITICAL to avoid noise/speckling
        quantized_rgb = rgb_img.quantize(colors=num_colors, method=Image.FASTOCTREE, dither=Image.NONE)

        # Convert back to regular RGB so we can save as PNG
        final_rgb = quantized_rgb.convert("RGB")

        # 3. Recombine
        # Put the sharp binary alpha back onto the quantized colors
        final_img = Image.merge("RGBA", (*final_rgb.split(), a))

        # Save (Overwrite or new)
        final_img.save(image_path)
        print(f"  Pixelized: {os.path.basename(image_path)} ({num_colors} colors)")
        return True

    except Exception as e:
        print(f"  Error converting {image_path}: {e}")
        return False


def main():
    # If file provided, process it
    if len(sys.argv) > 1:
        target = sys.argv[1]
        if os.path.isfile(target):
            convert_to_pixel_art(target)
        elif os.path.isdir(target):
            # Process all PNGs in dir
            files = [f for f in os.listdir(target) if f.lower().endswith(".png")]
            print(f"Processing {len(files)} images in {target}...")
            for f in files:
                convert_to_pixel_art(os.path.join(target, f))
    else:
        print("Usage: python pixel_converter.py <file_or_directory>")


if __name__ == "__main__":
    main()
