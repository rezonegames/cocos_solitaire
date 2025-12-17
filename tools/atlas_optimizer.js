/**
 * 图集优化工具
 * 用于自动创建和管理 Cocos Creator 项目中的图集文件
 */

const fs = require('fs');
const path = require('path');

class AtlasOptimizer {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.texturesPath = path.join(projectPath, 'assets/game1/texture');
    }

    /**
     * 创建图集配置
     * @param {string} atlasName 图集名称
     * @param {string[]} imageFiles 图片文件列表
     * @param {string} outputDir 输出目录
     */
    createAtlasConfig(atlasName, imageFiles, outputDir) {
        const atlasConfig = {
            "__type__": "cc.SpriteAtlas",
            "_name": atlasName,
            "_objFlags": 0,
            "_native": "",
            "_textures": {},
            "_textureFilenames": imageFiles.filter(file => 
                file.endsWith('.png') || file.endsWith('.jpg')
            )
        };

        const atlasPath = path.join(outputDir, `${atlasName}.spriteatlas`);
        fs.writeFileSync(atlasPath, JSON.stringify(atlasConfig, null, 2));
        
        console.log(`Created atlas: ${atlasPath}`);
        console.log(`Images count: ${atlasConfig._textureFilenames.length}`);
        
        return atlasPath;
    }

    /**
     * 扫描目录并自动创建图集
     * @param {string} dirPath 目录路径
     * @param {number} maxImages 每个图集最大图片数量
     */
    autoCreateAtlas(dirPath, maxImages = 50) {
        const files = fs.readdirSync(dirPath);
        const imageFiles = files.filter(file => 
            (file.endsWith('.png') || file.endsWith('.jpg')) && 
            !file.includes('.meta')
        );

        if (imageFiles.length === 0) {
            console.log(`No images found in ${dirPath}`);
            return;
        }

        const dirName = path.basename(dirPath);
        
        // 如果图片数量少于等于maxImages，创建一个图集
        if (imageFiles.length <= maxImages) {
            this.createAtlasConfig(`${dirName}_atlas`, imageFiles, dirPath);
        } else {
            // 如果图片太多，分成多个图集
            const chunks = this.chunkArray(imageFiles, maxImages);
            chunks.forEach((chunk, index) => {
                this.createAtlasConfig(`${dirName}_atlas_${index + 1}`, chunk, dirPath);
            });
        }
    }

    /**
     * 将数组分块
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * 批量处理所有纹理目录
     */
    processAllTextures() {
        const textureDirs = [
            'card',
            'main_canvas', 
            'play_ui',
            'pop_daily_bonus',
            'pop_levelup',
            'pop_pause',
            'pop_win',
            'touxiang'
        ];

        textureDirs.forEach(dir => {
            const dirPath = path.join(this.texturesPath, dir);
            if (fs.existsSync(dirPath)) {
                console.log(`Processing directory: ${dir}`);
                this.autoCreateAtlas(dirPath);
            }
        });
    }

    /**
     * 生成图集使用指南
     */
    generateUsageGuide() {
        const guide = `
# 图集使用指南

## 1. 在代码中使用图集资源

\`\`\`typescript
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
\`\`\`

## 2. 预加载图集

\`\`\`typescript
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
\`\`\`

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
`;

        fs.writeFileSync(
            path.join(this.projectPath, 'ATLAS_USAGE_GUIDE.md'), 
            guide
        );
        
        console.log("Generated atlas usage guide: ATLAS_USAGE_GUIDE.md");
    }
}

// 使用示例
if (require.main === module) {
    const projectPath = process.argv[2] || __dirname + '/..';
    const optimizer = new AtlasOptimizer(projectPath);
    
    console.log("Starting atlas optimization...");
    optimizer.processAllTextures();
    optimizer.generateUsageGuide();
    console.log("Atlas optimization completed!");
}

module.exports = AtlasOptimizer;