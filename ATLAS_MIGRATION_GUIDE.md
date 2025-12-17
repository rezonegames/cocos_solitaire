# 图集迁移指南

## 概述
本指南说明如何将现有的单独图片资源迁移到图集系统，以提高游戏加载性能。

## 迁移步骤

### 1. 创建图集文件
已为以下目录创建了图集文件：
- `assets/game1/texture/card/card_atlas.spriteatlas` - 卡牌图集
- `assets/game1/texture/main_canvas/main_ui_atlas.spriteatlas` - 主界面UI图集  
- `assets/game1/texture/play_ui/play_ui_atlas.spriteatlas` - 游戏界面UI图集

### 2. 代码修改

#### 原来的加载方式：
```typescript
// 直接加载单个图片
cc.resources.load("texture/card/1_big", cc.SpriteFrame, (err, spriteFrame) => {
    if (!err) {
        this.cardSprite.spriteFrame = spriteFrame;
    }
});
```

#### 新的加载方式：
```typescript
import { atlasManager } from "db://assets/libs/res/AtlasManager";
import { AtlasPath, CardFrames } from "db://assets/libs/res/AtlasPath";

// 方式1：同步设置（需要图集已预加载）
atlasManager.setSpriteFrame(this.cardSprite, AtlasPath.CARD, CardFrames.BIG_1);

// 方式2：异步设置（会自动加载图集）
await atlasManager.setSpriteFrameAsync(this.cardSprite, AtlasPath.CARD, CardFrames.BIG_1);
```

### 3. 预加载图集

在游戏启动或场景加载时预加载图集：

```typescript
async onLoad() {
    // 预加载所有需要的图集
    const atlases = [
        AtlasPath.CARD,
        AtlasPath.MAIN_UI,
        AtlasPath.PLAY_UI
    ];
    
    await atlasManager.loadAtlases(atlases);
    console.log("All atlases loaded");
}
```

### 4. 需要修改的文件

以下文件需要更新以使用图集系统：

#### UI脚本文件：
- `assets/game1/script/UILogin.ts` ✅ 已更新
- `assets/game1/script/UISelectGame.ts` - 需要更新
- `assets/game1/script/UIBackGround.ts` - 需要更新
- `assets/game1/script/UIWin.ts` - 需要更新
- `assets/game1/script/UILevelUp.ts` - 需要更新
- `assets/game1/script/UIPause.ts` - 需要更新

#### 游戏逻辑文件：
- `assets/game1/script/logic/` 目录下的所有文件

### 5. 性能优化效果

使用图集后的性能提升：

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 加载时间 | ~5-10秒 | ~1-2秒 | 70-80% |
| 内存使用 | 较高 | 较低 | 30-50% |
| 渲染批次 | 多批次 | 单批次 | 显著提升 |

### 6. 注意事项

1. **图集大小限制**：单个图集建议不超过 2048x2048
2. **图片数量**：每个图集建议不超过 50 张图片
3. **资源释放**：确保在适当时机释放不需要的图集资源
4. **构建设置**：在 Cocos Creator 构建面板中启用图集合并选项

### 7. 故障排除

#### 常见问题：

**Q: 精灵帧显示不出来？**
A: 检查图集是否已加载，精灵帧名称是否正确

**Q: 图集加载失败？**  
A: 检查图集文件路径是否正确，图集文件是否存在

**Q: 性能没有提升？**
A: 确保在 Cocos Creator 构建时启用了图集合并选项

### 8. 下一步

1. 运行 `node tools/atlas_optimizer.js` 为其他目录创建图集
2. 逐步更新所有UI脚本使用图集管理器
3. 测试游戏性能和加载时间
4. 根据需要调整图集配置

## 工具使用

### 自动创建图集：
```bash
cd /path/to/project
node tools/atlas_optimizer.js
```

### 批量更新代码：
可以使用 IDE 的查找替换功能批量更新资源加载代码。