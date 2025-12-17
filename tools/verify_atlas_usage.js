/**
 * 验证图集使用情况
 * 检查项目中是否还有使用单独图片的地方
 */

const fs = require('fs');
const path = require('path');

class AtlasUsageVerifier {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.assetsPath = path.join(projectPath, 'assets');
        this.singleImageUsages = [];
        this.atlasUsages = [];
    }

    /**
     * 验证所有文件的图集使用情况
     */
    verifyAll() {
        console.log('🔍 Scanning for image usage...');
        
        // 扫描 Prefab 文件
        this.scanDirectory(this.assetsPath, '.prefab', (filePath) => {
            this.checkFileForImageUsage(filePath, 'prefab');
        });

        // 扫描场景文件
        this.scanDirectory(this.assetsPath, '.scene', (filePath) => {
            this.checkFileForImageUsage(filePath, 'scene');
        });

        // 扫描脚本文件
        this.scanDirectory(this.assetsPath, '.ts', (filePath) => {
            this.checkFileForImageUsage(filePath, 'script');
        });

        this.generateReport();
    }

    /**
     * 扫描目录
     */
    scanDirectory(dirPath, extension, callback) {
        if (!fs.existsSync(dirPath)) return;

        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                this.scanDirectory(filePath, extension, callback);
            } else if (file.endsWith(extension)) {
                callback(filePath);
            }
        });
    }

    /**
     * 检查文件中的图片使用情况
     */
    checkFileForImageUsage(filePath, fileType) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(this.projectPath, filePath);

            // 检查单独图片使用
            const singleImagePatterns = [
                /texture\/card\/\d+_(big|bla|red)/g,
                /texture\/main_canvas\/[^\/]+(?!_atlas)/g,
                /texture\/play_ui\/[^\/]+(?!_atlas)/g,
                /texture\/pop_\w+\/[^\/]+(?!_atlas)/g,
                /texture\/touxiang\/[^\/]+(?!_atlas)/g
            ];

            singleImagePatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        this.singleImageUsages.push({
                            file: relativePath,
                            type: fileType,
                            usage: match
                        });
                    });
                }
            });

            // 检查图集使用
            const atlasPatterns = [
                /texture\/\w+\/\w+_atlas/g,
                /\.spriteatlas/g
            ];

            atlasPatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        this.atlasUsages.push({
                            file: relativePath,
                            type: fileType,
                            usage: match
                        });
                    });
                }
            });

        } catch (error) {
            console.error(`❌ Failed to check file ${filePath}:`, error.message);
        }
    }

    /**
     * 生成报告
     */
    generateReport() {
        console.log('\n📊 Atlas Usage Report');
        console.log('='.repeat(50));

        console.log(`\n✅ Atlas usages found: ${this.atlasUsages.length}`);
        if (this.atlasUsages.length > 0) {
            console.log('\nAtlas usages:');
            this.atlasUsages.forEach(usage => {
                console.log(`  📁 ${usage.file} (${usage.type}): ${usage.usage}`);
            });
        }

        console.log(`\n⚠️  Single image usages found: ${this.singleImageUsages.length}`);
        if (this.singleImageUsages.length > 0) {
            console.log('\n❗ Files still using single images (need to be updated):');
            this.singleImageUsages.forEach(usage => {
                console.log(`  📄 ${usage.file} (${usage.type}): ${usage.usage}`);
            });
        }

        // 生成详细报告文件
        const report = {
            summary: {
                atlasUsages: this.atlasUsages.length,
                singleImageUsages: this.singleImageUsages.length,
                migrationProgress: this.atlasUsages.length / (this.atlasUsages.length + this.singleImageUsages.length) * 100
            },
            atlasUsages: this.atlasUsages,
            singleImageUsages: this.singleImageUsages,
            recommendations: this.generateRecommendations()
        };

        const reportPath = path.join(__dirname, 'atlas_usage_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📋 Detailed report saved to: ${reportPath}`);
        console.log(`\n🎯 Migration progress: ${report.summary.migrationProgress.toFixed(1)}%`);
    }

    /**
     * 生成建议
     */
    generateRecommendations() {
        const recommendations = [];

        if (this.singleImageUsages.length > 0) {
            recommendations.push({
                type: 'urgent',
                message: `${this.singleImageUsages.length} files still use single images and need to be updated to use atlases.`
            });
        }

        if (this.atlasUsages.length > 0) {
            recommendations.push({
                type: 'success',
                message: `${this.atlasUsages.length} files are already using atlases. Good job!`
            });
        }

        return recommendations;
    }
}

// 使用示例
if (require.main === module) {
    const projectPath = process.argv[2] || path.join(__dirname, '..');
    const verifier = new AtlasUsageVerifier(projectPath);
    
    verifier.verifyAll();
}

module.exports = AtlasUsageVerifier;