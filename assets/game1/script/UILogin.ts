import {_decorator} from 'cc';
import {UIView} from "db://assets/libs/ui/UIView";
import {uiManager} from "db://assets/libs/ui/UIManager";
import {UIID} from "db://assets/game1/script/YY";
import {wechatLogin} from "db://assets/game1/script/wechat/WechatLogin";
const { ccclass, property } = _decorator;

@ccclass('UILogin')
export class UILogin extends UIView {

    async onLoad() {
    }

    start() {

    }

    update(deltaTime: number) {
        
    }

    async onGuestLogin() {
        try {
            const {openid, token} = await wechatLogin.login();
            console.log('登录成功，openid:', openid);
            
            const userInfo = await wechatLogin.getUserInfo();
            console.log('用户信息:', userInfo);
            
            uiManager.open(UIID.UISelectGame);
        } catch (err) {
            console.error('登录失败:', err);
            uiManager.open(UIID.UISelectGame);
        }
    }
}

