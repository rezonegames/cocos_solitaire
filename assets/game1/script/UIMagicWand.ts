import {_decorator} from 'cc';
import {uiManager} from "db://assets/libs/ui/UIManager";
import {UIView} from "db://assets/libs/ui/UIView";
import {UIPlay} from "db://assets/game1/script/logic/UIPlay";
import {UIID} from "db://assets/game1/script/YY";
import {VM} from "db://assets/libs/modelview/ViewModel";
import {wechatAd} from "db://assets/game1/script/wechat/WechatAd";
import {Player} from "db://assets/game1/script/Data";

const {ccclass, property} = _decorator;

@ccclass('UIMagicWand')
export class UIMagicWand extends UIView {

    playing: UIPlay = null;
    player = VM.get<Player>('player').$data;
    cost = 150;
    magicValue = 3;

    init(...args: any) {
        this.playing = args[0];
    }

    start() {

    }

    update(deltaTime: number) {

    }

    onCoin() {
        if (!this.player.addItems({'coin': -this.cost})) {
            uiManager.open(UIID.UIShop);
            return;
        }
        this.playing.addMagicAndSaveLifeOneCard(this.magicValue - 1);
        this.onClose();
    }

    onWatchADS() {
        // 显示激励视频
        wechatAd.showRewardedVideoAd(() => {
            this.player.addItems({coin: this.cost});
        });
    }

    onClose(): any {
        uiManager.close(this)
    }
}

