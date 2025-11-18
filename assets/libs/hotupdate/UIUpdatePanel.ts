import {_decorator, sys} from 'cc';
import {HotUpdateWeb} from "./HotUpdateWeb";
import {HotUpdate} from "./HotUpdate";
import {UIView} from "../ui/UIView";

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
