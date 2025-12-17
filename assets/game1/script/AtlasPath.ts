/**
 * 图集路径常量
 * 统一管理所有图集的路径，避免硬编码
 */

export const AtlasPath = {
    // 卡牌相关图集
    CARD: "texture/card/card_atlas",
    
    // 主界面UI图集
    MAIN_UI: "texture/main_canvas/main_ui_atlas",
    
    // 游戏界面UI图集
    PLAY_UI: "texture/play_ui/play_ui_atlas",
    
    // 弹窗图集
    POP_DAILY_BONUS: "texture/pop_daily_bonus/pop_daily_bonus_atlas",
    POP_LEVELUP: "texture/pop_levelup/pop_levelup_atlas", 
    POP_PAUSE: "texture/pop_pause/pop_pause_atlas",
    POP_WIN: "texture/pop_win/pop_win_atlas",
    
    // 头像图集
    AVATAR: "texture/touxiang/touxiang_atlas"
};

// 卡牌精灵帧名称
export const CardFrames = {
    // 大牌
    BIG_1: "1_big",
    BIG_2: "2_big", 
    BIG_3: "3_big",
    BIG_4: "4_big",
    BIG_5: "5_big",
    BIG_6: "6_big",
    BIG_7: "7_big",
    BIG_8: "8_big",
    BIG_9: "9_big",
    BIG_10: "10_big",
    BIG_11: "11_big",
    BIG_12: "12_big",
    BIG_13: "13_big",
    
    // 黑牌
    BLACK_1: "1_bla",
    BLACK_2: "2_bla",
    // ... 其他黑牌
    
    // 红牌
    RED_1: "1_red",
    RED_2: "2_red",
    // ... 其他红牌
    
    // 花色
    SPADE: "hx",      // 黑桃
    HEART: "ht",      // 红桃  
    CLUB: "mh",       // 梅花
    DIAMOND: "fk",    // 方块
    
    // 卡牌背景
    CARD_BG_1: "cardbg30001",
    CARD_BG_2: "cardbg30002",
    CARD_SHADOW: "cardShadow"
};

// 主界面UI精灵帧名称
export const MainUIFrames = {
    AVATAR: "avator",
    BTN_DAILY: "btn_daily",
    BTN_FREE_COIN: "btn_freeCoin", 
    BTN_PLAY: "btn_play",
    BTN_SETTING: "btn_setting",
    BTN_SHOP: "btn_shop",
    BTN_TASK: "btn_task",
    BTN_VIP: "btn_VIP",
    COIN_ACQUIRE: "coin_acquire",
    RED_POINT: "red_point",
    STAR: "zhuye_star",
    SUN: "zhuye_sun"
};

// 游戏界面UI精灵帧名称  
export const PlayUIFrames = {
    BTN_BACK: "btn_back",
    BTN_HINT: "btn_hint",
    BTN_MAGIC: "btn_magic", 
    BTN_PAUSE: "btn_pause",
    BTN_SETTING: "btn_setting",
    BOTTOM_BG: "bottom_bg",
    SCORE_BG: "score_bg",
    MAGIC_ICON: "icon_magic",
    HINT_BG: "hint_bg"
};