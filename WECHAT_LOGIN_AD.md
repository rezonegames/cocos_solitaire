# 微信小游戏 - 登录与广告接入

## 📱 微信登录接入

### 1. 创建微信登录管理器

```typescript
// assets/game1/script/WechatLogin.ts

import {sys} from 'cc';
import {storageManager} from 'db://assets/libs/storage/StorageManager';

export class WechatLogin {
    private static instance: WechatLogin;
    
    private openid: string = '';
    private sessionKey: string = '';
    private userInfo: any = null;
    
    static getInstance(): WechatLogin {
        if (!this.instance) {
            this.instance = new WechatLogin();
        }
        return this.instance;
    }
    
    /**
     * 微信登录
     */
    async login(): Promise<{openid: string, sessionKey: string}> {
        if (sys.platform !== sys.Platform.WECHAT_GAME) {
            console.warn('非微信小游戏环境');
            return {openid: 'test_openid', sessionKey: 'test_session'};
        }
        
        return new Promise((resolve, reject) => {
            wx.login({
                success: (res) => {
                    if (res.code) {
                        console.log('微信登录成功，code:', res.code);
                        // 发送 code 到你的服务器
                        this.sendCodeToServer(res.code)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(new Error('登录失败: ' + res.errMsg));
                    }
                },
                fail: (err) => {
                    reject(err);
                }
            });
        });
    }
    
    /**
     * 发送 code 到服务器换取 openid 和 session_key
     */
    private async sendCodeToServer(code: string): Promise<any> {
        return new Promise((resolve, reject) => {
            wx.request({
                url: 'https://your-server.com/api/wechat/login',
                method: 'POST',
                data: {code},
                success: (res: any) => {
                    if (res.data.openid) {
                        this.openid = res.data.openid;
                        this.sessionKey = res.data.session_key;
                        
                        // 保存到本地
                        storageManager.set('openid', this.openid);
                        
                        resolve({
                            openid: this.openid,
                            sessionKey: this.sessionKey
                        });
                    } else {
                        reject(new Error('服务器返回错误'));
                    }
                },
                fail: reject
            });
        });
    }
    
    /**
     * 获取用户信息（需要用户授权）
     */
    async getUserInfo(): Promise<any> {
        if (sys.platform !== sys.Platform.WECHAT_GAME) {
            return {nickName: 'Test User', avatarUrl: ''};
        }
        
        return new Promise((resolve, reject) => {
            wx.getUserInfo({
                success: (res) => {
                    this.userInfo = res.userInfo;
                    console.log('用户信息:', this.userInfo);
                    resolve(this.userInfo);
                },
                fail: (err) => {
                    console.warn('获取用户信息失败:', err);
                    reject(err);
                }
            });
        });
    }
    
    /**
     * 获取用户头像（新版 API）
     */
    getUserProfile(): Promise<any> {
        if (sys.platform !== sys.Platform.WECHAT_GAME) {
            return Promise.resolve({nickName: 'Test User', avatarUrl: ''});
        }
        
        return new Promise((resolve, reject) => {
            wx.getUserProfile({
                desc: '用于完善用户资料',
                success: (res) => {
                    this.userInfo = res.userInfo;
                    resolve(this.userInfo);
                },
                fail: reject
            });
        });
    }
    
    getOpenid(): string {
        return this.openid || storageManager.get('openid', '');
    }
}

export const wechatLogin = WechatLogin.getInstance();
```

### 2. 在游戏中使用

```typescript
// UILogin.ts

import {wechatLogin} from './WechatLogin';

async onLoginButtonClick() {
    try {
        // 微信登录
        const {openid} = await wechatLogin.login();
        console.log('登录成功，openid:', openid);
        
        // 进入游戏
        this.enterGame();
    } catch (err) {
        console.error('登录失败:', err);
    }
}

async onGetUserInfoClick() {
    try {
        // 获取用户信息（需要按钮触发）
        const userInfo = await wechatLogin.getUserProfile();
        console.log('用户信息:', userInfo);
        
        // 显示用户头像和昵称
        this.showUserInfo(userInfo);
    } catch (err) {
        console.error('获取用户信息失败:', err);
    }
}
```

