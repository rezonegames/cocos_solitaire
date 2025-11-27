import { _decorator } from 'cc';
import { UIPlay } from './UIPlay';

const { ccclass } = _decorator;

@ccclass('WinChecker')
export class WinChecker {

    private playing: UIPlay = null!;
    private locked = false;

    /** 初始化，在 UIPlay.start() 中调用 */
    init(game: UIPlay) {
        this.playing = game;
    }

    /**
     * 检查是否胜利
     * （UIPlay 在每次 move / flip 后都应该调用一次）
     */
    checkWin() {
        if (this.locked) return;

        // 统计 foundation 总数
        let count = 0;
        for (const fd of this.playing.foundation) {
            count += fd.node.children.length;
        }

        if (count === 52) {
            this.locked = true;
            // todo：game win
            // this.playing.onGameWin();
        }
    }

    /** 重置状态（重新开始游戏时） */
    reset() {
        this.locked = false;
    }
}
