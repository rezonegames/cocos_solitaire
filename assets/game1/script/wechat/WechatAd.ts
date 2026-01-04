import {sys} from 'cc';

export class WechatAd {
    private static instance: WechatAd;
    private bannerAd: any = null;
    private interstitialAd: any = null;
    private rewardedVideoAd: any = null;
    
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
    
    init() {
        if (sys.platform !== sys.Platform.WECHAT_GAME) return;
        // 延迟初始化，确保游戏环境已准备好
        setTimeout(() => {
            this.createRewardedVideoAd();
        }, 100);
    }
    
    showBannerAd() {
        if (sys.platform !== sys.Platform.WECHAT_GAME) return;
        
        try {
            if (!this.bannerAd) {
                const systemInfo = wx.getSystemInfoSync();
                if (!systemInfo) return;
                
                const {windowWidth, windowHeight} = systemInfo;
                this.bannerAd = wx.createBannerAd({
                    adUnitId: this.adUnitIds.banner,
                    style: {left: 0, top: windowHeight - 100, width: windowWidth}
                });
                
                this.bannerAd.onError((err: any) => {
                    console.error('横幅广告失败:', err);
                    this.bannerAd = null;
                });
            }
            this.bannerAd?.show().catch((err: any) => {
                console.error('显示横幅广告失败:', err);
                this.bannerAd = null;
            });
        } catch (e) {
            console.error('创建横幅广告异常:', e);
            this.bannerAd = null;
        }
    }
    
    hideBannerAd() {
        if (this.bannerAd) this.bannerAd.hide();
    }
    
    showInterstitialAd() {
        if (sys.platform !== sys.Platform.WECHAT_GAME) return;
        
        try {
            if (!this.interstitialAd) {
                this.interstitialAd = wx.createInterstitialAd({
                    adUnitId: this.adUnitIds.interstitial
                });
                this.interstitialAd.onError((err: any) => {
                    console.error('插屏广告失败:', err);
                    this.interstitialAd = null;
                });
            }
            this.interstitialAd?.show().catch(() => {
                this.interstitialAd?.load();
            });
        } catch (e) {
            console.error('创建插屏广告异常:', e);
            this.interstitialAd = null;
        }
    }
    
    private createRewardedVideoAd() {
        if (!wx.createRewardedVideoAd) return;
        
        try {
            this.rewardedVideoAd = wx.createRewardedVideoAd({
                adUnitId: this.adUnitIds.rewarded
            });
            this.rewardedVideoAd.onError((err: any) => {
                console.error('激励视频失败:', err);
                this.rewardedVideoAd = null;
            });
            this.rewardedVideoAd.load().catch((err: any) => {
                console.error('加载激励视频失败:', err);
            });
        } catch (e) {
            console.error('创建激励视频异常:', e);
            this.rewardedVideoAd = null;
        }
    }
    
    showRewardedVideoAd(onRewarded: () => void): Promise<boolean> {
        return new Promise((resolve) => {
            if (sys.platform !== sys.Platform.WECHAT_GAME) {
                onRewarded?.();
                resolve(true);
                return;
            }
            
            if (!this.rewardedVideoAd) {
                resolve(false);
                return;
            }
            
            const closeHandler = (res: any) => {
                if (res?.isEnded) {
                    onRewarded?.();
                    resolve(true);
                } else {
                    resolve(false);
                }
                this.rewardedVideoAd.offClose(closeHandler);
                this.rewardedVideoAd.load();
            };
            
            this.rewardedVideoAd.onClose(closeHandler);
            this.rewardedVideoAd.show().catch(() => {
                this.rewardedVideoAd.load().then(() => this.rewardedVideoAd.show()).catch(() => resolve(false));
            });
        });
    }
}

export const wechatAd = WechatAd.getInstance();
