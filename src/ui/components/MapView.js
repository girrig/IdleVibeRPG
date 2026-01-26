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

    // Canvas Element
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false }); // Optimize for no transparency
    this.canvas.style.display = "block"; // Remove inline-block spacing
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
    // Scroll event for symbol culling updates
    this.mapContainer.addEventListener("scroll", () => {
      this.renderMainCanvas(); // Redraw main canvas (with culling) on scroll
    });

    // Mouse Move (Hover)
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tileX = Math.floor(x / this.zoomLevel);
      const tileY = Math.floor(y / this.zoomLevel);

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
    // Wheel Zoom
    this.mapContainer.addEventListener("wheel", (e) => {
      e.preventDefault(); // Always prevent scroll when over map

      const oldZoom = this.zoomLevel;
      const delta = Math.sign(e.deltaY);
      const step = 2; // Smaller step

      // Calculate new zoom
      let newZoom = oldZoom;
      if (delta < 0) {
        newZoom = Math.min(oldZoom + step, 64);
      } else {
        newZoom = Math.max(oldZoom - step, 2);
      }

      if (newZoom === oldZoom) return;

      // Calculate center in "World/Tile" coordinates
      // The pixel visible at the center of the view relative to the canvas
      const viewCenterX =
        this.mapContainer.scrollLeft + this.mapContainer.clientWidth / 2;
      const viewCenterY =
        this.mapContainer.scrollTop + this.mapContainer.clientHeight / 2;

      // Tile at the center
      const tileCenterX = viewCenterX / oldZoom;
      const tileCenterY = viewCenterY / oldZoom;

      this.zoomLevel = newZoom;
      this.update(); // Resizes canvas

      // Calculate new center in pixels
      const newViewCenterX = tileCenterX * newZoom;
      const newViewCenterY = tileCenterY * newZoom;

      // New scroll position = New center - half viewport
      this.mapContainer.scrollLeft =
        newViewCenterX - this.mapContainer.clientWidth / 2;
      this.mapContainer.scrollTop =
        newViewCenterY - this.mapContainer.clientHeight / 2;
    });

    // Handle "click" to log or interact
    // We need to distinguish click from drag
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

    // Calculate position relative to the mapContainer including scroll
    // mapContainer is "relative", so absolute children are positioned relative to its padding box.
    // If we want it at the mouse position (x,y from viewport), we need to adjust for container position and scroll.
    const containerRect = this.mapContainer.getBoundingClientRect();

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

    const width = mapManager.width;
    const height = mapManager.height;

    // Resize Main Canvas
    this.canvas.width = width * this.zoomLevel;
    this.canvas.height = height * this.zoomLevel;
    this.canvas.style.width = width * this.zoomLevel + "px";
    this.canvas.style.height = height * this.zoomLevel + "px";
    // Crucial: Override any global CSS that might squash the canvas
    this.canvas.style.maxWidth = "none";
    this.canvas.style.maxHeight = "none";
    this.canvas.style.minWidth = "0";
    this.canvas.style.minHeight = "0";
    this.canvas.style.flexShrink = "0";

    // Resize Offscreen Canvas if needed (dimensions only map dimensions)
    if (
      this.offscreenCanvas.width !== width ||
      this.offscreenCanvas.height !== height
    ) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this.mapDataDirty = true;
    }

    if (this.mapDataDirty) {
      this.renderOffscreenCanvas();
      this.mapDataDirty = false;
    }

    this.renderMainCanvas();
  }

  // Renders terrain colors to the small offscreen canvas (once per dataset change)
  renderOffscreenCanvas() {
    const width = mapManager.width;
    const height = mapManager.height;
    const mapData = mapManager.getMapData();
    const tiles = mapData.tiles;

    if (!tiles || tiles.length === 0) return;

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
  }

  // Renders visible portion of offscreen canvas + symbols to main canvas
  renderMainCanvas() {
    this.ctx.imageSmoothingEnabled = false; // Keep sharp pixels (NO BLURRY)

    // 1. Draw scaled background
    this.ctx.drawImage(
      this.offscreenCanvas,
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    // 2. Draw Symbols (Viewport Culling)
    if (this.zoomLevel <= 10) return; // Skip symbols if zoomed out too far

    const mapData = mapManager.getMapData();
    const tiles = mapData.tiles;
    if (!tiles) return;

    // Calculate viewport in tile coordinates
    const scrollLeft = this.mapContainer.scrollLeft;
    const scrollTop = this.mapContainer.scrollTop;
    const containerWidth = this.mapContainer.clientWidth;
    const containerHeight = this.mapContainer.clientHeight;

    const startX = Math.floor(scrollLeft / this.zoomLevel);
    const startY = Math.floor(scrollTop / this.zoomLevel);
    // Add buffer of 1-2 tiles to avoid popping
    const endX = Math.min(
      mapManager.width,
      Math.ceil((scrollLeft + containerWidth) / this.zoomLevel) + 1,
    );
    const endY = Math.min(
      mapManager.height,
      Math.ceil((scrollTop + containerHeight) / this.zoomLevel) + 1,
    );

    const validStartX = Math.max(0, startX);
    const validStartY = Math.max(0, startY);

    const fontSize = Math.floor(this.zoomLevel * 0.7);
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "rgba(0,0,0,0.5)"; // Shadow?

    for (let y = validStartY; y < endY; y++) {
      for (let x = validStartX; x < endX; x++) {
        const tile = tiles[y][x];
        if (this.hiddenTerrainTypes.has(tile.type)) continue;

        const typeInfo = Object.values(TERRAIN_TYPES).find(
          (t) => t.id === tile.type,
        );
        const symbol = typeInfo ? typeInfo.symbol : "?";

        this.ctx.fillText(
          symbol,
          x * this.zoomLevel + this.zoomLevel / 2,
          y * this.zoomLevel + this.zoomLevel / 2,
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

    // Filters
    Object.values(TERRAIN_TYPES).forEach((type) => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.padding = "4px";
      item.style.cursor = "pointer";
      item.style.color = "#fff";

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
      text.innerText = type.id;
      text.style.fontSize = "12px";

      item.appendChild(box);
      item.appendChild(text);
      this.sidebar.appendChild(item);
    });
  }
}
