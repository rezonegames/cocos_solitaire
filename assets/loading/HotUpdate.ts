const jsb = (<any>window).jsb;

import {_decorator, Asset, game, log, director} from 'cc';
import {resLoader} from "../libs/res/ResLoader";
import VMParent from "../libs/modelview/VMParent";

const {ccclass, property,} = _decorator;

@ccclass('HotUpdate')
export class HotUpdate extends VMParent {

    protected data = {
        tip: "Hot update",
        minBytes: 0,
        maxBytes: 0,
        byteLabel: '/',
        minFile: 0,
        maxFile: 0,
        fileLabel: '/',
        bundleName: "game1",
        label1: '',
        label2: '',
        enterScene: "scene/Game1"
    }

    @property(Asset)
    manifestUrl: Asset = null!;

    protected _updating = false;
    protected _bundleName: string;
    private _canRetry = false;
    private _storagePath = '';
    private _am: jsb.AssetsManager = null!;
    private _checkListener = null;
    private _updateListener = null;
    private _failCount = 0;
    private versionCompareHandle: (versionA: string, versionB: string) => number = null!;

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

    /**
     * 加载完成，进入主场景
     */
    protected enterGame() {
        this.onInfo('所有资源加载完成，进入主场景...');
        resLoader.loadScene(this._bundleName, this.data.enterScene, (err, scene) => {
            if (!err) director.runScene(scene);
        });

    }

    protected setLabel(label1: string, label2: string): void {
        this.data.label1 = label1;
        this.data.label2 = label2;
    }

    checkCb(event: any) {
        log('Code: ' + event.getEventCode());
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this.onInfo("No local manifest file found, hot update skipped.");
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this.onInfo("Fail to download manifest file, hot update skipped.");
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this.onInfo("Already up to date with the latest remote version.");
                // 设置下载的bundle路径
                this._bundleName = this._am.getLocalManifest().getManifestRoot();
                this.enterGame();
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                this.onInfo('New version found, please try to update. (' + Math.ceil(this._am.getTotalBytes() / 1024) + 'kb)');
                this.doUpdate();
                break;
            default:
                return;
        }


        this._am.setEventCallback(null!);
        this._checkListener = null;
        this._updating = false;
    }

    updateCb(event: any) {
        let needRestart = false;
        let failed = false;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this.onInfo('No local manifest file found, hot update skipped.');
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                this.setFileProgress(event.getDownloadedFiles(), event.getTotalFiles());
                this.setByteProgress(event.getDownloadedBytes(), event.getTotalBytes())
                let msg = event.getMessage();
                if (msg) {
                    this.onInfo('Updated file: ' + msg);
                    // log(event.getPercent()/100 + '% : ' + msg);
                }
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this.onInfo('Fail to download manifest file, hot update skipped.');
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this.onInfo('Already up to date with the latest remote version.');
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                this.onInfo('Update finished. ' + event.getMessage());
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                this.onInfo('Update failed. ' + event.getMessage());
                this.retry();
                this._updating = false;
                this._canRetry = true;
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                this.onInfo('Asset update error: ' + event.getAssetId() + ', ' + event.getMessage());
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                this.onInfo(event.getMessage());
                break;
            default:
                break;
        }

        if (failed) {
            this._am.setEventCallback(null!);
            this._updateListener = null;
            this._updating = false;
        }

        if (needRestart) {
            this._am.setEventCallback(null!);
            this._updateListener = null;
            // Prepend the manifest's search path
            let searchPaths = jsb.fileUtils.getSearchPaths();
            let newPaths = this._am.getLocalManifest().getSearchPaths();
            log(JSON.stringify(newPaths));
            Array.prototype.unshift.apply(searchPaths, newPaths);
            // This value will be retrieved and appended to the default search path during game startup,
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
            localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
            jsb.fileUtils.setSearchPaths(searchPaths);

            // restart game.
            setTimeout(() => {
                game.restart();
            }, 1000)
        }
    }

    retry() {
        if (!this._updating && this._canRetry) {
            this._canRetry = false;
            this.onInfo('Retry failed Assets...');
            this._am.downloadFailedAssets();
        }
    }

    checkUpdate() {
        if (this._updating) {
            this.onInfo('Checking or updating ...');
            return;
        }
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            let url = this.manifestUrl.nativeUrl;
            this._am.loadLocalManifest(url);
        }
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {
            this.onInfo('Failed to load local manifest ...');
            return;
        }
        this._am.setEventCallback(this.checkCb.bind(this));

        this._am.checkUpdate();
        this._updating = true;
    }

    doUpdate() {
        if (this._am && !this._updating) {
            this._am.setEventCallback(this.updateCb.bind(this));

            if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
                let url = this.manifestUrl.nativeUrl;
                this._am.loadLocalManifest(url);
            }
            this._failCount = 0;
            this._am.update();
            this._updating = true;
        }
    }

    show() {

    }

    // use this for initialization
    onLoad() {
        super.onLoad();
        // Hot update is only available in Native build
        if (!jsb) {
            return;
        }
        this._storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'blackjack-remote-asset');
        log('Storage path for remote asset : ' + this._storagePath);

        // Setup your own version compare handler, versionA and B is versions in string
        // if the return value greater than 0, versionA is greater than B,
        // if the return value equals 0, versionA equals to B,
        // if the return value smaller than 0, versionA is smaller than B.
        this.versionCompareHandle = function (versionA: string, versionB: string) {
            log("JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB);
            let vA = versionA.split('.');
            let vB = versionB.split('.');
            for (let i = 0; i < vA.length; ++i) {
                let a = parseInt(vA[i]);
                let b = parseInt(vB[i] || '0');
                if (a === b) {
                    continue;
                } else {
                    return a - b;
                }
            }
            if (vB.length > vA.length) {
                return -1;
            } else {
                return 0;
            }
        };

        // Init with empty manifest url for testing custom manifest
        this._am = new jsb.AssetsManager('', this._storagePath, this.versionCompareHandle);

        // Setup the verification callback, but we don't have md5 check function yet, so only print some message
        // Return true if the verification passed, otherwise return false
        const self = this;
        this._am.setVerifyCallback(function (path: string, asset: any) {
            // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
            let compressed = asset.compressed;
            // Retrieve the correct md5 value.
            let expectedMD5 = asset.md5;
            // asset.path is relative path and path is absolute.
            let relativePath = asset.path;
            // The size of asset file, but this value could be absent.
            let size = asset.size;
            if (compressed) {
                self.onInfo("Verification passed : " + relativePath);
                return true;
            } else {
                self.onInfo("Verification passed : " + relativePath + ' (' + expectedMD5 + ')');
                return true;
            }
        });

        this.onInfo('Hot update is ready, please check or directly update.');
        this.setFileProgress(0, 1);
        this.setByteProgress(0, 1);

        // 进入检测
        this.checkUpdate();
    }

    onDestroy() {
        if (this._updateListener) {
            this._am.setEventCallback(null!);
            this._updateListener = null;
        }
    }
}
