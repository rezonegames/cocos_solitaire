import {sys} from 'cc';

export class WechatLogin {
    private static instance: WechatLogin;
    private openid: string = '';
    
    static getInstance(): WechatLogin {
        if (!this.instance) {
            this.instance = new WechatLogin();
        }
        return this.instance;
    }
    
    async login(): Promise<{openid: string, token: string}> {
        if (sys.platform !== sys.Platform.WECHAT_GAME) {
            return {openid: 'test_openid', token: 'test_token'};
        }
        
        return new Promise((resolve, reject) => {
            wx.login({
                success: (res) => {
                    if (res.code) {
                        this.sendCodeToServer(res.code).then(resolve).catch(reject);
                    } else {
                        reject(new Error('登录失败: ' + res.errMsg));
                    }
                },
                fail: reject
            });
        });
    }
    
    private async sendCodeToServer(code: string): Promise<any> {
        return new Promise((resolve, reject) => {
            wx.request({
                url: 'https://your-server.com/api/wechat/login',
                method: 'POST',
                data: {code},
                success: (res: any) => {
                    if (res.data.openid) {
                        this.openid = res.data.openid;
                        resolve({
                            openid: this.openid,
                            token: res.data.token || this.openid
                        });
                    } else {
                        reject(new Error('服务器返回错误'));
                    }
                },
                fail: reject
            });
        });
    }
    
    async getUserInfo(): Promise<any> {
        if (sys.platform !== sys.Platform.WECHAT_GAME) {
            return {nickName: 'Test User', avatarUrl: ''};
        }
        
        return new Promise((resolve, reject) => {
            wx.getUserProfile({
                desc: '用于完善用户资料',
                success: (res) => resolve(res.userInfo),
                fail: reject
            });
        });
    }
    
    getOpenid(): string {
        return this.openid;
    }
}

export const wechatLogin = WechatLogin.getInstance();
