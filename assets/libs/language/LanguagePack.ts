import {director, error, JsonAsset, TTFFont} from "cc";
import {resLoader} from "../res/ResLoader";
import {logger} from "../log/Logger";
import {JsonUtil} from "../utils/JsonUtil";
import {LanguageData, LanguageDataType, LanguageType} from "./LanguageData";

export class LanguagePack {
    /**
     * 刷新语言文字
     * @param lang
     */
    updateLanguage(lang: string) {
        const rootNodes = director.getScene()!.children;
        for (let i = 0; i < rootNodes.length; ++i) {
            LanguageType.forEach(type => {
                const comps: any[] = rootNodes[i].getComponentsInChildren(type);
                for (let j = 0; j < comps.length; j++) {
                    comps[j].language();
                }
            })
        }
    }

    /**
     * 下载对应语言包资源
     * @param lang 语言标识
     */
    async loadLanguageAssets(bundleName: string, lang: string) {
        await this.loadTexture(bundleName, lang);
        await this.loadSpine(bundleName, lang);
        await this.loadJson(bundleName, lang);
    }

    /** 纹理多语言资源 */
    private loadTexture(bundleName: string, lang: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const path = `${LanguageData.path_texture}/${lang}`;
            resLoader.loadDir(bundleName, path, (err: any, assets: any) => {
                if (err) {
                    reject(err);
                }
                logger.logConfig(path, "下载语言包 textures 资源");
                resolve();
            });
        });
    }

    /** Json格式多语言资源 */
    private loadJson(bundleName: string, lang: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const path = `${LanguageData.path_json}/${lang}`;
            resLoader.load<JsonAsset>(bundleName, path, (err: any, langJson: any) => {
                if (err) {
                    reject(err);
                }
                LanguageData.language.set(LanguageDataType.Json, langJson);
                logger.logConfig(path, "下载语言包 json 资源");

                resLoader.load<TTFFont>(bundleName, path, (err: any, font: any) => {
                    if (err) {
                        reject(err);
                    }
                    LanguageData.font = font;
                    logger.logConfig(path, "下载语言包 ttf 资源");
                    resolve();
                })
            })

        });
    }

    /** SPINE动画多语言资源 */
    private loadSpine(bundleName: string, lang: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const path = `${LanguageData.path_spine}/${lang}`;
            resLoader.loadDir(path, (err: any, assets: any) => {
                if (err) {
                    reject(err);
                }
                logger.logConfig(path, "下载语言包 spine 资源");
                resolve();
            })
        });
    }

    /**
     * 释放某个语言的语言包资源包括json
     * @param lang
     */
    releaseLanguageAssets(bundleName: string, lang: string) {
        const langTexture = `${LanguageData.path_texture}/${lang}`;
        resLoader.releaseDir(langTexture, bundleName);

        const langJson = `${LanguageData.path_json}/${lang}`;
        const json = resLoader.get(bundleName, langJson, JsonAsset);
        if (json) json.decRef();
        const font = resLoader.get(bundleName, langJson, TTFFont);
        if (font) font.decRef();
        const langSpine = `${LanguageData.path_spine}/${lang}`;
        resLoader.release(langSpine, bundleName);
    }
}