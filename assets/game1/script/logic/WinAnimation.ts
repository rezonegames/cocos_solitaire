import { _decorator, Node, tween, Vec3, randomRange, Quat } from 'cc';
import { UIPlay } from './UIPlay';

const { ccclass } = _decorator;

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

    /** 对所有牌执行贝塞尔动画 */
    private startAnimation() {

        let delay = 0;

        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];

            // 世界坐标
            const startPos = card.worldPosition.clone();

            // 随机两个中间控制点（贝塞尔曲线）
            const mid1 = startPos.add(new Vec3(
                randomRange(-200, 200),
                randomRange(100, 300),
                0
            ));
            const mid2 = startPos.add(new Vec3(
                randomRange(-200, 200),
                randomRange(200, 400),
                0
            ));

            // 最终收束点（随机些）
            const end = this.center.clone();
            end.x += randomRange(-50, 50);
            end.y += randomRange(-50, 50);

            // 采用 3 段 tween 模拟一个平滑的贝塞尔路径
            tween(card)
                .delay(delay)
                .to(0.35, { worldPosition: mid1 })
                .to(0.35, { worldPosition: mid2 })
                .to(0.45, { worldPosition: end })
                .start();

            // 下一张牌稍微延迟播放
            delay += 0.03;
        }
    }

    /** 重置动画，重新开始游戏时调用 */
    reset() {
        this.running = false;
        this.cards = [];
    }
}
