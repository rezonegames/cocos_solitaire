import {_decorator, sys} from 'cc';
import {HotUpdateWeb} from "../libs/hotupdate/HotUpdateWeb";
import {HotUpdate} from "../libs/hotupdate/HotUpdate";
import {UIView} from "../libs/ui/UIView";

const {ccclass} = _decorator;


@ccclass('UIUpdatePanel')
export class UIUpdatePanel extends UIView {

    private hotUpdater: HotUpdate | HotUpdateWeb | null = null;

    onLoad() {
        if (sys.isNative) {
            this.hotUpdater = this.addComponent(HotUpdate);
        } else {
            this.hotUpdater = this.addComponent(HotUpdateWeb);
        }
    }
}
