import { _decorator, Component, Node } from 'cc';
import {UIView} from "db://assets/libs/ui/UIView";
import {uiManager} from "db://assets/libs/ui/UIManager";
const { ccclass, property } = _decorator;

@ccclass('UILevelUp')
export class UILevelUp extends UIView {
    start() {

    }

    update(deltaTime: number) {
        
    }

    onOK() {
        uiManager.close(this);
    }
}

