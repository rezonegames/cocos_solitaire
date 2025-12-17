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
        // Cocos Creator 3.x 使用 .pac 格式（Auto Atlas）
        const atlasConfig = {
            "__type__": "cc.AutoAtlas",
            "_name": atlasName,
            "_objFlags": 0,
            "_native": "",
            "maxWidth": 2048,
            "maxHeight": 2048,
            "padding": 2,
            "allowRotation": false,
            "forceSquare": false,
            "powerOfTwo": true,
            "algorithm": "MaxRects",
            "format": "png",
            "quality": 80,
            "contourBleed": true,
            "paddingBleed": true,
            "filterUnused": true
        };

        const atlasPath = path.join(outputDir, `${atlasName}.pac`);
        fs.writeFileSync(atlasPath, JSON.stringify(atlasConfig, null, 2));
        
        console.log(`Created atlas: ${atlasPath}`);
        console.log(`Images in directory: ${imageFiles.length}`);
        
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
}

// 使用示例
if (require.main === module) {
    const projectPath = process.argv[2] || __dirname + '/..';
    const optimizer = new AtlasOptimizer(projectPath);
    
    console.log("Starting atlas optimization...");
    optimizer.processAllTextures();
    console.log("Atlas optimization completed!");
}

module.exports = AtlasOptimizer;