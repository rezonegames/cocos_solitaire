import { _decorator, Button, Node } from 'cc';
import {UIView} from "db://assets/libs/ui/UIView";
import {uiManager} from "db://assets/libs/ui/UIManager";
import {UIID} from "db://assets/game1/script/YY";
const { ccclass, property } = _decorator;

@ccclass('UILogin')
export class UILogin extends UIView {

    async onLoad() {
    }

    start() {

    }

    update(deltaTime: number) {
        
    }

    onGuestLogin() {
        uiManager.open(UIID.UIPlay);
    }

}

