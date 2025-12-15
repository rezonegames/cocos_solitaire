import { _decorator, Component, Node } from 'cc';
import _ from 'lodash-es';
import {uiManager} from "db://assets/libs/ui/UIManager";
import VMParentView from "db://assets/libs/gui/VMParentView";
const { ccclass, property } = _decorator;

@ccclass('UILevelUp')
export class UILevelUp extends VMParentView {
    data = {
        before: '',
        after: '',
    }

    init(...args: any) {
        const v = args[0];
        _.merge(this.data, v)
    }
    start() {

    }

    update(deltaTime: number) {
        
    }

    onOK() {
        uiManager.close(this);
    }
}

