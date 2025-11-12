import {_decorator, director, Asset} from 'cc';
import {HotUpdateBase} from "db://assets/scripts/hotupdate/HotUpdateBase";

import {resLoader} from "db://assets/scripts/res/res-loader";

const {ccclass, property} = _decorator;

/**
 * HotUpdateWeb.ts
 * -------------------------------------
 * 仅用于 Web 平台的伪热更新逻辑（共用 manifest）
 * 逻辑：对比远程 manifest -> 有新版本 -> 刷新页面
 */
@ccclass('HotUpdateWeb')
export class HotUpdateWeb extends HotUpdateBase {

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

    onLoad() {
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
        const bundleName = this._bundleName;
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
