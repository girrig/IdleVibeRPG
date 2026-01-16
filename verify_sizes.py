import os

from PIL import Image

ASSETS_DIR = "src/assets"


def verify():
    print(f"Checking assets in {ASSETS_DIR}...")
    files = [f for f in os.listdir(ASSETS_DIR) if f.lower().endswith(".png")]

    all_correct = True

    for f in files:
        path = os.path.join(ASSETS_DIR, f)
        try:
            with Image.open(path) as img:
                w, h = img.size
                if w != 64 or h != 64:
                    print(f" [!] FAIL: {f} is {w}x{h}")
                    all_correct = False
                else:
                    # Optional: Don't print every single success to keep output clean,
                    # or print just a dot.
                    pass
        except Exception as e:
            print(f" [!] ERROR reading {f}: {e}")
            all_correct = False

    if all_correct:
        print(f"SUCCESS: All {len(files)} assets are exactly 64x64.")
    else:
        print("WARNING: Some assets have incorrect sizes (see above).")


if __name__ == "__main__":
    verify()
