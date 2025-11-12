import {VM} from "db://assets/scripts/modelview/ViewModel";


export class GlobalData {

    // 设置相关
    setting: {
        music: 100,
    }

    // 屏幕
    screen: {

    }

    // 热梗相关
    hotUpdate = {
        tip: 'Hot update',
        minBytes: 0,
        maxBytes: 0,
        byteLabel: '/',
        minFile: 0,
        maxFile: 0,
        fileLabel: '/',
        bundleName: 'game1',
        label1: '',
        label2: '',
    }
}

export let global = new GlobalData();
VM.add(global, 'game');

