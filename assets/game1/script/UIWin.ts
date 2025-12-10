import { _decorator, Component, Node } from 'cc';
import {UIView} from "db://assets/libs/ui/UIView";
import {uiManager} from "db://assets/libs/ui/UIManager";
import {Player, UIID} from "db://assets/game1/script/YY";
import {VM} from "db://assets/libs/modelview/ViewModel";
const { ccclass, property } = _decorator;

@ccclass('UIWin')
export class UIWin extends UIView {

    player: Player = VM.get<Player>('player').$data;

    start() {
    }

    update(deltaTime: number) {
        
    }

    onClaim() {
        uiManager.open(UIID.UISelectGame);
        uiManager.open(UIID.UILevelUp);
        this.player.addItems({coin: 100});
        this.player.addLevel();
    }

    onWatchADS() {

    }
}

