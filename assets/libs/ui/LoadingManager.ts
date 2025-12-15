import { Node, director, UITransform, Sprite, tween, Tween, Vec3, Color, Graphics, Widget } from 'cc';

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
        // 创建背景遮罩
        this.loadingNode = new Node('Loading');
        const transform = this.loadingNode.addComponent(UITransform);
        const widget = this.loadingNode.addComponent(Widget);
        widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
        widget.left = widget.right = widget.top = widget.bottom = 0;
        widget.alignMode = 2;
        widget.enabled = true;
        
        // 添加半透明背景
        const bg = this.loadingNode.addComponent(Graphics);
        bg.fillColor = new Color(0, 0, 0, 100);
        bg.rect(-10000, -10000, 20000, 20000);
        bg.fill();
        
        // 创建菊花容器
        const spinnerContainer = new Node('SpinnerContainer');
        const spinnerTransform = spinnerContainer.addComponent(UITransform);
        spinnerTransform.setContentSize(60, 60);
        this.loadingNode.addChild(spinnerContainer);
        
        // 创建菊花图形
        this.createSpinner(spinnerContainer);
    }
    
    private createSpinner(container: Node): void {
        const graphics = container.addComponent(Graphics);
        graphics.fillColor = Color.WHITE;
        
        // 绘制菊花形状（多个小圆点组成圆形）
        const dotCount = 12;
        const radius = 20;
        const dotRadius = 3;
        
        for (let i = 0; i < dotCount; i++) {
            const angle = (i / dotCount) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // 设置透明度渐变效果
            const alpha = 1 - (i / dotCount) * 0.8;
            graphics.fillColor = new Color(255, 255, 255, alpha * 255);
            graphics.circle(x, y, dotRadius);
            graphics.fill();
        }
    }

    private startRotation(): void {
        if (!this.loadingNode || !this.isShowing) return;
        
        const spinner = this.loadingNode.getChildByName('SpinnerContainer');
        if (!spinner) return;
        
        Tween.stopAllByTarget(spinner);
        tween(spinner)
            .by(1.5, { eulerAngles: new Vec3(0, 0, -360) })
            .repeatForever()
            .start();
    }
}

export const loadingManager = LoadingManager.getInstance();