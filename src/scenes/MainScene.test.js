// @vitest-environment browser
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MainScene } from "./MainScene";
import { gameState } from "../core/GameState";
import { uiManager } from "../ui/UIManager";

// Mock global Phaser module to prevent it from loading real browser code
vi.mock("phaser", () => {
    return {
        default: {
            Scene: class Scene {
                constructor(key) { this.key = key; }
            },
            Game: class Game { },
            Scale: {
                RESIZE: 1,
                NO_CENTER: 1
            }
        }
    };
});

// Mock Dependencies
vi.mock("../core/GameState", () => ({
    gameState: {
        initialize: vi.fn(),
        tick: vi.fn(),
    }
}));

vi.mock("../ui/UIManager", () => ({
    uiManager: {
        initialize: vi.fn(),
        selectedCharIndex: 0
    }
}));

describe("MainScene Integration", () => {
    let scene;

    beforeEach(() => {
        scene = new MainScene();

        // Mock internal Phaser scene properties that create() accesses
        scene.cameras = {
            main: {
                centerOn: vi.fn(),
                setBackgroundColor: vi.fn(),
                setViewport: vi.fn(),
                setZoom: vi.fn(),
            }
        };

        scene.scale = {
            on: vi.fn(),
            gameSize: { width: 800, height: 600 }
        };

        scene.add = {
            text: vi.fn().mockReturnValue({
                setOrigin: vi.fn().mockReturnThis(),
                setDepth: vi.fn().mockReturnThis()
            })
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should initialize GameState and UIManager on create", () => {
        // Act
        scene.create();

        // Assert
        expect(gameState.initialize).toHaveBeenCalled();
        expect(uiManager.initialize).toHaveBeenCalled();
        expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalled();
    });

    it("should handle resize events", () => {
        scene.handleResize({ width: 1024, height: 768 });

        expect(scene.cameras.main.setViewport).toHaveBeenCalledWith(0, 0, 1024, 768);
        expect(scene.cameras.main.centerOn).toHaveBeenCalledWith(512, 384);
    });
});
