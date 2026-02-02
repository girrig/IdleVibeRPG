import { TERRAIN_TYPES } from "../TerrainTypes";

export class Pathfinder {
    constructor(mapManager) {
        this.mapManager = mapManager;
    }

    get width() { return this.mapManager.width; }
    get height() { return this.mapManager.height; }

    getTile(x, y) {
        return this.mapManager.getTile(x, y);
    }

    exploreTile(x, y) {
        const tile = this.getTile(x, y);
        if (tile && !tile.explored) {
            tile.explored = true;
            return true;
        }
        return false;
    }

    exploreRadius(centerX, centerY, radius) {
        const revealed = [];
        const r = Math.floor(radius);

        for (let y = centerY - r; y <= centerY + r; y++) {
            for (let x = centerX - r; x <= centerX + r; x++) {
                if (Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2) <= Math.pow(r, 2)) {
                    if (this.exploreTile(x, y)) {
                        revealed.push(this.getTile(x, y));
                    }
                }
            }
        }
        return revealed;
    }

    findNearestExploredTile(typeId, startX, startY) {
        const visited = new Set();
        const queue = [{ x: startX, y: startY, dist: 0 }];
        visited.add(`${startX},${startY}`);
        const maxDist = 500;

        let head = 0;
        while (head < queue.length) {
            const current = queue[head++];
            if (current.dist > maxDist) break;

            const tile = this.getTile(current.x, current.y);
            if (tile && tile.explored && tile.type === typeId) {
                return { x: current.x, y: current.y, dist: current.dist };
            }

            const directions = [
                { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 },
            ];

            for (const dir of directions) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny, dist: current.dist + 1 });
                }
            }
        }
        return null;
    }

    getContiguousRegion(startX, startY) {
        const startTile = this.getTile(startX, startY);
        if (!startTile) return new Set();

        const type = startTile.type;
        const region = new Set();
        const queue = [{ x: startX, y: startY }];
        const visited = new Set();

        const startKey = `${startX},${startY}`;
        visited.add(startKey);
        region.add(startKey);

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height) {
                    const key = `${n.x},${n.y}`;
                    if (!visited.has(key)) {
                        if (this.mapManager.tiles[n.y][n.x].type === type) {
                            visited.add(key);
                            region.add(key);
                            queue.push(n);
                        }
                    }
                }
            }
        }
        return region;
    }

    findNearestUnexploredInRegion(regionSet, currentX, currentY) {
        const visited = new Set();
        const queue = [{ x: currentX, y: currentY, dist: 0 }];
        visited.add(`${currentX},${currentY}`);

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            const tile = this.getTile(curr.x, curr.y);
            if (tile && !tile.explored) {
                return { x: curr.x, y: curr.y };
            }

            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
            ];

            for (const n of neighbors) {
                const key = `${n.x},${n.y}`;
                if (!visited.has(key)) {
                    if (regionSet.has(key)) {
                        visited.add(key);
                        queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
                    }
                }
            }
        }
        return null;
    }

    findNearestFrontierTile(startX, startY) {
        const visited = new Set();
        const queue = [{ x: startX, y: startY, dist: 0 }];
        visited.add(`${startX},${startY}`);
        const maxDist = 500;

        const isWalkable = (tile) => {
            if (!tile) return false;
            return tile.type !== TERRAIN_TYPES.OCEAN.id && tile.type !== TERRAIN_TYPES.SHALLOW_OCEAN.id;
        };

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            if (curr.dist > maxDist) break;

            const tile = this.getTile(curr.x, curr.y);
            if (tile && tile.explored) {
                if (!isWalkable(tile)) continue;

                const neighbors = [
                    { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                    { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
                ];

                let isFrontier = false;
                for (const n of neighbors) {
                    const nTile = this.getTile(n.x, n.y);
                    if (nTile && !nTile.explored) {
                        isFrontier = true;
                        break;
                    }
                }

                if (isFrontier) return { x: curr.x, y: curr.y };
            }

            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height) {
                    const key = `${n.x},${n.y}`;
                    if (!visited.has(key)) {
                        const neighborTile = this.getTile(n.x, n.y);
                        if (neighborTile && neighborTile.explored && isWalkable(neighborTile)) {
                            visited.add(key);
                            queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
                        }
                    }
                }
            }
        }
        return null;
    }

    findNearestUnexploredInAdjacentBiome(startX, startY, biomeType) {
        const visited = new Set();
        const queue = [{ x: startX, y: startY, dist: 0 }];
        visited.add(`${startX},${startY}`);
        const maxDist = 2000;

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            if (curr.dist > maxDist) break;

            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
                { x: curr.x + 1, y: curr.y + 1 }, { x: curr.x - 1, y: curr.y - 1 },
                { x: curr.x + 1, y: curr.y - 1 }, { x: curr.x - 1, y: curr.y + 1 },
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height) {
                    const key = `${n.x},${n.y}`;
                    if (!visited.has(key)) {
                        const tile = this.getTile(n.x, n.y);
                        if (!tile) continue;

                        if (!tile.explored) {
                            if (tile.type === biomeType) {
                                return { x: n.x, y: n.y };
                            }
                        } else {
                            visited.add(key);
                            queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
                        }
                    }
                }
            }
        }
        return null;
    }

    findNearestUnvisitedWalkableTile(startX, startY) {
        const visited = new Set();
        const queue = [{ x: startX, y: startY, dist: 0 }];
        visited.add(`${startX},${startY}`);

        let head = 0;

        while (head < queue.length) {
            const curr = queue[head++];

            const tile = this.getTile(curr.x, curr.y);
            if (tile && !tile.visited) {
                return { x: curr.x, y: curr.y };
            }

            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height) {
                    const key = `${n.x},${n.y}`;
                    if (!visited.has(key)) {
                        const nTile = this.getTile(n.x, n.y);
                        if (nTile && nTile.type !== TERRAIN_TYPES.OCEAN.id && nTile.type !== TERRAIN_TYPES.SHALLOW_OCEAN.id) {
                            visited.add(key);
                            queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
                        }
                    }
                }
            }
        }
        return null;
    }

    findNearestExploredUnvisitedTile(typeId, startX, startY) {
        const visited = new Set();
        const queue = [{ x: startX, y: startY, dist: 0 }];
        visited.add(`${startX},${startY}`);
        const maxDist = 500;

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            if (curr.dist > maxDist) break;

            const tile = this.getTile(curr.x, curr.y);
            if (tile && tile.explored && !tile.visited && tile.type === typeId) {
                return { x: curr.x, y: curr.y, dist: curr.dist };
            }

            const directions = [
                { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 },
            ];

            for (const dir of directions) {
                const nx = curr.x + dir.x;
                const ny = curr.y + dir.y;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && !visited.has(key)) {
                    const nTile = this.getTile(nx, ny);
                    if (nTile && nTile.explored) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
                    }
                }
            }
        }
        return null;
    }
}
