import {_decorator} from 'cc';
import {UIView} from "db://assets/libs/ui/UIView";
import {UIPlay} from "db://assets/game1/script/logic/UIPlay";
import {uiManager} from "db://assets/libs/ui/UIManager";
import {UIID} from "db://assets/game1/script/YY";
const { ccclass, property } = _decorator;

@ccclass('UIPause')
export class UIPause extends UIView {

    playing: UIPlay

    init(...args) {
        this.playing = args[0];
    }

    start() {

    }

    update(deltaTime: number) {
        
    }

    onNewDeal() {
        this.playing.onDeal("new");
    }

    onRandomDeal() {
        this.playing.onDeal("random");
    }

    async onRestartGame() {
        // 关闭掉自己，重新开始
        const playing = this.playing;
        setTimeout(()=>{
            playing.restartGame();
        }, 100);
        this.onClose();
    }

    onHomePage() {
        uiManager.open(UIID.UISelectGame);
    }

    onClose(): any {
        uiManager.close(this)
    }
}

