import { _decorator, Component } from 'cc';
import { screenAdapter } from './ScreenAdapter';

const { ccclass } = _decorator;

/**
 * UI初始化组件
 * 挂载到Canvas节点上，用于初始化UI相关功能
 */
@ccclass('UIInit')
export class UIInit extends Component {
    
    onLoad() {
        // 初始化屏幕适配
        screenAdapter.init();
        console.log('UI系统初始化完成');
    }
    
    onDestroy() {
        // 清理屏幕适配事件监听
        screenAdapter.destroy();
    }
}