### 3. 服务器端接口（Node.js 示例）

```javascript
// server/routes/wechat.js

const axios = require('axios');

const APPID = 'wx45832420706d9922';
const SECRET = 'your_app_secret';

router.post('/login', async (req, res) => {
    const {code} = req.body;
    
    try {
        // 调用微信接口换取 openid 和 session_key
        const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
            params: {
                appid: APPID,
                secret: SECRET,
                js_code: code,
                grant_type: 'authorization_code'
            }
        });
        
        const {openid, session_key} = response.data;
        
        // 返回给客户端
        res.json({
            openid,
            session_key
        });
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});
```

---

## 📺 微信广告接入

### 1. 创建广告管理器

```typescript
// assets/game1/script/WechatAd.ts

import {sys} from 'cc';

export enum AdType {
    Banner = 'banner',      // 横幅广告
    Interstitial = 'interstitial',  // 插屏广告
    Rewarded = 'rewarded'   // 激励视频广告
}

export class WechatAd {
    private static instance: WechatAd;
    
    private bannerAd: any = null;
    private interstitialAd: any = null;
    private rewardedVideoAd: any = null;
    
    // 广告位 ID（在微信公众平台获取）
    private adUnitIds = {
        banner: 'adunit-xxxxxx',
        interstitial: 'adunit-yyyyyy',
        rewarded: 'adunit-zzzzzz'
    };
    
    static getInstance(): WechatAd {
        if (!this.instance) {
            this.instance = new WechatAd();
        }
        return this.instance;
    }
    
    /**
     * 初始化广告
     */
    init() {
        if (sys.platform !== sys.Platform.WECHAT_GAME) {
            console.warn('非微信小游戏环境，广告功能不可用');
            return;
        }
        
        // 预加载激励视频广告
        this.createRewardedVideoAd();
    }
    
    /**
     * 创建横幅广告
     */
    createBannerAd() {
        if (!wx.createBannerAd) {
            console.warn('当前微信版本不支持横幅广告');
            return;
        }
        
        if (this.bannerAd) {
            return this.bannerAd;
        }
        
        const {windowWidth, windowHeight} = wx.getSystemInfoSync();
        
        this.bannerAd = wx.createBannerAd({
            adUnitId: this.adUnitIds.banner,
            adIntervals: 30,
            style: {
                left: 0,
                top: windowHeight - 100,
                width: windowWidth
            }
        });
        
        this.bannerAd.onError((err: any) => {
            console.error('横幅广告加载失败:', err);
        });
        
        return this.bannerAd;
    }
    
    /**
     * 显示横幅广告
     */
    showBannerAd() {
        if (!this.bannerAd) {
            this.createBannerAd();
        }
        
        if (this.bannerAd) {
            this.bannerAd.show().catch((err: any) => {
                console.error('显示横幅广告失败:', err);
            });
        }
    }
    
    /**
     * 隐藏横幅广告
     */
    hideBannerAd() {
        if (this.bannerAd) {
            this.bannerAd.hide();
        }
    }
    
    /**
     * 创建插屏广告
     */
    createInterstitialAd() {
        if (!wx.createInterstitialAd) {
            console.warn('当前微信版本不支持插屏广告');
            return;
        }
        
        if (this.interstitialAd) {
            return this.interstitialAd;
        }
        
        this.interstitialAd = wx.createInterstitialAd({
            adUnitId: this.adUnitIds.interstitial
        });
        
        this.interstitialAd.onError((err: any) => {
            console.error('插屏广告加载失败:', err);
        });
        
        return this.interstitialAd;
    }
    
    /**
     * 显示插屏广告
     */
    showInterstitialAd() {
        if (!this.interstitialAd) {
            this.createInterstitialAd();
        }
        
        if (this.interstitialAd) {
            this.interstitialAd.show().catch((err: any) => {
                console.error('显示插屏广告失败:', err);
                // 广告加载失败，重新加载
                this.interstitialAd.load();
            });
        }
    }
    
    /**
     * 创建激励视频广告
     */
    createRewardedVideoAd() {
        if (!wx.createRewardedVideoAd) {
            console.warn('当前微信版本不支持激励视频广告');
            return;
        }
        
        if (this.rewardedVideoAd) {
            return this.rewardedVideoAd;
        }
        
        this.rewardedVideoAd = wx.createRewardedVideoAd({
            adUnitId: this.adUnitIds.rewarded
        });
        
        this.rewardedVideoAd.onError((err: any) => {
            console.error('激励视频广告加载失败:', err);
        });
        
        // 预加载
        this.rewardedVideoAd.load();
        
        return this.rewardedVideoAd;
    }
    
    /**
     * 显示激励视频广告
     * @param onRewarded 观看完成回调
     * @param onClose 关闭回调
     */
    showRewardedVideoAd(onRewarded: () => void, onClose?: () => void): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.rewardedVideoAd) {
                this.createRewardedVideoAd();
            }
            
            if (!this.rewardedVideoAd) {
                console.error('激励视频广告不可用');
                resolve(false);
                return;
            }
            
            // 监听关闭事件
            const closeHandler = (res: any) => {
                if (res && res.isEnded) {
                    // 用户看完广告
                    console.log('用户看完广告');
                    onRewarded?.();
                    resolve(true);
                } else {
                    // 用户中途关闭
                    console.log('用户中途关闭广告');
                    resolve(false);
                }
                
                onClose?.();
                
                // 移除监听
                this.rewardedVideoAd.offClose(closeHandler);
                
                // 预加载下一个广告
                this.rewardedVideoAd.load();
            };
            
            this.rewardedVideoAd.onClose(closeHandler);
            
            // 显示广告
            this.rewardedVideoAd.show().catch((err: any) => {
                console.error('显示激励视频失败:', err);
                
                // 加载失败，重新加载
                this.rewardedVideoAd.load().then(() => {
                    return this.rewardedVideoAd.show();
                }).catch((err: any) => {
                    console.error('重新加载广告失败:', err);
                    resolve(false);
                });
            });
        });
    }
    
    /**
     * 销毁所有广告
     */
    destroy() {
        if (this.bannerAd) {
            this.bannerAd.destroy();
            this.bannerAd = null;
        }
        
        if (this.interstitialAd) {
            this.interstitialAd.destroy();
            this.interstitialAd = null;
        }
        
        if (this.rewardedVideoAd) {
            this.rewardedVideoAd.destroy();
            this.rewardedVideoAd = null;
        }
    }
}

export const wechatAd = WechatAd.getInstance();
```

