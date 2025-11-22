import {_decorator, director, sys, Label, ProgressBar} from 'cc';
import * as _ from 'lodash-es';
import {storageManager}  from '../libs/storage/StorageManager';
import {languageManager} from "db://assets/libs/language/Language";
import {HotUpdate} from "db://assets/libs/hotupate/HotUpdate";
import {HotUpdateWeb} from "db://assets/libs/hotupate/HotUpdateWeb";
import VMParent from "db://assets/libs/modelview/VMParent";
import {resLoader} from "db://assets/libs/res/ResLoader";
import {logger} from "db://assets/libs/log/Logger";


const {ccclass, property} = _decorator;

@ccclass('Loading')
export class Loading extends VMParent {

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

    protected data = {
        info: '',
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

    onLoad() {
        super.onLoad();

        const language = storageManager.get('language', 'en');
        logger.logConfig(`storage language:${language}`);
        languageManager.setLanguage('loading', language).then((_) => {
            // 开始热梗
            if (sys.isNative) {
                this.addComponent(HotUpdate);
            } else {
                this.addComponent(HotUpdateWeb);
            }
        });
    }

    start() {

    }

    update(deltaTime: number) {

    }

    getBundleName() {
        return this.data.bundleName;
    }

    onInfo(value: string) {
        this.data.info = value;
    }

    setLabel1(value: string) {
        this.data.label1 = value;
    }

    setLabel2(value: string) {
        this.data.label2 = value;
    }

    setFileProgress(min: number, max: number): void {
        this.data.minFile = min;
        this.data.maxFile = max;
        this.data.fileLabel = this.data.minFile + ' / ' + this.data.maxFile;
    }

    setByteProgress(min: number, max: number): void {
        this.data.minBytes = min;
        this.data.maxBytes = max;
        this.data.byteLabel = this.data.minBytes + ' / ' + this.data.maxBytes;
    }

    /**
     * 加载完成，进入主场景
     */
    enterGame(bundleName: string) {
        resLoader.loadScene(bundleName, this.data.enterScene, (err, scene) => {
            if (!err) director.runScene(scene);
        });
    }
}

