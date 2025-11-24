import { _decorator, Button, Node } from 'cc';
import {UIView} from "db://assets/libs/ui/UIView";
import {LanguageData} from "db://assets/libs/language/LanguageData";
import {uiManager} from "db://assets/libs/ui/UIManager";
import {UIID} from "db://assets/game1/script/YY";
import {logger} from "db://assets/libs/log/Logger";
const { ccclass, property } = _decorator;

@ccclass('UILogin')
export class UILogin extends UIView {

    onLoad() {

    }

    start() {

    }

    update(deltaTime: number) {
        
    }

    onGuestLogin() {
        uiManager.open(UIID.UIPlay);
    }

}