### 2. 在游戏中使用广告

```typescript
// UIPlay.ts 或其他 UI 脚本

import {wechatAd} from './WechatAd';

export class UIPlay extends VMParentView {
    
    onLoad() {
        super.onLoad();
        
        // 初始化广告
        wechatAd.init();
        
        // 显示横幅广告
        wechatAd.showBannerAd();
    }
    
    onDestroy() {
        // 隐藏横幅广告
        wechatAd.hideBannerAd();
        super.onDestroy();
    }
    
    // 关卡失败时显示插屏广告
    onLevelFailed() {
        wechatAd.showInterstitialAd();
    }
    
    // 看广告获得奖励
    async onWatchAdForReward() {
        const success = await wechatAd.showRewardedVideoAd(
            () => {
                // 观看完成，发放奖励
                console.log('发放奖励');
                this.giveReward();
            },
            () => {
                // 广告关闭
                console.log('广告关闭');
            }
        );
        
        if (!success) {
            console.log('用户未看完广告');
        }
    }
    
    private giveReward() {
        // 发放奖励逻辑
        const player = VM.get<Player>('player').$data;
        player.addItems({coin: 100});
    }
}
```

### 3. 在 Game1.ts 中初始化

```typescript
// Game1.ts

import {wechatLogin} from './WechatLogin';
import {wechatAd} from './WechatAd';

export class Game1 extends Component {
    async onLoad() {
        try {
            // 1. 微信登录
            const {openid} = await wechatLogin.login();
            console.log('登录成功，openid:', openid);
            
            // 2. 初始化广告
            wechatAd.init();
            
            // 3. 初始化游戏
            await GameInstance.init();
        } catch (err) {
            console.error('初始化失败:', err);
        }
    }
}
```

