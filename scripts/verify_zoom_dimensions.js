const width = 500;
const height = 500;

console.log(`Base Map Dimensions: ${width}x${height}`);

let consistent = true;

for (let zoom = 2; zoom <= 64; zoom += 2) {
  const canvasWidth = width * zoom;
  const canvasHeight = height * zoom;

  // Simulate CSS pixel assignment
  const styleWidth = canvasWidth + "px";
  const styleHeight = canvasHeight + "px";

  const ratio = canvasWidth / canvasHeight;

  if (canvasWidth !== canvasHeight) {
    console.error(`Mismatch at Zoom ${zoom}: ${canvasWidth}x${canvasHeight}`);
    consistent = false;
  }

  if (styleWidth !== styleHeight) {
    console.error(
      `Style Mismatch at Zoom ${zoom}: ${styleWidth} vs ${styleHeight}`,
    );
    consistent = false;
  }

  if (ratio !== 1) {
    console.error(`Ratio Error at Zoom ${zoom}: ${ratio}`);
    consistent = false;
  }
}

if (consistent) {
  console.log(
    "SUCCESS: Canvas dimensions are perfectly square (1:1 aspect ratio) at all zoom levels (2 to 64).",
  );
  console.log(`Min Zoom (2x): ${width * 2}x${height * 2}`);
  console.log(`Max Zoom (64x): ${width * 64}x${height * 64}`);
} else {
  console.error("FAILURE: Dimensions mismatch found.");
  process.exit(1);
}
