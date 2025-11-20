import {Asset, js, Scene, Constructor, resources, __private, assetManager, AssetManager} from "cc";

export type ProgressCallback = __private._cocos_asset_asset_manager_deprecated__LoadProgressCallback;
export type CompleteCallback<T = any> = any;       // (error: Error | null, asset: T) => void;  (error: Error | null, asset: T[], urls: string[]) => void;
type IRemoteOptions = { [k: string]: any; ext?: string; } | null;

export type AssetType<T = Asset> = Constructor<T>;

interface ILoadResArgs<T extends Asset> {
    bundle?: string;
    dir?: string;
    paths: string | string[];
    type: AssetType<T> | null;
    onProgress: ProgressCallback | null;
    onComplete: CompleteCallback<T> | null;
}

export default class ResLoader {

    public parseLoadResArgs<T extends Asset>(
        paths: string | string[],
        type?: AssetType<T> | ProgressCallback | CompleteCallback | null,
        onProgress?: AssetType<T> | ProgressCallback | CompleteCallback | null,
        onComplete?: ProgressCallback | CompleteCallback | null
    ) {
        let pathsOut: any = paths;
        let typeOut: any = type;
        let onProgressOut: any = onProgress;
        let onCompleteOut: any = onComplete;
        if (onComplete === undefined) {
            const isValidType = js.isChildClassOf(type as AssetType, Asset);
            if (onProgress) {
                onCompleteOut = onProgress as CompleteCallback;
                if (isValidType) {
                    onProgressOut = null;
                }
            } else if (onProgress === undefined && !isValidType) {
                onCompleteOut = type as CompleteCallback;
                onProgressOut = null;
                typeOut = null;
            }
            if (onProgress !== undefined && !isValidType) {
                onProgressOut = type as ProgressCallback;
                typeOut = null;
            }
        }
        return {paths: pathsOut, type: typeOut, onProgress: onProgressOut, onComplete: onCompleteOut};
    }

    private loadByBundleAndArgs<T extends Asset>(bundle: AssetManager.Bundle, args: ILoadResArgs<T>): void {
        if (args.dir) {
            bundle.loadDir(args.paths as string, args.type, args.onProgress, args.onComplete);
        } else {
            if (typeof args.paths == 'string') {
                bundle.load(args.paths, args.type, args.onProgress, args.onComplete);
            } else {
                bundle.load(args.paths, args.type, args.onProgress, args.onComplete);
            }
        }
    }

    private loadByArgs<T extends Asset>(args: ILoadResArgs<T>) {
        if (args.bundle) {
            if (assetManager.bundles.has(args.bundle)) {
                let bundle = assetManager.bundles.get(args.bundle);
                this.loadByBundleAndArgs(bundle!, args);
            } else {
                // 自动加载bundle
                assetManager.loadBundle(args.bundle, (err, bundle) => {
                    if (!err) {
                        this.loadByBundleAndArgs(bundle, args);
                    }
                })
            }
        } else {
            this.loadByBundleAndArgs(resources, args);
        }
    }

