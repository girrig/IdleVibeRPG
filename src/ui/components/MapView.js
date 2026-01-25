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
    this.element.style.overflow = "hidden"; // Hide scrollbars for custom drag
    this.element.style.boxSizing = "border-box";
    this.element.style.cursor = "grab";
    this.element.style.userSelect = "none"; // Prevent text selection

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

    const grid = document.createElement("div");
    grid.style.flex = "1";
    grid.style.width = "100%";
    // Maintain aspect ratio or just fill? Let's fill but keep square tiles if possible
    // Actually user said "take up whole container", so filling is best.
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${width}, 24px)`;
    grid.style.gridTemplateRows = `repeat(${height}, 24px)`;
    grid.style.gap = "0"; // No gap for seamless look
    grid.style.backgroundColor = "#000";
    grid.style.border = "none";
    // grid.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)"; // Shadow might look weird if full screen

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        const tileEl = document.createElement("div");
        tileEl.style.width = "100%";
        tileEl.style.height = "100%";
        tileEl.style.fontSize = "14px"; // Slightly smaller font
        tileEl.style.lineHeight = "24px";

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
        tileEl.style.fontSize = "16px";

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
  }
}
