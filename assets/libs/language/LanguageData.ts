import { TTFFont } from "cc";
import * as _ from 'lodash-es';

/** 框架支持的语言数据类型 */
export enum LanguageDataType {
    /** Json格式配置 */
    Json = "Json",
}

export class LanguageData {
    /** bundle包名 */
    static bundleName: string = "";
    /** JSON资源目录 */
    static path_json: string = "language/json";
    /** 纹理资源目录 */
    static path_texture: string = "language/texture";
    /** SPINE资源目录 */
    static path_spine: string = "language/spine";

    /** 当前语言 */
    static current: string = "";
    /** 语言数据 */
    static language: Map<string, any> = new Map();
    /** TTF字体 */
    static font: Map<string, TTFFont> = new Map();

    /** 
     * 通过多语言关键字获取语言文本 
     */
    static getLangByID(labId: string): string {
        let content: string = null!;
        for (const [key, value] of this.language) {
            content = value[labId];
            if (content) return content;
        }
        return labId;
    }

    static getFontById(fontId: string): TTFFont {
        return this.font[fontId] || null;
    }
}

export const LanguageType = [
    'LanguageLabel',
    'LanguageSprite',
    'LanguageSpine'
]