import { ResolutionPolicy, screen, view, sys, game, Game } from "cc";

/** 屏幕适配管理器 */
export class ScreenAdapter {
    /** 窗口宽高比例 */
    private windowAspectRatio: number = 0;
    /** 设计宽高比例 */
    private designAspectRatio: number = 0;
    /** 原始设计分辨率 */
    private originalDesignSize = { width: 0, height: 0 };

    /**
     * 初始化屏幕适配
     */
    init() {
        // 保存原始设计分辨率
        const drs = view.getDesignResolutionSize();
        this.originalDesignSize.width = drs.width;
        this.originalDesignSize.height = drs.height;
        this.designAspectRatio = drs.width / drs.height;
        
        this.updateScreenAdapter();
        this.registerResizeEvent();
    }

    /**
     * 注册窗口大小改变事件
     */
    private registerResizeEvent() {
        if (!sys.isMobile) {
            screen.on("window-resize", this.onWindowResize, this);
            screen.on("fullscreen-change", this.onWindowResize, this);
        }
        
        screen.on("orientation-change", this.onWindowResize, this);
    }

    /**
     * 窗口大小改变回调
     */
    private onWindowResize() {
        // 延迟一帧执行，确保窗口大小已经更新
        setTimeout(() => {
            this.updateScreenAdapter();
        }, 100);
    }

    /**
     * 更新屏幕适配
     */
    updateScreenAdapter() {
        const ws = screen.windowSize;
        this.windowAspectRatio = ws.width / ws.height;

        let finalW: number = 0;
        let finalH: number = 0;

        if (this.windowAspectRatio > this.designAspectRatio) {
            // 横屏适配 - 适配高度
            finalH = this.originalDesignSize.height;
            finalW = finalH * this.windowAspectRatio;
            console.log("适配屏幕高度【横屏】");
        } else {
            // 竖屏适配 - 适配宽度
            finalW = this.originalDesignSize.width;
            finalH = finalW / this.windowAspectRatio;
            console.log("适配屏幕宽度【竖屏】");
        }

        view.setDesignResolutionSize(finalW, finalH, ResolutionPolicy.UNKNOWN);
        console.log(`屏幕适配完成: ${finalW}x${finalH}, 窗口比例: ${this.windowAspectRatio.toFixed(2)}`);
    }

    /**
     * 获取当前窗口宽高比
     */
    getWindowAspectRatio(): number {
        return this.windowAspectRatio;
    }

    /**
     * 获取设计宽高比
     */
    getDesignAspectRatio(): number {
        return this.designAspectRatio;
    }

    /**
     * 销毁时清理事件监听
     */
    destroy() {
        if (!sys.isMobile) {
            screen.off("window-resize", this.onWindowResize, this);
            screen.off("fullscreen-change", this.onWindowResize, this);
        }
        screen.off("orientation-change", this.onWindowResize, this);
    }
}

export const screenAdapter = new ScreenAdapter();