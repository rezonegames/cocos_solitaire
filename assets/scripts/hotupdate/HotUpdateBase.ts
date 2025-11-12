import {_decorator, Component, director} from 'cc';
import {GlobalData} from "db://assets/scripts/Data";
import {VM} from "db://assets/scripts/modelview/ViewModel";
import {resLoader} from "db://assets/scripts/res/res-loader";

const {ccclass} = _decorator;

@ccclass('HotUpdateBase')
export abstract class HotUpdateBase extends Component {

    protected global: GlobalData = VM.get<GlobalData>('game').$data;

    protected _bundleName: string = this.global.hotUpdate.bundleName;

    protected _updating = false;

    abstract checkUpdate(): void;

    abstract doUpdate(): void;

    protected onInfo(info: string) {
        this.global.hotUpdate.tip = info;
    };

    protected setFileProgress(min: number, max: number): void {
        this.global.hotUpdate.minFile = min;
        this.global.hotUpdate.maxFile = max;
        this.global.hotUpdate.fileLabel = this.global.hotUpdate.minFile + ' / ' + this.global.hotUpdate.maxFile;
    }

    protected setByteProgress(min: number, max: number): void {
        this.global.hotUpdate.minBytes = min;
        this.global.hotUpdate.maxBytes = max;
        this.global.hotUpdate.byteLabel = this.global.hotUpdate.minBytes + ' / ' + this.global.hotUpdate.maxBytes;
    }

    /**
     * 加载完成，进入主场景
     */
    protected enterGame() {
        this.onInfo('所有资源加载完成，进入主场景...');
        resLoader.loadScene(this._bundleName, 'scene/main', (err, scene) => {
            if (!err) director.runScene(scene);
        });
    }
    
    protected setLabel(label1: string, label2: string): void {
        this.global.hotUpdate.label1 = label1;
        this.global.hotUpdate.label2 = label2;
    }

}