---

## 🎮 广告使用场景

### 1. 横幅广告（Banner）

**使用场景**：
- 游戏主界面底部
- 关卡选择界面

**代码**：
```typescript
// 显示
wechatAd.showBannerAd();

// 隐藏
wechatAd.hideBannerAd();
```

### 2. 插屏广告（Interstitial）

**使用场景**：
- 关卡失败
- 关卡完成
- 场景切换

**代码**：
```typescript
// 关卡失败时显示
onLevelFailed() {
    wechatAd.showInterstitialAd();
}
```

### 3. 激励视频广告（Rewarded Video）

**使用场景**：
- 复活
- 获得道具
- 获得金币

**代码**：
```typescript
// 看广告复活
async onReviveClick() {
    const success = await wechatAd.showRewardedVideoAd(
        () => {
            // 复活玩家
            this.revivePlayer();
        }
    );
    
    if (!success) {
        console.log('用户未看完广告，不复活');
    }
}
```

---

## 🔧 配置广告位

### 1. 在微信公众平台申请广告位

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入 "流量主" → "广告管理"
3. 创建广告位：
   - 横幅广告
   - 插屏广告
   - 激励视频广告
4. 获取广告位 ID（adunit-xxxxxx）

### 2. 配置广告位 ID

在 `WechatAd.ts` 中：

```typescript
private adUnitIds = {
    banner: 'adunit-xxxxxx',        // 替换为你的横幅广告位 ID
    interstitial: 'adunit-yyyyyy',  // 替换为你的插屏广告位 ID
    rewarded: 'adunit-zzzzzz'       // 替换为你的激励视频广告位 ID
};
```

---

## 📋 接入检查清单

### 微信登录
- [ ] 创建 WechatLogin.ts
- [ ] 配置服务器接口
- [ ] 在 UILogin 中调用登录
- [ ] 测试登录流程
- [ ] 保存 openid

### 广告接入
- [ ] 创建 WechatAd.ts
- [ ] 在微信公众平台申请广告位
- [ ] 配置广告位 ID
- [ ] 在游戏中集成广告
- [ ] 测试各类广告

### 服务器配置
- [ ] 实现登录接口
- [ ] 配置 APPID 和 SECRET
- [ ] 配置域名白名单
- [ ] 测试接口

---

## 🐛 常见问题

### Q1: 广告加载失败？

**原因**：
- 广告位 ID 错误
- 小游戏未开通流量主
- 测试环境广告未开启

**解决**：
1. 检查广告位 ID
2. 在微信公众平台开通流量主
3. 在微信开发者工具中启用 "测试号广告"

### Q2: 登录失败？

**原因**：
- 服务器接口错误
- APPID 或 SECRET 错误
- 域名未配置白名单

**解决**：
1. 检查服务器接口
2. 检查 APPID 和 SECRET
3. 在微信公众平台配置域名白名单

### Q3: 激励视频广告看完没有奖励？

**原因**：
- 没有正确监听 onClose 事件
- 没有判断 isEnded

**解决**：
```typescript
rewardedVideoAd.onClose((res) => {
    if (res && res.isEnded) {
        // 用户看完广告，发放奖励
        this.giveReward();
    } else {
        // 用户中途关闭，不发放奖励
        console.log('用户未看完广告');
    }
});
```

---

## 📚 参考文档

- [微信小游戏登录](https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.login.html)
- [微信小游戏广告](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/ad/)
- [激励视频广告](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createRewardedVideoAd.html)

---

## 🎯 快速开始

### 1. 复制代码

将 `WechatLogin.ts` 和 `WechatAd.ts` 复制到项目中

### 2. 配置 ID

修改广告位 ID 和服务器地址

### 3. 集成到游戏

在合适的位置调用登录和广告 API

### 4. 测试

在微信开发者工具中测试功能

---

**完成！现在你的游戏支持微信登录和广告了！** 🎉
