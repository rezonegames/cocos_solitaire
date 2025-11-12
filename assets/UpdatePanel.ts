import {_decorator, Component, Node, Label, ProgressBar, Button, sys} from 'cc';
import {HotUpdateWeb} from "db://assets/scripts/hotupdate/HotUpdateWeb";
import {HotUpdate} from "db://assets/scripts/hotupdate/HotUpdate";

const {ccclass, property} = _decorator;

@ccclass('UpdatePanel')
export class UpdatePanel extends Component {

    private hotUpdater: HotUpdate | HotUpdateWeb | null = null;

    @property(Label)
    info: Label = null!;

    @property(ProgressBar)
    fileProgress: ProgressBar = null!;

    @property(Label)
    fileLabel: Label = null!;

    @property(ProgressBar)
    byteProgress: ProgressBar = null!;

    @property(Label)
    byteLabel: Label = null!;

    onLoad() {
        if (sys.isNative) {
            this.hotUpdater = this.addComponent(HotUpdate);
        } else {
            this.hotUpdater = this.addComponent(HotUpdateWeb);
        }
    }
}
