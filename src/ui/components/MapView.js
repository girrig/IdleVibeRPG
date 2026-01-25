import { mapManager, TERRAIN_TYPES } from "../../core/MapManager";

export class MapView {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "map-view";
    this.element.style.width = "100%";
    this.element.style.height = "100%";
    this.element.style.display = "flex";
    this.element.style.flexDirection = "column";
    this.element.style.alignItems = "center";
    this.element.style.overflow = "auto"; // Restore scrollbars
    this.element.style.boxSizing = "border-box";
    this.element.style.cursor = "grab";
    this.element.style.userSelect = "none"; // Prevent text selection
    this.element.style.position = "relative"; // For absolute positioning of controls

    // Map State
    this.zoomLevel = 24; // Default tile size
    this.minZoom = 12;
    this.maxZoom = 64;

    // Drag State
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;

    // Bind Events
    this.element.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.element.style.cursor = "grabbing";
      this.startX = e.pageX - this.element.offsetLeft;
      this.startY = e.pageY - this.element.offsetTop;
      this.scrollLeft = this.element.scrollLeft;
      this.scrollTop = this.element.scrollTop;
    });

    this.element.addEventListener("mouseleave", () => {
      this.isDragging = false;
      this.element.style.cursor = "grab";
    });

    this.element.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.element.style.cursor = "grab";
    });

    this.element.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const x = e.pageX - this.element.offsetLeft;
      const y = e.pageY - this.element.offsetTop;
      const walkX = (x - this.startX) * 1.5; // Scroll-fast
      const walkY = (y - this.startY) * 1.5;
      this.element.scrollLeft = this.scrollLeft - walkX;
      this.element.scrollTop = this.scrollTop - walkY;
    });

    // Wheel Zoom
    this.element.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        // Zoom step
        const step = 4; // Zoom speed
        if (delta < 0) {
          // Zoom In
          this.zoomLevel = Math.min(this.zoomLevel + step, this.maxZoom);
        } else {
          // Zoom Out
          this.zoomLevel = Math.max(this.zoomLevel - step, this.minZoom);
        }
        this.update();
      },
      { passive: false },
    );
  }

  render(container) {
    container.innerHTML = "";
    container.appendChild(this.element);
    this.update();
  }

  update() {
    this.element.innerHTML = ""; // Clear previous content

    const mapData = mapManager.getMapData();
    const tiles = mapData.tiles;

    console.log(
      "Render Map:",
      mapManager.width,
      mapManager.height,
      tiles ? tiles.length : "No Tiles",
    );

    if (!tiles || tiles.length === 0) {
      this.element.innerHTML += `<div style="color: red;">Map Data Missing. <button id="regen-map-btn">Regenerate</button></div>`;
      setTimeout(() => {
        const btn = this.element.querySelector("#regen-map-btn");
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

    // Zoom Controls
    const controls = document.createElement("div");
    controls.style.position = "sticky";
    controls.style.bottom = "20px";
    controls.style.right = "20px";
    controls.style.alignSelf = "flex-end";
    controls.style.marginRight = "20px";
    controls.style.marginBottom = "20px";
    controls.style.display = "flex";
    controls.style.gap = "0px"; // Changed to 0 gap for connected buttons look potentially, but gap 10 is fine.
    controls.style.zIndex = "100";
    controls.style.pointerEvents = "auto"; // Ensure clicks pass

    // Actually sticky might be tricky if parent scrolls.
    // Let's use fixed relative to the container if possible, but container has overflow:auto.
    // Fixed is relative to viewport. Absolute is relative to nearest positioned ancestor.
    // Position: absolute works if we update it on scroll, or just let it float over content?
    // If we want it "floating" on the screen regardless of scroll, we need a wrapper.
    // BUT we are modifying MapView which is the scroll container itself.
    // To have fixed controls, we should probably have a wrapper for the map.
    // For now, let's just prepend controls and make them fixed.

    // Easier approach: Render controls outside the scrolling grid.
    // But `this.element` IS the scrolling container.
    // Let's create a controls overlay.
    const zoomInBtn = document.createElement("button");
    zoomInBtn.innerText = "+";
    zoomInBtn.style.width = "40px";
    zoomInBtn.style.height = "40px";
    zoomInBtn.style.fontSize = "24px";
    zoomInBtn.style.cursor = "pointer";
    zoomInBtn.onclick = (e) => {
      e.stopPropagation();
      this.zoomLevel = Math.min(this.zoomLevel + 4, this.maxZoom);
      this.update();
    };

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.innerText = "-";
    zoomOutBtn.style.width = "40px";
    zoomOutBtn.style.height = "40px";
    zoomOutBtn.style.fontSize = "24px";
    zoomOutBtn.style.cursor = "pointer";
    zoomOutBtn.onclick = (e) => {
      e.stopPropagation();
      this.zoomLevel = Math.max(this.zoomLevel - 4, this.minZoom);
      this.update();
    };

    // We'll wrap controls in a container that stays fixed relative to the view
    // Since we handle render() by clearing this.element, we can append controls there.
    // But this.element has overflow:auto.
    // Sticky positioning should work inside scrolling container!
    controls.style.position = "sticky"; // Sticky needs a top/bottom/etc
    controls.style.bottom = "20px";
    controls.style.left = "calc(100% - 100px)"; // Hacky positioning

    // Re-thinking: sticky within overflow container works if content is larger.
    controls.appendChild(zoomInBtn);
    controls.appendChild(zoomOutBtn);

    const grid = document.createElement("div");
    grid.style.flex = "1";
    grid.style.width = "100%";
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
        // Font size scales with zoom?
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

        // Hover effect
        tileEl.onmouseenter = () => {
          tileEl.style.opacity = "0.8";
        };
        tileEl.onmouseleave = () => {
          tileEl.style.opacity = "1";
        };

        grid.appendChild(tileEl);
      }
    }

    this.element.appendChild(grid);
    this.element.appendChild(controls);
  }
}
