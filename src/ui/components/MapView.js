import { mapManager, TERRAIN_TYPES } from "../../core/MapManager";
import { RESOURCE_NODES } from "../../core/Constants";
import { gameState } from "../../core/GameState";

export class MapView {
  // ... (Constructor remains same)
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

    // View Wrapper (Holds Map + Overlay)
    this.viewWrapper = document.createElement("div");
    this.viewWrapper.style.flex = "1";
    this.viewWrapper.style.position = "relative";
    this.viewWrapper.style.overflow = "hidden"; // Clip overlay

    // Map Container
    this.mapContainer = document.createElement("div");
    this.mapContainer.style.width = "100%";
    this.mapContainer.style.height = "100%";
    this.mapContainer.style.position = "relative";
    this.mapContainer.style.overflow = "auto";
    this.mapContainer.style.cursor = "crosshair";
    this.mapContainer.style.backgroundColor = "#000";

    this.viewWrapper.appendChild(this.mapContainer);

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

    this.loadingOverlay = document.createElement("div");
    this.loadingOverlay.style.position = "absolute";
    this.loadingOverlay.style.top = "0";
    this.loadingOverlay.style.left = "0";
    this.loadingOverlay.style.width = "100%";
    this.loadingOverlay.style.height = "100%";
    this.loadingOverlay.style.backgroundColor = "rgba(0,0,0,0.7)";
    this.loadingOverlay.style.color = "white";
    this.loadingOverlay.style.display = "none"; // Hidden by default
    this.loadingOverlay.style.alignItems = "center";
    this.loadingOverlay.style.justifyContent = "center";
    this.loadingOverlay.style.zIndex = "1000";
    this.loadingOverlay.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 10px;">Generating World...</div>
            <div style="font-size: 14px; color: #aaa;">This may take a moment</div>
        </div>
    `;
    this.viewWrapper.appendChild(this.loadingOverlay);

    // Resource Overlay (top-left of map)
    this.resourceOverlay = document.createElement("div");
    this.resourceOverlay.className = "map-resource-overlay";
    this.resourceOverlayOpen = true;
    this.viewWrapper.appendChild(this.resourceOverlay);

    // Actions overlay (bottom-left)
    this.actionsMenu = document.createElement("div");
    this.actionsMenu.className = "map-overlay-panel map-overlay-bottom-left";
    this.actionsMenuOpen = true;
    this.viewWrapper.appendChild(this.actionsMenu);

    // Legend overlay (bottom-right)
    this.mapMenu = document.createElement("div");
    this.mapMenu.className = "map-overlay-panel map-overlay-bottom-right";
    this.mapMenuOpen = true;
    this.viewWrapper.appendChild(this.mapMenu);

    this.element.appendChild(this.viewWrapper);

    // State
    this.zoomLevel = 12; // Start smaller for big map
    // this.hoverTile = null; // Removed

    // Events
    this.bindEvents();
  }

  bindEvents() {
    // Scroll event for rendering updates
    this.mapContainer.addEventListener("scroll", () => {
      this.lastScrollLeft = this.mapContainer.scrollLeft;
      this.lastScrollTop = this.mapContainer.scrollTop;
      this.renderMainCanvas();
    });

    // Mouse Info - REMOVED

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

      // Visual Sync: Resize spacer immediately to ensure scroll clamping works
      const mapWidthTotal = mapManager.width * this.zoomLevel;
      const mapHeightTotal = mapManager.height * this.zoomLevel;
      this.spacer.style.width = mapWidthTotal + "px";
      this.spacer.style.height = mapHeightTotal + "px";

      // Calculate new center in pixels
      const newViewCenterX = tileCenterX * newZoom;
      const newViewCenterY = tileCenterY * newZoom;

      // New scroll position
      this.mapContainer.scrollLeft =
        newViewCenterX - this.mapContainer.clientWidth / 2;
      this.mapContainer.scrollTop =
        newViewCenterY - this.mapContainer.clientHeight / 2;

      // Full Update (will re-verify sizes and render)
      this.update();
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

    // Handle "click" - REMOVED LOGGING
    this.canvas.addEventListener("click", (e) => {
      // No-op for now
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

  // updateTooltip - REMOVED

  render(container) {
    container.innerHTML = "";
    container.appendChild(this.element);

    // Ensure overlays are rendered (idempotent check)
    if (this.actionsMenu.childElementCount === 0) {
      this.renderActionsMenu();
    }
    if (this.mapMenu.childElementCount === 0) {
      this.renderMapMenu();
    }

    // Restore Scroll Position if saved
    if (this.lastScrollLeft !== undefined && this.lastScrollTop !== undefined) {
      // We need to wait for layout/spacer update?
      // this.update() calls resize logic.
      this.update();

      // Restore
      this.mapContainer.scrollLeft = this.lastScrollLeft;
      this.mapContainer.scrollTop = this.lastScrollTop;
    } else {
      this.update();
    }
  }

  // Called when map data or zoom/filters change
  update() {
    // this.renderMapMenu(); // REMOVED: Static menu shouldn't re-render on game tick


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
    this.updateResourceOverlay();

    // Initial Center (Delayed to ensure layout)
    if (!this.hasCentered) {
      setTimeout(() => this.centerOnHome(), 50);
    }
  }

  // Force a redraw of the map data (for game ticks)
  refreshMap() {
    this.mapDataDirty = true;
    this.update();
  }

  // Force a redraw of the map data (for game ticks)
  refreshMap() {
    this.mapDataDirty = true;
    this.update();
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
      // Ensure hexToRgb returns valid object
      const rgb = hexToRgb(t.color);
      colorCache[t.id] = rgb;
      // console.log(`Cached color for ${t.id}:`, rgb);
    });

    for (let y = 0; y < height; y++) {
      if (!tiles[y]) continue; // Safety check
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        // Safety check for undefined tiles
        if (!tile) continue;

        let color; // Declare color variable
        if (!tile.explored) {
          // Fog of War: Black
          color = { r: 5, g: 5, b: 5 }; // Deep Black/Grey
        } else {
          // Retrieve from cache or fallback to hot pink to signal error
          const terrainColor = colorCache[tile.type];
          if (terrainColor) {
            color = terrainColor;
          } else {
            console.warn("Missing color for type:", tile.type);
            color = { r: 255, g: 0, b: 255 }; // Hot Pink
          }
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

    // Debug Zoom
    // console.log(`[MapView] Render Zoom: ${this.zoomLevel}, Source: ${sourceX.toFixed(2)},${sourceY.toFixed(2)} ${sourceW.toFixed(2)}x${sourceH.toFixed(2)} -> Dest: ${viewportWidth}x${viewportHeight}`);

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

    // --- 2. Draw Characters ---
    // --- 2. Draw Characters ---
    // Font size relative to Tile Size (same as symbols)
    const charFontSize = Math.floor(this.zoomLevel * 0.7);
    this.ctx.font = `${charFontSize}px sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    window.gameState.characters.forEach((char) => {
      const { x, y } = char.position;

      // Don't show character if at home (Town covers it)
      if (x === 250 && y === 250) return;

      // Transform World (Tile) Coords -> Screen Coords
      // screenX = (worldX * zoom) - scrollLeft
      // Wait, drawImage maps source area to FULL canvas 0,0.
      // So if char is at x,y (world).
      // Relative to SourceX, SourceY:
      // relX = x - sourceX
      // screenX = relX * zoom
      // OFFSET to Center of Tile: + zoomLevel/2

      const charScreenX = (x - sourceX) * this.zoomLevel;
      const charScreenY = (y - sourceY) * this.zoomLevel;

      // Only draw if within bounds
      if (
        charScreenX >= -this.zoomLevel * 10 &&
        charScreenX <= viewportWidth &&
        charScreenY >= -this.zoomLevel * 10 &&
        charScreenY <= viewportHeight
      ) {
        // --- Draw Sight Radius Highlight (Circular) ---
        const radius = 5; // Radius 5 = 11x11 grid approx
        this.ctx.fillStyle = "rgba(255, 255, 0, 0.4)"; // Bright Yellow

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            // Check circular distance (Euclidean or rounded)
            if (dx * dx + dy * dy <= radius * radius + 0.5) {
              const tileX = charScreenX + dx * this.zoomLevel;
              const tileY = charScreenY + dy * this.zoomLevel;
              this.ctx.fillRect(tileX, tileY, this.zoomLevel, this.zoomLevel);
            }
          }
        }

        // Center of Tile
        const centerX = charScreenX + this.zoomLevel / 2;
        const centerY = charScreenY + this.zoomLevel / 2;

        // Draw Shadow/Backing
        this.ctx.fillStyle = "rgba(0,0,0,0.3)";
        this.ctx.beginPath();
        // Circle radius slightly larger than text to back it up
        this.ctx.arc(centerX, centerY, this.zoomLevel * 0.4, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Emoji (Tweaked Y explicitly)
        this.ctx.fillStyle = "#fff";
        // "middle" baseline is sometimes slightly high for emojis. adding slight offset.
        this.ctx.fillText("🧙‍♂️", centerX, centerY + this.zoomLevel * 0.05);
      }
    });

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
      if (!tiles[y]) continue;
      for (let x = validStartX; x < validEndX; x++) {
        // console.log(`Rendering tile ${x},${y}`); // DEBUG
        const tile = tiles[y][x];
        if (!tile || !tile.explored) continue;

        // REDESIGN: Only draw symbols for RESOURCES (Factorio style clumps)
        // Standard terrain is just color.

        if (tile.resource) {
          const resConfig = RESOURCE_NODES[tile.resource.type];
          const symbol = resConfig ? resConfig.icon : "📦";

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
        } else if (tile.type === "HOME") {
          // Always show Home
          const typeInfo = Object.values(TERRAIN_TYPES).find(t => t.id === "HOME");
          const symbol = typeInfo ? typeInfo.symbol : "🏠";
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

    // --- 3. Draw Character ---
    if (window.gameState && window.gameState.character) {
      const charPos = window.gameState.character.position;
      if (charPos) {
        // Calculate Screen Position
        const screenX = charPos.x * this.zoomLevel - scrollLeft;
        const screenY = charPos.y * this.zoomLevel - scrollTop;

        // Culling Check
        if (
          screenX + this.zoomLevel >= 0 &&
          screenX < viewportWidth &&
          screenY + this.zoomLevel >= 0 &&
          screenY < viewportHeight
        ) {
          // Draw Glow
          this.ctx.shadowColor = "white";
          this.ctx.shadowBlur = 10;

          this.ctx.fillStyle = "#fff";
          this.ctx.beginPath();
          this.ctx.arc(
            screenX + this.zoomLevel / 2,
            screenY + this.zoomLevel / 2,
            this.zoomLevel / 3,
            0,
            Math.PI * 2,
          );
          this.ctx.fill();

          // Reset shadow
          this.ctx.shadowBlur = 0;

          // Draw Label (if zoomed in)
          if (this.zoomLevel > 15) {
            this.ctx.fillStyle = "#fff";
            this.ctx.font = "10px sans-serif"; // Fixed size label
            this.ctx.fillText(
              "HERO",
              screenX + this.zoomLevel / 2,
              screenY - 5,
            );
          }
        }
      }
    }
  }

  renderActionsMenu() {
    try {
      this.actionsMenu.innerHTML = "";

      // Header with toggle
      const header = document.createElement("div");
      header.className = "map-menu-header";
      header.innerHTML = `<span>Actions</span><svg viewBox="0 0 24 24" class="map-menu-chevron${this.actionsMenuOpen ? "" : " collapsed"}"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>`;
      header.addEventListener("click", () => {
        this.actionsMenuOpen = !this.actionsMenuOpen;
        this.renderActionsMenu();
      });
      this.actionsMenu.appendChild(header);

      if (!this.actionsMenuOpen) return;

      // Body
      const body = document.createElement("div");
      body.className = "map-menu-body";

      // Regen Button
      const regenBtn = document.createElement("button");
      regenBtn.innerText = "Regenerate World";
      regenBtn.className = "map-sidebar-btn";
      regenBtn.onclick = () => {
        if (confirm("Regenerate world?")) {
          // Show loading state
          this.loadingOverlay.style.display = "flex";

          // Yield to render thread so overlay appears
          setTimeout(() => {
            try {
              mapManager.generateMap({ newSeed: true });
              this.mapDataDirty = true; // Mark dirty
              if (window.gameState) window.gameState.saveGame();
              this.update();

              // Force center on home after regeneration
              setTimeout(() => this.centerOnHome(), 0);
            } catch (err) {
              console.error("Failed to generate map:", err);
            } finally {
              // Hide loading state
              this.loadingOverlay.style.display = "none";
            }
          }, 100);
        }
      };
      body.appendChild(regenBtn);

      // Home / Specials
      const homeType = TERRAIN_TYPES.HOME;
      if (homeType) {
        const item = document.createElement("div");
        item.className = "sidebar-item-row interactive";
        item.onclick = () => this.centerOnHome();

        const box = document.createElement("div");
        box.className = "terrain-color-box";
        box.style.backgroundColor = homeType.color;

        const text = document.createElement("span");
        text.className = "sidebar-item-text";
        text.innerText = `Home (Click to Center)`;

        item.appendChild(box);
        item.appendChild(text);
        body.appendChild(item);
      }

      this.actionsMenu.appendChild(body);
    } catch (e) {
      console.error("Actions Menu Render Error:", e);
      this.actionsMenu.innerHTML = `<div style="color:red; padding:10px;">Error: ${e.message}</div>`;
    }
  }

  renderMapMenu() {
    try {
      this.mapMenu.innerHTML = "";

      // Header with toggle
      const header = document.createElement("div");
      header.className = "map-menu-header";
      header.innerHTML = `<span>Terrain</span><svg viewBox="0 0 24 24" class="map-menu-chevron${this.mapMenuOpen ? "" : " collapsed"}"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>`;
      header.addEventListener("click", () => {
        this.mapMenuOpen = !this.mapMenuOpen;
        this.renderMapMenu();
      });
      this.mapMenu.appendChild(header);

      if (!this.mapMenuOpen) return;

      // Body
      const body = document.createElement("div");
      body.className = "map-menu-body";

      const sortedTypes = Object.values(TERRAIN_TYPES)
        .filter((t) => t.id !== "HOME")
        .sort((a, b) => a.id.localeCompare(b.id));

      sortedTypes.forEach((type) => {
        const item = this.createSidebarItemElement(type, null, false, false);
        body.appendChild(item);
      });

      this.mapMenu.appendChild(body);
    } catch (e) {
      console.error("Legend Menu Render Error:", e);
      this.mapMenu.innerHTML = `<div style="color:red; padding:10px;">Error: ${e.message}</div>`;
    }
  }

  createSidebarItemElement(type, labelOverride = null, isHeader = false, showSymbol = true) {
    const item = document.createElement("div");
    item.className = "sidebar-item-row";

    if (isHeader) {
      // Legacy flag
      item.style.fontWeight = "bold";
      item.style.color = "#fbbf24";
    }

    const box = document.createElement("div");
    box.className = "terrain-color-box";
    box.style.backgroundColor = type.color;

    // Hide box for resources if they are transparent
    if (type.color === "transparent") {
      box.style.display = "none";
    }

    const text = document.createElement("span");
    text.className = "sidebar-item-text";

    const readableName = labelOverride || type.name || type.id;
    const symbol = (showSymbol && type.symbol) ? type.symbol : "";

    const content = symbol ? `${symbol}  ${readableName}` : readableName;
    text.innerText = content.trim();

    if (type.color !== "transparent") {
      item.appendChild(box);
    }
    item.appendChild(text);
    return item;
  }

  // Legacy Adapter if needed, or just remove if unused. Keeping for safety but it wont be called internally.
  createSidebarItem(type, labelOverride = null, isHeader = false, showSymbol = true) {
    this.mapMenu.appendChild(this.createSidebarItemElement(type, labelOverride, isHeader, showSymbol));
  }

  updateResourceOverlay() {
    const overlay = this.resourceOverlay;
    overlay.innerHTML = "";

    // Header with toggle
    const header = document.createElement("div");
    header.className = "resource-overlay-header";
    header.innerHTML = `<span>Nodes</span><svg viewBox="0 0 24 24" class="resource-overlay-chevron${this.resourceOverlayOpen ? "" : " collapsed"}"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>`;
    header.addEventListener("click", () => {
      this.resourceOverlayOpen = !this.resourceOverlayOpen;
      this.updateResourceOverlay();
    });
    overlay.appendChild(header);

    if (!this.resourceOverlayOpen) return;

    // List
    const list = document.createElement("div");
    list.className = "resource-overlay-list";

    Object.entries(RESOURCE_NODES)
      .map(([nodeKey, node]) => ({ nodeKey, node, count: gameState.getAvailableResourceCount(nodeKey) }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count)
      .forEach(({ node, count }) => {
        const row = document.createElement("div");
        row.className = "resource-overlay-row";
        row.innerHTML = `<span class="resource-overlay-icon">${node.icon}</span><span class="resource-overlay-name">${node.name}</span><span class="resource-overlay-count">${count}</span>`;
        list.appendChild(row);
      });

    overlay.appendChild(list);
  }
}
