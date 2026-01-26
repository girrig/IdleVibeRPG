import { mapManager, TERRAIN_TYPES } from "../../core/MapManager";

export class MapView {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "map-view";
    this.element.style.width = "100%";
    this.element.style.height = "100%";
    this.element.style.display = "flex";
    this.element.style.flexDirection = "row"; // Changed to row for sidebar
    this.element.style.alignItems = "stretch"; // Stretch to fill height
    this.element.style.overflow = "hidden"; // Main container shouldn't scroll
    this.element.style.boxSizing = "border-box";
    this.element.style.position = "relative";

    // Filter State
    this.hiddenTerrainTypes = new Set();

    // Map Container (holds the scrolling map)
    this.mapContainer = document.createElement("div");
    this.mapContainer.style.flex = "1";
    this.mapContainer.style.position = "relative";
    this.mapContainer.style.overflow = "auto"; // Scrollbars here
    this.mapContainer.style.cursor = "grab";
    this.mapContainer.style.userSelect = "none";
    this.mapContainer.style.display = "flex"; // To center grid if small? or just block.
    this.mapContainer.style.flexDirection = "column";
    this.mapContainer.style.backgroundColor = "#000"; // Ensure background is black everywhere
    // Prevent rubber-banding/bouncing which reveals background
    this.mapContainer.style.overscrollBehavior = "none";

    // Sidebar Container
    this.sidebar = document.createElement("div");
    this.sidebar.style.width = "200px";
    this.sidebar.style.minWidth = "200px";
    this.sidebar.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    this.sidebar.style.borderLeft = "1px solid rgba(255, 255, 255, 0.1)";
    this.sidebar.style.padding = "20px";
    this.sidebar.style.display = "flex";
    this.sidebar.style.flexDirection = "column";
    this.sidebar.style.gap = "10px";
    this.sidebar.style.overflowY = "auto";

    this.element.appendChild(this.mapContainer);
    this.element.appendChild(this.sidebar);

    // Bind Drag Events to mapContainer instead of element
    this.bindDragEvents();

    // Map State
    this.zoomLevel = 24; // Default tile size
    this.minZoom = 12; // Will be updated dynamically
    this.maxZoom = 64;

    // Monitor container size to update minZoom
    this.resizeObserver = new ResizeObserver(() => {
      this.updateMinZoom();
    });
    this.resizeObserver.observe(this.mapContainer);

    // Drag State
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;

