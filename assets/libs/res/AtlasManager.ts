/**
 * 图集管理器
 * 统一管理所有图集资源的加载和使用
 */

import { SpriteAtlas, SpriteFrame, Sprite, resources } from 'cc';

export class AtlasManager {
    private static _instance: AtlasManager = null;
    private _atlases: Map<string, SpriteAtlas> = new Map();
    private _loadingPromises: Map<string, Promise<SpriteAtlas>> = new Map();

    public static getInstance(): AtlasManager {
        if (!this._instance) {
            this._instance = new AtlasManager();
        }
        return this._instance;
    }

    public async loadAtlas(atlasPath: string): Promise<SpriteAtlas> {
        if (this._atlases.has(atlasPath)) {
            return this._atlases.get(atlasPath);
        }

        if (this._loadingPromises.has(atlasPath)) {
            return this._loadingPromises.get(atlasPath);
        }

        const loadPromise = new Promise<SpriteAtlas>((resolve, reject) => {
            resources.load(atlasPath, SpriteAtlas, (err, atlas) => {
                if (err) {
                    console.error(`Failed to load atlas: ${atlasPath}`, err);
                    reject(err);
                    return;
                }

                this._atlases.set(atlasPath, atlas);
                this._loadingPromises.delete(atlasPath);
                resolve(atlas);
            });
        });

        this._loadingPromises.set(atlasPath, loadPromise);
        return loadPromise;
    }

    public async loadAtlases(atlasPaths: string[]): Promise<SpriteAtlas[]> {
        const promises = atlasPaths.map(path => this.loadAtlas(path));
        return Promise.all(promises);
    }

    public getSpriteFrame(atlasPath: string, frameName: string): SpriteFrame | null {
        const atlas = this._atlases.get(atlasPath);
        if (!atlas) {
            console.warn(`Atlas not loaded: ${atlasPath}`);
            return null;
        }

        const spriteFrame = atlas.getSpriteFrame(frameName);
        if (!spriteFrame) {
            console.warn(`SpriteFrame not found: ${frameName} in ${atlasPath}`);
        }

        return spriteFrame;
    }

    public setSpriteFrame(sprite: Sprite, atlasPath: string, frameName: string): boolean {
        const spriteFrame = this.getSpriteFrame(atlasPath, frameName);
        if (spriteFrame) {
            sprite.spriteFrame = spriteFrame;
            return true;
        }
        return false;
    }

    public async setSpriteFrameAsync(sprite: Sprite, atlasPath: string, frameName: string): Promise<boolean> {
        try {
            await this.loadAtlas(atlasPath);
            return this.setSpriteFrame(sprite, atlasPath, frameName);
        } catch (error) {
            console.error(`Failed to set sprite frame: ${frameName}`, error);
            return false;
        }
    }

    public releaseAtlas(atlasPath: string): void {
        const atlas = this._atlases.get(atlasPath);
        if (atlas) {
            resources.release(atlasPath);
            this._atlases.delete(atlasPath);
        }
    }

    public releaseAll(): void {
        this._atlases.forEach((atlas, path) => {
            resources.release(path);
        });
        this._atlases.clear();
        this._loadingPromises.clear();
    }
}

export const atlasManager = AtlasManager.getInstance();
