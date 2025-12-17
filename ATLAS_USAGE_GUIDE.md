
# 图集使用指南

## 1. 在代码中使用图集资源

```typescript
// 加载图集
cc.resources.load("texture/card/card_atlas", cc.SpriteAtlas, (err, atlas) => {
    if (err) {
        console.error("Failed to load atlas:", err);
        return;
    }
    
    // 从图集中获取精灵帧
    const spriteFrame = atlas.getSpriteFrame("1_big");
    if (spriteFrame) {
        // 设置到 Sprite 组件
        this.cardSprite.spriteFrame = spriteFrame;
    }
});
```

## 2. 预加载图集

```typescript
// 预加载所有图集
const atlases = [
    "texture/card/card_atlas",
    "texture/main_canvas/main_ui_atlas", 
    "texture/play_ui/play_ui_atlas"
];

cc.resources.load(atlases, cc.SpriteAtlas, (err, assets) => {
    if (err) {
        console.error("Failed to preload atlases:", err);
        return;
    }
    console.log("All atlases loaded successfully");
});
```

## 3. 性能优化建议

- 将相关的图片放在同一个图集中
- 图集大小建议不超过 2048x2048
- 每个图集包含的图片数量建议不超过 50 张
- 定期清理不使用的图片资源

## 4. 构建设置

在 Cocos Creator 构建面板中：
- 启用 "合并图集" 选项
- 设置合适的图集最大尺寸
- 选择合适的压缩格式（PNG/JPG）
