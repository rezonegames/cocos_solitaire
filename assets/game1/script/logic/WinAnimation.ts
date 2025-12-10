import {_decorator, Node, tween, Vec3, randomRange, Quat} from 'cc';
import {UIPlay} from './UIPlay';

const {ccclass} = _decorator;

@ccclass('WinAnimation')
export class WinAnimation {

    private playing: UIPlay = null!;
    private running = false;
    private cards: Node[] = [];
    private center: Vec3 = new Vec3(0, 300, 0); // 收束点

    init(game: UIPlay) {
        this.playing = game;
    }

    /** 开始通关动画 */
    play() {
        if (this.running) return;
        this.running = true;

        // 获取所有牌
        this.cards = [];
        for (const fd of this.playing.foundation) {
            for (const c of fd.node.children) {
                this.cards.push(c);
            }
        }

        // 延迟半秒，更自然
        setTimeout(() => {
            this.startAnimation();
        }, 500);
    }

    /** 对所有牌执行动画 */
    private startAnimation() {
        let delay = 0;
        let completedCount = 0;

        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            const startPos = card.getWorldPosition();

            // 计算心形上的位置
            const t = (i / this.cards.length) * Math.PI * 2;
            const heartPos = this.getHeartPosition(t);
            const end = this.center.clone().add(heartPos);

            // 随机中间控制点
            const mid1 = new Vec3(
                startPos.x + randomRange(-200, 200),
                startPos.y + randomRange(100, 300),
                0
            );
            const mid2 = new Vec3(
                (startPos.x + end.x) / 2 + randomRange(-100, 100),
                (startPos.y + end.y) / 2 + randomRange(100, 200),
                0
            );

            tween(card)
                .delay(delay)
                .parallel(
                    tween().to(1.2, {worldPosition: mid1}),
                    tween().to(0.8, {scale: new Vec3(0.8, 0.8, 1)})
                )
                .to(1.2, {worldPosition: mid2})
                .parallel(
                    tween().to(1.2, {worldPosition: end}),
                    tween().to(1.0, {scale: new Vec3(0.6, 0.6, 1)})
                )
                .call(() => {
                    completedCount++;
                    if (completedCount === this.cards.length) {
                        setTimeout(() => {
                            this.playing.onAnimationComplete();
                        }, 1000);
                    }
                })
                .start();

            delay += 0.08; // 固定延迟
        }
    }

    /** 心形参数方程 */
    private getHeartPosition(t: number): Vec3 {
        const scale = 3; // 调整心形大小
        const x = scale * 16 * Math.pow(Math.sin(t), 3);
        const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        return new Vec3(x, y, 0);
    }

    /** 重置动画，重新开始游戏时调用 */
    reset() {
        this.running = false;
        this.cards = [];
    }
}
