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
    this.mapContainer.appendChild(this.canvas);

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

    // Checkboard pattern for missing data
    this.checkboardPattern = null;
  }

  bindEvents() {
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
    this.mapContainer.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        const step = 2; // Smaller step
        if (delta < 0) {
          this.zoomLevel = Math.min(this.zoomLevel + step, 64);
        } else {
          this.zoomLevel = Math.max(this.zoomLevel - step, 2); // Allow zoom out more
        }
        this.update();
      }
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

  update() {
    this.renderSidebar();

    const mapData = mapManager.getMapData();
    const tiles = mapData.tiles;

    if (!tiles || tiles.length === 0) {
      // Show regen button
      return;
    }

    const width = mapManager.width;
    const height = mapManager.height;

    // Resize Canvas
    this.canvas.width = width * this.zoomLevel;
    this.canvas.height = height * this.zoomLevel;

    // clear
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Tiles
    // Optimization: Loop creates many calls.
    // FillRect might be slow for 250k.
    // But Canvas is usually fast enough for a single frame paint.

    // Pre-calculate fonts
    const fontSize = Math.floor(this.zoomLevel * 0.7);
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];

        // Skip hidden types
        if (this.hiddenTerrainTypes.has(tile.type)) {
          this.ctx.fillStyle = "#111"; // Dimmed
          this.ctx.fillRect(
            x * this.zoomLevel,
            y * this.zoomLevel,
            this.zoomLevel,
            this.zoomLevel,
          );
          continue;
        }

        const typeInfo = Object.values(TERRAIN_TYPES).find(
          (t) => t.id === tile.type,
        );
        const color = typeInfo ? typeInfo.color : "#ff00ff";

        // Draw Background
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          x * this.zoomLevel,
          y * this.zoomLevel,
          this.zoomLevel,
          this.zoomLevel,
        );

        // Draw Symbol (only if zoom is big enough)
        if (this.zoomLevel > 10) {
          const symbol = typeInfo ? typeInfo.symbol : "?";
          this.ctx.fillStyle = "rgba(0,0,0,0.5)"; // Shadow/contrast?
          // Actually, emoji colors can't be set by fillStyle easily, they are distinct.
          this.ctx.fillText(
            symbol,
            x * this.zoomLevel + this.zoomLevel / 2,
            y * this.zoomLevel + this.zoomLevel / 2,
          );
        }
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
