import { mapManager, TERRAIN_TYPES } from "../../core/MapManager";

export class MapView {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "map-view";
    this.element.style.width = "100%";
    this.element.style.height = "100%";
    this.element.style.display = "flex";
    this.element.style.position = "relative";
    this.element.style.overflow = "hidden";

    // Filter State
    this.hiddenTerrainTypes = new Set();

    // Map Container
    this.mapContainer = document.createElement("div");
    this.mapContainer.style.flex = "1";
    this.mapContainer.style.position = "relative";
    this.mapContainer.style.overflow = "auto";
    this.mapContainer.style.cursor = "crosshair";
    this.mapContainer.style.backgroundColor = "#000";

    // Spacer for Virtual Scroll
    this.spacer = document.createElement("div");
    this.spacer.style.position = "absolute";
    this.spacer.style.top = "0";
    this.spacer.style.left = "0";
    // Dimensions set in update()
    this.mapContainer.appendChild(this.spacer);

    // Canvas Element (Sticky Virtual Viewport)
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false }); // Optimize for no transparency
    this.canvas.style.display = "block";
    this.canvas.style.position = "sticky";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.mapContainer.appendChild(this.canvas);

    // Offscreen Canvas for static background (colors)
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d", { alpha: false });
    this.mapDataDirty = true; // Flag to redraw offscreen canvas

    // Sidebar
    this.sidebar = document.createElement("div");
    this.sidebar.style.width = "200px";
    this.sidebar.style.minWidth = "200px";
    this.sidebar.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    this.sidebar.style.borderLeft = "1px solid rgba(255, 255, 255, 0.1)";
    this.sidebar.style.padding = "20px";
    this.sidebar.style.display = "flex";
    this.sidebar.style.flexDirection = "column";
    this.sidebar.style.overflowY = "auto";

    this.element.appendChild(this.mapContainer);
    this.element.appendChild(this.sidebar);

    // State
    this.zoomLevel = 12; // Start smaller for big map
    this.hoverTile = null;

    // Tooltip for hover info
    this.tooltip = document.createElement("div");
    this.tooltip.style.position = "absolute";
    this.tooltip.style.padding = "5px 10px";
    this.tooltip.style.backgroundColor = "rgba(0,0,0,0.8)";
    this.tooltip.style.color = "#fff";
    this.tooltip.style.borderRadius = "4px";
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.display = "none";
    this.tooltip.style.zIndex = "100";
    this.mapContainer.appendChild(this.tooltip);

    // Events
    this.bindEvents();
  }

  bindEvents() {
    // Scroll event for rendering updates
    this.mapContainer.addEventListener("scroll", () => {
      this.renderMainCanvas();
    });

    // Mouse Move (Hover)
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      // Mouse relative to Canvas (Viewport)
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Add scroll offset to get "World" pixels
      const worldX = mouseX + this.mapContainer.scrollLeft;
      const worldY = mouseY + this.mapContainer.scrollTop;

      const tileX = Math.floor(worldX / this.zoomLevel);
      const tileY = Math.floor(worldY / this.zoomLevel);

      const tile = mapManager.getTile(tileX, tileY);

      if (tile) {
        this.hoverTile = tile;
        this.updateTooltip(e.clientX, e.clientY, tile);
      } else {
        this.hoverTile = null;
        this.tooltip.style.display = "none";
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoverTile = null;
      this.tooltip.style.display = "none";
    });

    // Wheel Zoom
    this.mapContainer.addEventListener("wheel", (e) => {
      e.preventDefault(); // Always prevent scroll when over map

      const oldZoom = this.zoomLevel;
      const delta = Math.sign(e.deltaY);
      const step = 2; // Smaller step

      // Dynamic Min Zoom Calculation (Redundant but safe to keep fresh)
      const containerWidth = this.mapContainer.clientWidth;
      const containerHeight = this.mapContainer.clientHeight;
      const minZoomX = containerWidth / mapManager.width;
      const minZoomY = containerHeight / mapManager.height;
      const safeMinZoom = Math.ceil(Math.max(minZoomX, minZoomY, 1));

      // Calculate new zoom
      let newZoom = oldZoom;
      if (delta < 0) {
        newZoom = Math.min(oldZoom + step, 64);
      } else {
        newZoom = Math.max(oldZoom - step, safeMinZoom);
      }

      if (newZoom === oldZoom) return;

      // Calculate center in "World/Tile" coordinates
      // Center of Viewport + Scroll
      const viewCenterX =
        this.mapContainer.scrollLeft + this.mapContainer.clientWidth / 2;
      const viewCenterY =
        this.mapContainer.scrollTop + this.mapContainer.clientHeight / 2;

      // Tile at the center
      const tileCenterX = viewCenterX / oldZoom;
      const tileCenterY = viewCenterY / oldZoom;

      this.zoomLevel = newZoom;
      this.update(); // Resizes spacer

      // Calculate new center in pixels
      const newViewCenterX = tileCenterX * newZoom;
      const newViewCenterY = tileCenterY * newZoom;

      // New scroll position
      this.mapContainer.scrollLeft =
        newViewCenterX - this.mapContainer.clientWidth / 2;
      this.mapContainer.scrollTop =
        newViewCenterY - this.mapContainer.clientHeight / 2;
    });

    // Handle Resize Observer for both dynamic min zoom AND virtual canvas resizing
    const resizeObserver = new ResizeObserver(() => {
      // 1. Dynamic Min Zoom Logic
      const containerWidth = this.mapContainer.clientWidth;
      const containerHeight = this.mapContainer.clientHeight;
      const minZoomX = containerWidth / mapManager.width;
      const minZoomY = containerHeight / mapManager.height;
      const safeMinZoom = Math.ceil(Math.max(minZoomX, minZoomY, 1));

      if (this.zoomLevel < safeMinZoom) {
        this.zoomLevel = safeMinZoom;
      }

      // 2. Virtual Canvas Resize
      // Canvas always matches viewport size to save memory/gpu
      // Note: We avoid setting width/height every frame if unchanged, but resize event implies change
      this.update();
    });
    resizeObserver.observe(this.mapContainer);

    // Handle "click"
    this.canvas.addEventListener("click", (e) => {
      if (!this.isDragging && this.hoverTile) {
        console.log("Clicked Tile:", this.hoverTile);
      }
    });

    // Drag to Scroll Logic
    this.isMouseDown = false;
    this.startX = 0;
    this.startY = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;

    this.mapContainer.addEventListener("mousedown", (e) => {
      // Prevent native "Auto-scroll" on middle click
      if (e.button === 1) {
        e.preventDefault();
        return;
      }

      // Only drag on Left Click (button 0)
      if (e.button !== 0) return;

      this.isMouseDown = true;
      this.isDragging = false; // Start as false, become true if moved
      this.mapContainer.style.cursor = "grabbing";
      this.startX = e.pageX - this.mapContainer.offsetLeft;
      this.startY = e.pageY - this.mapContainer.offsetTop;
      this.scrollLeft = this.mapContainer.scrollLeft;
      this.scrollTop = this.mapContainer.scrollTop;
    });

    this.mapContainer.addEventListener("mouseleave", () => {
      this.isMouseDown = false;
      this.mapContainer.style.cursor = "crosshair";
    });

    this.mapContainer.addEventListener("mouseup", () => {
      this.isMouseDown = false;
      this.mapContainer.style.cursor = "crosshair";
      // This resets dragging flag so click handler can fire if it wasn't a drag
      setTimeout(() => {
        this.isDragging = false;
      }, 0);
    });

    this.mapContainer.addEventListener("mousemove", (e) => {
      if (!this.isMouseDown) return;
      e.preventDefault();

      const x = e.pageX - this.mapContainer.offsetLeft;
      const y = e.pageY - this.mapContainer.offsetTop;

      const walkX = (x - this.startX) * 1; // 1:1 movement
      const walkY = (y - this.startY) * 1;

      // If moved significantly, mark as dragging
      if (Math.abs(walkX) > 2 || Math.abs(walkY) > 2) {
        this.isDragging = true;
      }

      this.mapContainer.scrollLeft = this.scrollLeft - walkX;
      this.mapContainer.scrollTop = this.scrollTop - walkY;
    });
  }

  updateTooltip(x, y, tile) {
    const typeInfo = Object.values(TERRAIN_TYPES).find(
      (t) => t.id === tile.type,
    );
    const name = typeInfo ? typeInfo.id : tile.type;
    const symbol = typeInfo ? typeInfo.symbol : "?";

    // x, y are mouse client coordinates.
    // Tooltip is inside mapContainer (relative).
    const containerRect = this.mapContainer.getBoundingClientRect();

    // With sticky canvas, container scroll affects content, but tooltip position needs
    // to track the mouse relative to the container *viewport*.
    // However, if we append tooltip to mapContainer (which scrolls),
    // we need to add scrollLeft/scrollTop to keep it at the mouse position relative to the *content*?
    // Wait, if mapContainer scrolls, 'absolute' children move with scroll.
    // The mouse event gives us client coordinates.

    // We want the tooltip to float near the mouse cursor.
    // Easiest is to position it relative to the visible viewport (fixed-ish behavior),
    // OR calculated "absolute" position including scroll.

    // Let's use absolute relative to the Scrollable Content.
    const relativeX = x - containerRect.left + this.mapContainer.scrollLeft;
    const relativeY = y - containerRect.top + this.mapContainer.scrollTop;

    this.tooltip.style.left = relativeX + 15 + "px";
    this.tooltip.style.top = relativeY + 15 + "px";
    this.tooltip.innerText = `${symbol} ${name} (${tile.x}, ${tile.y})`;
    this.tooltip.style.display = "block";
  }

  render(container) {
    container.innerHTML = "";
    container.appendChild(this.element);
    this.update();
  }

  // Called when map data or zoom/filters change
  update() {
    this.renderSidebar();

    const mapWidthTotal = mapManager.width * this.zoomLevel;
    const mapHeightTotal = mapManager.height * this.zoomLevel;

    // 1. Resize Spacer (This creates the scrollbars)
    this.spacer.style.width = mapWidthTotal + "px";
    this.spacer.style.height = mapHeightTotal + "px";

    // 2. Resize Canvas (Matches Viewport)
    const viewportWidth = this.mapContainer.clientWidth || 800; // Fallback for headless/init
    const viewportHeight = this.mapContainer.clientHeight || 600;

    // Only resize canvas if changed to avoid flicker/perf hit (though 2d context survives)
    if (
      this.canvas.width !== viewportWidth ||
      this.canvas.height !== viewportHeight
    ) {
      this.canvas.width = viewportWidth;
      this.canvas.height = viewportHeight;
      this.canvas.style.width = viewportWidth + "px";
      this.canvas.style.height = viewportHeight + "px";
      // Reset flags because context reset
      this.ctx.imageSmoothingEnabled = false;
    }

    // Ensure styles to prevent squashing
    this.canvas.style.maxWidth = "none";
    this.canvas.style.maxHeight = "none";

    // 3. Offscreen Canvas (1:1 with Map Tiles)
    const width = mapManager.width;
    const height = mapManager.height;
    if (
      this.offscreenCanvas.width !== width ||
      this.offscreenCanvas.height !== height
    ) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this.mapDataDirty = true;
    }

    if (this.mapDataDirty) {
      const success = this.renderOffscreenCanvas();
      if (success) {
        this.mapDataDirty = false;
      }
    }

    this.renderMainCanvas();

    // Initial Center (Delayed to ensure layout)
    if (!this.hasCentered) {
      setTimeout(() => this.centerOnHome(), 50);
    }
  }

  centerOnHome() {
    const viewportWidth = this.mapContainer.clientWidth;
    const viewportHeight = this.mapContainer.clientHeight;

    if (viewportWidth > 0 && viewportHeight > 0) {
      const centerX = (mapManager.width * this.zoomLevel) / 2;
      const centerY = (mapManager.height * this.zoomLevel) / 2;
      this.mapContainer.scrollLeft = centerX - viewportWidth / 2;
      this.mapContainer.scrollTop = centerY - viewportHeight / 2;
      this.hasCentered = true;
    }
  }

  // Renders terrain colors to the small offscreen canvas (once per dataset change)
  renderOffscreenCanvas() {
    const width = mapManager.width;
    const height = mapManager.height;
    const mapData = mapManager.getMapData();
    const tiles = mapData.tiles;

    if (!tiles || tiles.length === 0) return false;

    // Create ImageData
    const imageData = this.offscreenCtx.createImageData(width, height);
    const data = imageData.data;

    // Helper to parse hex color
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    // Cache colors
    const colorCache = {};
    Object.values(TERRAIN_TYPES).forEach((t) => {
      colorCache[t.id] = hexToRgb(t.color);
    });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        // If hidden, render dark gray, else terrain color
        let color = { r: 17, g: 17, b: 17 }; // #111

        if (!this.hiddenTerrainTypes.has(tile.type)) {
          color = colorCache[tile.type] || color;
        }

        const index = (y * width + x) * 4;
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = 255; // Alpha
      }
    }

    this.offscreenCtx.putImageData(imageData, 0, 0);
    return true;
  }

  // Renders visible portion of offscreen canvas + symbols to main canvas
  renderMainCanvas() {
    this.ctx.imageSmoothingEnabled = false; // Ensure Sharpness

    // Clear Canvas
    this.ctx.fillStyle = "#111"; // Dark grey instead of pitch black
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // --- 1. Draw Background from Offscreen Canvas ---
    // Source: Offscreen Canvas (500x500)
    // Dest: Main Canvas (Viewport Size)
    // We need to map ViewportRect -> WorldRect -> TileRect

    const scrollLeft = this.mapContainer.scrollLeft;
    const scrollTop = this.mapContainer.scrollTop;
    // Note: canvas width/height IS the viewport width/height
    const viewportWidth = this.canvas.width;
    const viewportHeight = this.canvas.height;

    // Calculate the generic Source Rectangle on the Offscreen Canvas
    // sourceX = scrollLeft / zoom
    const sourceX = scrollLeft / this.zoomLevel;
    const sourceY = scrollTop / this.zoomLevel;
    const sourceW = viewportWidth / this.zoomLevel;
    const sourceH = viewportHeight / this.zoomLevel;

    // Draw parameters
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    this.ctx.drawImage(
      this.offscreenCanvas,
      sourceX,
      sourceY,
      sourceW,
      sourceH, // Source (Tiles)
      0,
      0,
      viewportWidth,
      viewportHeight, // Dest (Screen pixels)
    );

    // --- 2. Draw Symbols (Viewport Culling) ---
    if (this.zoomLevel <= 10) return;

    // Calculate Tile Range visible in Viewport
    // We already have sourceX/Y/W/H which ARE tile coordinates!
    const startX = Math.floor(sourceX);
    const startY = Math.floor(sourceY);
    const endX = Math.ceil(sourceX + sourceW);
    const endY = Math.ceil(sourceY + sourceH);

    // Clamp
    const validStartX = Math.max(0, startX);
    const validStartY = Math.max(0, startY);
    const validEndX = Math.min(mapManager.width, endX);
    const validEndY = Math.min(mapManager.height, endY);

    const tiles = mapManager.getMapData().tiles;
    if (!tiles) return;

    const fontSize = Math.floor(this.zoomLevel * 0.7);
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "rgba(0,0,0,0.5)";

    for (let y = validStartY; y < validEndY; y++) {
      for (let x = validStartX; x < validEndX; x++) {
        const tile = tiles[y][x];
        if (this.hiddenTerrainTypes.has(tile.type)) continue;

        const typeInfo = Object.values(TERRAIN_TYPES).find(
          (t) => t.id === tile.type,
        );
        const symbol = typeInfo ? typeInfo.symbol : "?";

        // Calculate Screen Position
        // WorldPos = x * zoom
        // ScreenPos = WorldPos - ScrollLeft
        const screenX = x * this.zoomLevel - scrollLeft;
        const screenY = y * this.zoomLevel - scrollTop;

        this.ctx.fillText(
          symbol,
          screenX + this.zoomLevel / 2,
          screenY + this.zoomLevel / 2,
        );
      }
    }
  }

  renderSidebar() {
    this.sidebar.innerHTML = "";
    const header = document.createElement("h3");
    header.innerText = "Terrain";
    header.style.color = "#fff";
    header.style.textAlign = "center";
    this.sidebar.appendChild(header);

    // Regen Button
    const regenBtn = document.createElement("button");
    regenBtn.innerText = "Regenerate World";
    regenBtn.style.width = "100%";
    regenBtn.style.padding = "8px";
    regenBtn.style.marginBottom = "15px";
    regenBtn.style.cursor = "pointer";
    regenBtn.style.backgroundColor = "#444";
    regenBtn.style.color = "#fff";
    regenBtn.style.border = "1px solid #666";
    regenBtn.onclick = () => {
      if (confirm("Regenerate world?")) {
        mapManager.generateMap({ newSeed: true });
        this.mapDataDirty = true; // Mark dirty
        if (window.gameState) window.gameState.saveGame();
        this.update();
      }
    };
    this.sidebar.appendChild(regenBtn);

    // 1. Home / Specials
    const homeType = TERRAIN_TYPES.HOME;
    if (homeType) {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.padding = "4px";
      item.style.cursor = "pointer";
      item.style.color = "#FFD700"; // Gold
      item.style.fontWeight = "bold";
      item.style.marginBottom = "5px";

      item.onclick = () => this.centerOnHome();

      // Add hover effect
      item.onmouseenter = () =>
        (item.style.backgroundColor = "rgba(255, 255, 255, 0.1)");
      item.onmouseleave = () => (item.style.backgroundColor = "transparent");

      const box = document.createElement("div");
      box.style.width = "16px";
      box.style.height = "16px";
      box.style.minWidth = "16px";
      box.style.flexShrink = "0";
      box.style.backgroundColor = homeType.color;
      box.style.marginRight = "8px";
      box.style.border = "1px solid #fff"; // Highlight it

      const text = document.createElement("span");
      text.innerText = "Home (Click to Center)";
      text.style.fontSize = "12px";

      item.appendChild(box);
      item.appendChild(text);
      this.sidebar.appendChild(item);
    }

    // Separator
    const sep = document.createElement("hr");
    sep.style.borderColor = "rgba(255,255,255,0.1)";
    sep.style.margin = "10px 0";
    this.sidebar.appendChild(sep);

    // Filters (Biomes)
    const sortedTypes = Object.values(TERRAIN_TYPES)
      .filter((t) => t.id !== "HOME")
      .sort((a, b) => a.id.localeCompare(b.id));

    sortedTypes.forEach((type) => {
      this.createSidebarItem(type);
    });
  }

  createSidebarItem(type, labelOverride = null, isHeader = false) {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.padding = "4px";
    item.style.cursor = "pointer";
    item.style.color = "#fff";

    if (isHeader) {
      item.style.fontWeight = "bold";
      item.style.color = "#FFD700";
    }

    const isHidden = this.hiddenTerrainTypes.has(type.id);
    item.style.opacity = isHidden ? "0.5" : "1";

    item.onclick = () => {
      if (isHidden) this.hiddenTerrainTypes.delete(type.id);
      else this.hiddenTerrainTypes.add(type.id);

      // Since showing/hiding changes the background colors, we need to rebuild offscreen canvas
      this.mapDataDirty = true;
      this.update();
    };

    const box = document.createElement("div");
    box.style.width = "16px";
    box.style.height = "16px";
    box.style.minWidth = "16px"; // Extra safety
    box.style.flexShrink = "0"; // Prevent shrinking
    box.style.backgroundColor = type.color;
    box.style.marginRight = "8px";

    const text = document.createElement("span");
    text.innerText = labelOverride || type.id;
    text.style.fontSize = "12px";

    item.appendChild(box);
    item.appendChild(text);
    this.sidebar.appendChild(item);
  }
}
