import { _decorator, Component, Node } from 'cc';
import {UIView} from "db://assets/libs/ui/UIView";
import {uiManager} from "db://assets/libs/ui/UIManager";
import {UIID} from "db://assets/game1/script/YY";
const { ccclass, property } = _decorator;

@ccclass('UISelectGame')
export class UISelectGame extends UIView {
    start() {

    }

    update(deltaTime: number) {

    }

    onPlay() {
        uiManager.open(UIID.UIPlay);
    }
}