    // Wheel Zoom on mapContainer
    this.mapContainer.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        const step = 4;
        if (delta < 0) {
          this.zoomLevel = Math.min(this.zoomLevel + step, this.maxZoom);
        } else {
          this.zoomLevel = Math.max(this.zoomLevel - step, this.minZoom);
        }
        this.update();
      },
      { passive: false },
    );
  }

  updateMinZoom() {
    // Calculate min zoom required to cover the container
    const containerWidth = this.mapContainer.clientWidth;
    const containerHeight = this.mapContainer.clientHeight;

    // Need mapManager dimensions
    // If not rendered yet, can't calc accurately or need direct access
    // But mapManager is imported.
    const tilesX = mapManager.width;
    const tilesY = mapManager.height;

    if (tilesX === 0 || tilesY === 0) return;

    const minZoomX = Math.ceil(containerWidth / tilesX);
    const minZoomY = Math.ceil(containerHeight / tilesY);

    this.minZoom = Math.max(12, Math.max(minZoomX, minZoomY));

    // Enforce current zoom
    if (this.zoomLevel < this.minZoom) {
      this.zoomLevel = this.minZoom;
      this.update();
    }
  }

  bindDragEvents() {
    this.mapContainer.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.mapContainer.style.cursor = "grabbing";
      this.startX = e.pageX - this.mapContainer.offsetLeft;
      this.startY = e.pageY - this.mapContainer.offsetTop;
      this.scrollLeft = this.mapContainer.scrollLeft;
      this.scrollTop = this.mapContainer.scrollTop;
    });

    this.mapContainer.addEventListener("mouseleave", () => {
      this.isDragging = false;
      this.mapContainer.style.cursor = "grab";
    });

    this.mapContainer.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.mapContainer.style.cursor = "grab";
    });

    this.mapContainer.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const x = e.pageX - this.mapContainer.offsetLeft;
      const y = e.pageY - this.mapContainer.offsetTop;
      const walkX = (x - this.startX) * 1.5;
      const walkY = (y - this.startY) * 1.5;
      this.mapContainer.scrollLeft = this.scrollLeft - walkX;
      this.mapContainer.scrollTop = this.scrollTop - walkY;
    });
  }

  render(container) {
    container.innerHTML = "";
    container.appendChild(this.element);
    this.update();
  }

  update() {
    this.mapContainer.innerHTML = "";
    this.sidebar.innerHTML = "";

    const mapData = mapManager.getMapData();
    const tiles = mapData.tiles;

    console.log(
      "Render Map:",
      mapManager.width,
      mapManager.height,
      tiles ? tiles.length : "No Tiles",
    );

    if (!tiles || tiles.length === 0) {
      this.mapContainer.innerHTML += `<div style="color: red; padding: 20px;">Map Data Missing. <button id="regen-map-btn">Regenerate</button></div>`;
      setTimeout(() => {
        const btn = this.mapContainer.querySelector("#regen-map-btn");
        if (btn)
          btn.onclick = () => {
            mapManager.generateMap();
            this.update();
          };
      }, 0);
      return;
    }

    const width = mapManager.width;
    const height = mapManager.height;

    // Render Sidebar
    this.renderSidebar();

    // Zoom Controls (Moved to mapContainer)
    this.renderControls();

    const grid = document.createElement("div");
    // grid.style.flex = "1"; // Remove flex, let it size by content
    grid.style.width = "fit-content"; // Ensure it expands to hold all columns
    grid.style.minWidth = "100%"; // At least full width
    grid.style.minHeight = "100%"; // At least full height
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${width}, ${this.zoomLevel}px)`;
    grid.style.gridTemplateRows = `repeat(${height}, ${this.zoomLevel}px)`;
    grid.style.gap = "0";
    grid.style.backgroundColor = "#000";
    grid.style.border = "none";
    grid.style.transformOrigin = "top left";

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        const tileEl = document.createElement("div");
        tileEl.style.width = "100%";
        tileEl.style.height = "100%";
        tileEl.style.fontSize = `${Math.max(10, this.zoomLevel * 0.6)}px`;
        tileEl.style.lineHeight = `${this.zoomLevel}px`;

        const typeInfo = Object.values(TERRAIN_TYPES).find(
          (t) => t.id === tile.type,
        );
        tileEl.style.backgroundColor = typeInfo ? typeInfo.color : "#000";
        tileEl.style.display = "flex";
        tileEl.style.alignItems = "center";
        tileEl.style.justifyContent = "center";
        tileEl.style.cursor = "pointer";
        tileEl.title = `${typeInfo ? typeInfo.id : "UNKNOWN"} (${x}, ${y})`;
        tileEl.innerText = typeInfo ? typeInfo.symbol : "?";

        // Filter Logic
        if (this.hiddenTerrainTypes.has(tile.type)) {
          tileEl.style.filter = "grayscale(100%) opacity(0.3)";
        }

        // Hover effect
        tileEl.onmouseenter = () => {
          if (!this.hiddenTerrainTypes.has(tile.type)) {
            tileEl.style.opacity = "0.8";
          }
        };
        tileEl.onmouseleave = () => {
          if (!this.hiddenTerrainTypes.has(tile.type)) {
            tileEl.style.opacity = "1";
          }
        };

        grid.appendChild(tileEl);
      }
    }

    this.mapContainer.appendChild(grid);
  }

  renderControls() {
    const controls = document.createElement("div");
    controls.style.position = "sticky";
    controls.style.bottom = "20px";
    controls.style.right = "20px";
    controls.style.alignSelf = "flex-end";
    controls.style.marginRight = "20px";
    controls.style.marginBottom = "20px";
    controls.style.marginLeft = "auto"; // Push to right
    controls.style.display = "flex";
    controls.style.zIndex = "100";

    // Position relative to mapContainer
    // Since mapContainer has overflow:auto and relative, sticky works.
    // Actually, sticky needs to be inside the flow.
    // If we append it after grid, it might be at bottom.
    // Let's use absolute positioning relative to mapContainer which is relative.
    controls.style.position = "absolute";
    controls.style.bottom = "20px";
    controls.style.right = "20px";

    const zoomInBtn = this.createZoomButton("+", () => {
      this.zoomLevel = Math.min(this.zoomLevel + 4, this.maxZoom);
      this.update();
    });

    const zoomOutBtn = this.createZoomButton("-", () => {
      this.zoomLevel = Math.max(this.zoomLevel - 4, this.minZoom);
      this.update();
    });

    controls.appendChild(zoomInBtn);
    controls.appendChild(zoomOutBtn);
    this.mapContainer.appendChild(controls);
  }

  createZoomButton(label, onClick) {
    const btn = document.createElement("button");
    btn.innerText = label;
    btn.style.width = "40px";
    btn.style.height = "40px";
    btn.style.fontSize = "24px";
    btn.style.cursor = "pointer";
    btn.onclick = (e) => {
      e.stopPropagation();
      onClick();
    };
    return btn;
  }

  renderSidebar() {
    const header = document.createElement("h3");
    header.innerText = "Filter Terrain";
    header.style.color = "#fff";
    header.style.marginTop = "0";
    header.style.marginBottom = "10px";
    header.style.fontSize = "16px";
    header.style.textAlign = "center";
    this.sidebar.appendChild(header);

    Object.values(TERRAIN_TYPES).forEach((type) => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.padding = "8px";
      item.style.borderRadius = "4px";
      item.style.cursor = "pointer";
      item.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
      item.style.transition = "all 0.2s";

      const isHidden = this.hiddenTerrainTypes.has(type.id);
      if (isHidden) {
        item.style.opacity = "0.5";
        item.style.filter = "grayscale(100%)";
      } else {
        item.style.border = `1px solid ${type.color}`;
      }

      item.onclick = () => {
        if (this.hiddenTerrainTypes.has(type.id)) {
          this.hiddenTerrainTypes.delete(type.id);
        } else {
          this.hiddenTerrainTypes.add(type.id);
        }
        this.update();
      };

      const icon = document.createElement("span");
      icon.innerText = type.symbol;
      icon.style.marginRight = "10px";
      icon.style.fontSize = "20px";

      const name = document.createElement("span");
      name.innerText = type.id;
      name.style.color = "#fff";
      name.style.fontSize = "14px";

      item.appendChild(icon);
      item.appendChild(name);
      this.sidebar.appendChild(item);
    });
  }
}
