import {_decorator, director, Asset} from 'cc';

import {resLoader} from "../res/ResLoader";
import VMParent from "../modelview/VMParent";
import {uiManager} from "../ui/UIManager";

const {ccclass, property} = _decorator;

/**
 * HotUpdateWeb.ts
 * -------------------------------------
 * 仅用于 Web 平台的伪热更新逻辑（共用 manifest）
 * 逻辑：对比远程 manifest -> 有新版本 -> 刷新页面
 */
@ccclass('HotUpdateWeb')
export class HotUpdateWeb extends VMParent {

    protected data = {
        tip : "Hot update",
        minBytes : 0,
        maxBytes : 0,
        byteLabel : '/',
        minFile : 0,
        maxFile : 0,
        fileLabel : '/',
        bundleName : "game1",
        label1 : '',
        label2 : '',
        enterScene: "scene/Game1"
    }

    private _taskList: string[] = [
        "scene",
        "config",
        "script",
        "texture",
        "anim",
        "prefab",
        "material",
        "effect"
    ];
    private _total = this._taskList.length;

    protected onInfo(info: string) {
        this.data.tip = info;
    };

    protected setFileProgress(min: number, max: number): void {
        this.data.minFile = min;
        this.data.maxFile = max;
        this.data.fileLabel = this.data.minFile + ' / ' + this.data.maxFile;
    }

    protected setByteProgress(min: number, max: number): void {
        this.data.minBytes = min;
        this.data.maxBytes = max;
        this.data.byteLabel = this.data.minBytes + ' / ' + this.data.maxBytes;
    }

    protected enterGame() {
        this.onInfo('所有资源加载完成，进入主场景...');
        uiManager.closeAll()
        uiManager.clearCache()
        resLoader.loadScene(this.data.bundleName, this.data.enterScene, (err, scene) => {
            if (!err) director.runScene(scene);
        });
    }

    protected setLabel(label1: string, label2: string): void {
        this.data.label1 = label1;
        this.data.label2 = label2;
    }

    onLoad() {
        super.onLoad();
        // 远程需要下载
        this.onInfo('正在检查资源，并准备热梗...');
        this.checkUpdate();
    }

    /**
     * 检查更新
     */
    checkUpdate() {
        this.onInfo('正在检查版本...');
        this.doUpdate();
    }

    /**
     * 加载下一个资源目录
     */
    private loadNextDir() {
        if (!this._taskList.length) {
            this.enterGame();
            return;
        }
        const dir = this._taskList.shift()!;
        const bundleName = this.data.bundleName;
        this.setLabel('文件', '目录')

        this.onInfo(`正在加载目录：${dir}......`);

        const self = this;
        const onProgress = (finished: number, total: number, item: any) => {
            this.setFileProgress(finished, total);
        };

        const onFinish = () => {
            this.onInfo(`${dir} 加载完成`);
            this.setByteProgress(self._total - self._taskList.length, self._total);

            setTimeout(self.loadNextDir.bind(this), 100);
        };

        resLoader.loadDir(bundleName, dir, onProgress.bind(this), onFinish.bind(this));
    }

    /**
     * 执行“更新”（实为刷新页面加载新版本资源）
     */
    doUpdate() {
        if (!this._taskList.length) {
            this.enterGame();
            return;
        }
        this.setFileProgress(0, this._taskList.length);
        this.onInfo(this._taskList[0])

        // 加载第一个目录
        this.loadNextDir();
    }
}
