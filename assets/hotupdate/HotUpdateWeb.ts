/**
 * HotUpdateWeb.ts
 * -------------------------------------
 * 仅用于 Web 平台的伪热更新逻辑（共用 manifest）
 * 逻辑：对比远程 manifest -> 有新版本 -> 刷新页面
 */
export class HotUpdateWeb {
    private _manifestUrl: string;
    private _onInfo: (msg: string) => void;
    private _onProgress?: (progress: number) => void;

    constructor(
        manifestUrl: string,
        onInfo: (msg: string) => void,
        onProgress?: (progress: number) => void
    ) {
        this._manifestUrl = manifestUrl;
        this._onInfo = onInfo;
        this._onProgress = onProgress;
    }

    /**
     * 检查更新
     */
    async checkUpdate() {
        this._onInfo('正在检查版本...');

        try {
            const response = await fetch(`${this._manifestUrl}?_=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('无法下载 manifest 文件');

            const manifest = await response.json();
            const remoteVersion = manifest.version;
            const localVersion = localStorage.getItem('WebGameVersion');

            if (!localVersion) {
                this._onInfo('首次加载游戏资源');
                localStorage.setItem('WebGameVersion', remoteVersion);
                return { hasNewVersion: true, remoteVersion };
            }

            if (remoteVersion !== localVersion) {
                this._onInfo(`发现新版本 ${remoteVersion}，点击更新`);
                return { hasNewVersion: true, remoteVersion };
            } else {
                this._onInfo('当前版本已是最新');
                return { hasNewVersion: false };
            }
        } catch (err) {
            console.error(err);
            this._onInfo('版本检测失败');
            return { hasNewVersion: false, error: err };
        }
    }

    /**
     * 执行“更新”（实为刷新页面加载新版本资源）
     */
    async doUpdate() {
        this._onInfo('正在加载新版本...');
        try {
            const response = await fetch(`${this._manifestUrl}?_=${Date.now()}`);
            const manifest = await response.json();
            localStorage.setItem('WebGameVersion', manifest.version);

            this._onProgress?.(1);
            this._onInfo('更新完成，即将刷新页面');
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            console.error(err);
            this._onInfo('更新失败，请重试');
        }
    }
}
