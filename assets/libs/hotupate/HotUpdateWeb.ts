import {_decorator, Component} from 'cc';
import {resLoader} from "../res/ResLoader";
import {LanguageLabel} from "../language/LanguageLabel";

const {ccclass, property} = _decorator;

/**
 * HotUpdateWeb.ts
 * -------------------------------------
 * 仅用于 Web 平台的伪热更新逻辑（共用 manifest）
 * 逻辑：对比远程 manifest -> 有新版本 -> 刷新页面
 */
@ccclass('HotUpdateWeb')
export class HotUpdateWeb extends Component {

    private loading = null;

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
        this.loading = this.node.getComponent('Loading');
        this.checkUpdate();
    }

    /**
     * 检查更新
     */
    checkUpdate() {
        this.loading.onInfo(LanguageLabel.pack({dataId: `ui_loading_check_version`}));
        this.doUpdate();
    }

    /**
     * 加载下一个资源目录
     */
    private loadNextDir() {
        if (!this._taskList.length) {
            setTimeout(()=>{
                const bundleName = this.loading.getBundleName();
                this.loading.onInfo(LanguageLabel.pack({dataId: `ui_loading_enter_scene`}));
                this.loading.enterGame(bundleName, );
            }, 300)
            return;
        }
        const dir = this._taskList.shift()!;
        const bundleName = this.loading.getBundleName();

        this.loading.setLabel1(LanguageLabel.pack({dataId: `ui_loading_file`}));
        this.loading.setLabel2(LanguageLabel.pack({dataId: `ui_loading_dir`}));

        this.loading.onInfo(LanguageLabel.pack({dataId: `ui_loading_loading_dir`, params: {dir}}));

        const self = this;

        const onProgress = (finished: number, total: number, item: any) => {
            this.loading.setByteProgress(finished, total);
        };
        const onFinish = () => {
            this.loading.onInfo(LanguageLabel.pack({dataId: `ui_loading_loading_done`, params: {dir}}));
            this.loading.setFileProgress(self._total - self._taskList.length, self._total);
            setTimeout(self.loadNextDir.bind(this), 200);
        };

        resLoader.loadDir(bundleName, dir, onProgress.bind(this), onFinish.bind(this));
    }

    /**
     * 执行“更新”（实为刷新页面加载新版本资源）
     */
    doUpdate() {
        this.loading.setFileProgress(0, this._total);
        this.loading.setByteProgress(0, 1);
        // 加载第一个目录
        this.loadNextDir();
    }
}
