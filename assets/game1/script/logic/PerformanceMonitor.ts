import {_decorator, Component, director} from 'cc';
import {logger} from "db://assets/libs/log/Logger";

const {ccclass} = _decorator;

@ccclass('PerformanceMonitor')
export class PerformanceMonitor extends Component {
    private frameCount = 0;
    private lastTime = 0;
    private fps = 60;
    private frameTimeHistory: number[] = [];
    private maxHistorySize = 60; // 保存60帧的历史数据
    
    // 性能阈值
    private readonly LOW_FPS_THRESHOLD = 30;
    private readonly HIGH_FRAME_TIME_THRESHOLD = 33.33; // 30fps对应的帧时间
    
    // 统计数据
    private lowFpsFrameCount = 0;
    private totalFrames = 0;
    
    start() {
        this.lastTime = performance.now();
        logger.logView('PerformanceMonitor: 性能监控已启动');
    }
    
    update(deltaTime: number) {
        const currentTime = performance.now();
        const frameTime = currentTime - this.lastTime;
        
        this.frameCount++;
        this.totalFrames++;
        
        // 记录帧时间历史
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxHistorySize) {
            this.frameTimeHistory.shift();
        }
        
        // 检测低帧率
        if (frameTime > this.HIGH_FRAME_TIME_THRESHOLD) {
            this.lowFpsFrameCount++;
        }
        
        // 每秒输出一次统计
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            
            // 输出性能报告
            this.reportPerformance();
            
            this.lastTime = currentTime;
        } else {
            this.lastTime = currentTime;
        }
    }
    
    private reportPerformance() {
        const avgFrameTime = this.getAverageFrameTime();
        const maxFrameTime = Math.max(...this.frameTimeHistory);
        const minFrameTime = Math.min(...this.frameTimeHistory);
        const lowFpsPercentage = (this.lowFpsFrameCount / this.totalFrames * 100).toFixed(1);
        
        // 只在性能较差时输出警告
        if (this.fps < this.LOW_FPS_THRESHOLD || avgFrameTime > this.HIGH_FRAME_TIME_THRESHOLD) {
            logger.logView(`⚠️ 性能警告 - FPS: ${this.fps}, 平均帧时间: ${avgFrameTime.toFixed(2)}ms, 最大帧时间: ${maxFrameTime.toFixed(2)}ms, 低帧率占比: ${lowFpsPercentage}%`);
        }
        
        // 重置统计
        this.lowFpsFrameCount = 0;
        this.totalFrames = 0;
    }
    
    private getAverageFrameTime(): number {
        if (this.frameTimeHistory.length === 0) return 0;
        const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
        return sum / this.frameTimeHistory.length;
    }
    
    /** 获取当前性能状态 */
    getPerformanceStatus() {
        return {
            fps: this.fps,
            avgFrameTime: this.getAverageFrameTime(),
            maxFrameTime: this.frameTimeHistory.length > 0 ? Math.max(...this.frameTimeHistory) : 0,
            isPerformanceGood: this.fps >= this.LOW_FPS_THRESHOLD
        };
    }
    
    /** 手动触发性能报告 */
    logPerformanceReport() {
        const status = this.getPerformanceStatus();
        logger.logView(`📊 性能报告 - FPS: ${status.fps}, 平均帧时间: ${status.avgFrameTime.toFixed(2)}ms, 最大帧时间: ${status.maxFrameTime.toFixed(2)}ms`);
    }
}