import { _decorator, Node } from 'cc';
import { UIView } from './UIView';

const { ccclass, property } = _decorator;

/**
 * UI适配使用示例
 * 展示如何在具体界面中使用适配功能
 */
@ccclass('UIAdapterExample')
export class UIAdapterExample extends UIView {
    
    @property(Node)
    centerPanel: Node = null!;
    
    @property(Node)
    topBar: Node = null!;
    
    @property(Node)
    bottomBar: Node = null!;

    onLoad() {
        super.onLoad();
        this.setupAdaptation();
    }

    private setupAdaptation() {
        // 中心面板居中适配，固定大小
        if (this.centerPanel) {
            this.setCenterAdapter(this.centerPanel, 600, 400);
        }
        
        // 顶部栏适配
        if (this.topBar) {
            this.setTopBarAdapter(this.topBar);
        }
        
        // 底部栏适配
        if (this.bottomBar) {
            this.setBottomBarAdapter(this.bottomBar);
        }
    }
    
    /**
     * 设置顶部栏适配
     */
    private setTopBarAdapter(node: Node) {
        const widget = node.getComponent('Widget') || node.addComponent('Widget');
        widget.isAlignTop = true;
        widget.isAlignLeft = widget.isAlignRight = true;
        widget.top = 0;
        widget.left = widget.right = 0;
        widget.alignMode = 2;
        widget.enabled = true;
    }
    
    /**
     * 设置底部栏适配
     */
    private setBottomBarAdapter(node: Node) {
        const widget = node.getComponent('Widget') || node.addComponent('Widget');
        widget.isAlignBottom = true;
        widget.isAlignLeft = widget.isAlignRight = true;
        widget.bottom = 0;
        widget.left = widget.right = 0;
        widget.alignMode = 2;
        widget.enabled = true;
    }
}