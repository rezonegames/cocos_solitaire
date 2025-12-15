import { Node, instantiate, director, UITransform, Sprite, tween, Tween, Vec3 } from 'cc';

export class LoadingManager {
    private static instance: LoadingManager;
    private loadingNode: Node | null = null;
    private isShowing = false;

    static getInstance(): LoadingManager {
        if (!this.instance) {
            this.instance = new LoadingManager();
        }
        return this.instance;
    }

    show(): void {
        if (this.isShowing) return;
        this.isShowing = true;

        if (!this.loadingNode) {
            this.createLoadingNode();
        }

        const canvas = director.getScene()!.getChildByName('Canvas');
        canvas!.addChild(this.loadingNode!);
        this.loadingNode!.getComponent(UITransform)!.priority = 9999;
        
        this.startRotation();
    }

    hide(): void {
        if (!this.isShowing) return;
        this.isShowing = false;

        if (this.loadingNode) {
            Tween.stopAllByTarget(this.loadingNode);
            this.loadingNode.removeFromParent();
        }
    }

    private createLoadingNode(): void {
        this.loadingNode = new Node('Loading');
        const transform = this.loadingNode.addComponent(UITransform);
        transform.setContentSize(100, 100);
        
        // 这里可以添加菊花图片或者简单的旋转图形
        const sprite = this.loadingNode.addComponent(Sprite);
        // sprite.spriteFrame = 你的菊花图片;
    }

    private startRotation(): void {
        if (!this.loadingNode || !this.isShowing) return;
        
        Tween.stopAllByTarget(this.loadingNode);
        tween(this.loadingNode)
            .by(1, { eulerAngles: new Vec3(0, 0, -360) })
            .repeatForever()
            .start();
    }
}

export const loadingManager = LoadingManager.getInstance();