    public load<T extends Asset>(bundleName: string, paths: string | string[], type: AssetType<T> | null, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(bundleName: string, paths: string | string[], onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(bundleName: string, paths: string | string[], onComplete?: CompleteCallback<T> | null): void;
    public load<T extends Asset>(bundleName: string, paths: string | string[], type: AssetType<T> | null, onComplete?: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], type: AssetType<T> | null, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], onProgress: ProgressCallback | null, onComplete: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], onComplete?: CompleteCallback<T> | null): void;
    public load<T extends Asset>(paths: string | string[], type: AssetType<T> | null, onComplete?: CompleteCallback<T> | null): void;
    public load<T extends Asset>(
        bundleName: string,
        paths?: string | string[] | AssetType<T> | ProgressCallback | CompleteCallback | null,
        type?: AssetType<T> | ProgressCallback | CompleteCallback | null,
        onProgress?: ProgressCallback | CompleteCallback | null,
        onComplete?: CompleteCallback | null,
    ) {
        let args: ILoadResArgs<T> | null = null;
        if (typeof paths === "string" || paths instanceof Array) {
            args = this.parseLoadResArgs(paths, type, onProgress, onComplete);
            args.bundle = bundleName;
        } else {
            args = this.parseLoadResArgs(bundleName, paths, type, onProgress);
        }
        this.loadByArgs(args);
    }

    public loadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T> | null, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(bundleName: string, dir: string, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(bundleName: string, dir: string, onComplete?: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T> | null, onComplete?: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(dir: string, type: AssetType<T> | null, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(dir: string, onProgress: ProgressCallback | null, onComplete: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(dir: string, onComplete?: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(dir: string, type: AssetType<T> | null, onComplete?: CompleteCallback<T[]> | null): void;
    public loadDir<T extends Asset>(
        bundleName: string,
        dir?: string | AssetType<T> | ProgressCallback | CompleteCallback | null,
        type?: AssetType<T> | ProgressCallback | CompleteCallback | null,
        onProgress?: ProgressCallback | CompleteCallback | null,
        onComplete?: CompleteCallback | null,
    ) {
        let args: ILoadResArgs<T> | null = null;
        if (typeof dir === "string") {
            args = this.parseLoadResArgs(dir, type, onProgress, onComplete);
            args.bundle = bundleName;
        } else {
            args = this.parseLoadResArgs(bundleName, dir, type, onProgress);
        }
        args.dir = args.paths as string;
        this.loadByArgs(args);
    }

    /**
     * 加载scene
     * @param bundleName
     * @param scenePath
     * @param onComplete
     */
    public loadScene(bundleName: string, scenePath: string, onComplete: (err: Error | null, scene?: Scene) => void) {
        const bundle = assetManager.getBundle(bundleName);
        if (!bundle) {
            // bundle 没有加载，先加载 bundle
            assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err || !bundle) return onComplete(err || new Error('Failed to load bundle'));
                bundle.loadScene(scenePath, onComplete);
            });
        } else {
            bundle.loadScene(scenePath, onComplete);
        }
    }

    /**
     * 异步加载当个文件资源（支持 onProgress）
     */
    public loadAsync<T extends Asset>(bundleName: string, paths: string | string[], type?: AssetType<T> | null, onProgress?: ProgressCallback | null): Promise<T>;
    public loadAsync<T extends Asset>(paths: string | string[], type?: AssetType<T> | null, onProgress?: ProgressCallback | null): Promise<T>;
    public loadAsync<T extends Asset>(...args: any[]): Promise<T> {
        return new Promise<T>((resolve, reject) => {

            // 解析参数
            let bundleName: string | null = null;
            let paths: string | string[];
            let type: AssetType<T> | null = null;
            let onProgress: ProgressCallback | null = null;

            if (typeof args[0] === "string" && !(args[1] instanceof Array) && typeof args[1] === "string") {
                // loadAsync(bundleName, paths, type)
                bundleName = args[0];
                paths = args[1];
                type = args[2] ?? null;
                onProgress = args[3] ?? null;
            } else {
                // loadAsync(paths, type)
                paths = args[0];
                type = args[1] ?? null;
                onProgress = args[2] ?? null;
            }

            const onComplete = (err: Error | null, asset: any) => {
                if (err) reject(err);
                else resolve(asset);
            };

            // 调用原有 load
            if (bundleName) {
                this.load(bundleName, paths, type, onProgress, onComplete);
            } else {
                this.load(paths, type, onProgress, onComplete);
            }
        });
    }

    /**
     * 异步加载整个文件夹资源（支持 onProgress）
     */
    public loadDirAsync<T extends Asset>(bundleName: string, dir: string, type?: AssetType<T> | null, onProgress?: ProgressCallback | null): Promise<T[]>;
    public loadDirAsync<T extends Asset>(dir: string, type?: AssetType<T> | null, onProgress?: ProgressCallback | null): Promise<T[]>;
    public loadDirAsync<T extends Asset>(...args: any[]): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {

            let bundleName: string | null = null;
            let dir: string;
            let type: AssetType<T> | null = null;
            let onProgress: ProgressCallback | null = null;

            // 参数解析
            if (typeof args[0] === "string" && typeof args[1] === "string") {
                // loadDirAsync(bundleName, dir, type?, onProgress?)
                bundleName = args[0];
                dir = args[1];
                type = args[2] ?? null;
                onProgress = args[3] ?? null;
            } else {
                // loadDirAsync(dir, type?, onProgress?)
                dir = args[0];
                type = args[1] ?? null;
                onProgress = args[2] ?? null;
            }

            const onComplete = (err: Error | null, assets: T[]) => {
                if (err) reject(err);
                else resolve(assets);
            };

            // 调用原本的 loadDir
            if (bundleName) {
                this.loadDir(bundleName, dir, type, onProgress, onComplete);
            } else {
                this.loadDir(dir, type, onProgress, onComplete);
            }
        });
    }

    /**
     * 加载远程资源
     * @param url
     * @param options
     * @param onComplete
     */
    public loadRemote<T extends Asset>(url: string, options: IRemoteOptions | null, onComplete?: CompleteCallback<T> | null): void;
    public loadRemote<T extends Asset>(url: string, onComplete?: CompleteCallback<T> | null): void;
    public loadRemote(url: string, ...args: any): void {
        assetManager.loadRemote(url, args);
    }

    /**
     * 获取资源
     * @param path          资源路径
     * @param type          资源类型
     * @param bundleName    远程资源包名
     */
    get<T extends Asset>(bundleName: string, path: string, type?: __private.__types_globals__Constructor<T> | null): T | null {
        let bundle: AssetManager.Bundle = assetManager.getBundle(bundleName)!;
        if (!bundle) bundle = resources;
        return bundle.get(path, type!);
    }

    /**
     * 通过相对文件夹路径删除所有文件夹中资源
     * @param path          资源文件夹路径
     * @param bundleName    远程资源包名
     */
    releaseDir(path: string, bundleName?: string) {
        const bundle: AssetManager.Bundle | null = assetManager.getBundle(bundleName);
        if (bundle) {
            const infos = bundle.getDirWithPath(path);
            if (infos) {
                infos.map((info) => {
                    this.releasePrefabtDepsRecursively(info.uuid);
                });
            }

            if (path == "" && bundleName != "resources") {
                assetManager.removeBundle(bundle);
            }
        }
    }

    /**
     * 通过资源相对路径释放资源
     * @param path          资源路径
     * @param bundleName    远程资源包名
     */
    release(path: string, bundleName?: string) {
        const bundle = assetManager.getBundle(bundleName);
        if (bundle) {
            const asset = bundle.get(path);
            if (asset) {
                this.releasePrefabtDepsRecursively(asset);
            }
        }
    }

    private releasePrefabtDepsRecursively(uuid: string | Asset) {
        let asset: Asset | null | undefined;
        if (uuid instanceof Asset) {
            uuid.decRef();
        } else {
            asset = assetManager.assets.get(uuid);
            if (asset) asset.decRef();
        }
    }
}

export let resLoader = new ResLoader();