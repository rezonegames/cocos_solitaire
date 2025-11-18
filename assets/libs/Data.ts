import {VM} from "./modelview/ViewModel";


export class GlobalData {

    // 设置相关
    setting: {
        music: 100,
    }

    // 屏幕
    screen: {

    }
}

export let global = new GlobalData();
VM.add(global, 'game');

