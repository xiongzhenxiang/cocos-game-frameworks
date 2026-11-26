import { AssetClass, sleep } from "./ResourceTypes";
import { Loader, ResLoadOpt, ResLoadReturnType, ResPreloadOpt, ResPreloadReturnType } from "./Loader";
import type { DirInfo } from "./ResManager";

/** 将包内路径交给 Cocos Bundle 读取，缓存和使用次数由继承的 Loader 管理。 */
export class Bundle extends Loader {

    /**
     * 对应 Cocos Asset Bundle 实例
     */
    bundle?: cc.AssetManager.Bundle;

    /**
     * Bundle Hash 值，为传入的值，若没传入该值则无效
     */
    version?: string;


    /**
     * 初始化
     */
    init(bundle: cc.AssetManager.Bundle, version?: string) {
        this.bundle = bundle;
        this.version = version;
        return this;
    }


    /**
     * 预加载目录下所有指定类型资源
     */
    preloadDir<T extends cc.Asset>(dir_path: DirPath, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(dir_path: DirPath, type: AssetClass<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, type: AssetClass<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    async preloadDir<T extends cc.Asset>(r_dir_or_dir_path: DirPath | DirInfo, type_or_opt?: AssetClass<T> | ResPreloadOpt, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType> {
        let type: AssetClass<T> | undefined;

        // 矫正参数
        cc.js.isChildClassOf(type_or_opt as AssetClass<T>, cc.Asset) ? (type = type_or_opt as AssetClass<T>) : (opt = type_or_opt as ResPreloadOpt);

        let dir_path: DirPath = (<DirInfo>r_dir_or_dir_path).DIR ?? r_dir_or_dir_path as DirPath;
        let retry = opt?.retry !== false;
        let retry_time = opt?.retry_time || 500;

        let result: ResDirPreloadReturnType;

        do {
            result = await this._preloadDir(dir_path.path, type);
        } while (result.error && this.printLog(result.error) && retry && (!await sleep(retry_time)));

        return result;
    }


    /**
     * 默认给目录加载成功后返回的每个资源各记一次引用，之后可以按实例逐项交还。
     */
    loadDir<T extends cc.Asset>(dir_path: DirPath, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(dir_path: DirPath, type: AssetClass<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, type: AssetClass<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    async loadDir<T extends cc.Asset>(r_dir_or_dir_path: DirPath | DirInfo, type_or_opt?: AssetClass<T> | ResLoadOpt, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
        let type: AssetClass<T> | undefined;

        // 矫正参数
        cc.js.isChildClassOf(type_or_opt as AssetClass<T>, cc.Asset) ? (type = type_or_opt as AssetClass<T>) : (opt = type_or_opt as ResLoadOpt);

        let dir_path: DirPath = (<DirInfo>r_dir_or_dir_path).DIR ?? r_dir_or_dir_path as DirPath;
        let retry = opt?.retry !== false;
        let retry_time = opt?.retry_time || 500;
        let ref = opt?.ref !== false;

        let result: ResDirLoadReturnType<T>;

        do {
            result = await this._loadDir(dir_path.path, type, opt);
        } while (result.error && this.printLog(result.error) && retry && (!await sleep(retry_time)));

        if (!result.error) {
            if (ref) {
                result.resources.forEach(asset => this.addRef(asset));
            }
        }

        return result;
    }


    /**
     * 对目录下所有指定类型资源引用计数减 1，仅持续引用才需调用此接口
     * @param force 直接把计数清零，默认 false
     * @param imm 是否立即触发释放流程，默认为 false
     */
    releaseDir(dir_path: DirPath, force?: boolean, imm?: boolean): void;
    releaseDir(r_dir: DirInfo, force?: boolean, imm?: boolean): void;
    releaseDir(dir_path: DirPath, type: AssetClass<cc.Asset>, force?: boolean, imm?: boolean): void;
    releaseDir(r_dir: DirInfo, type: AssetClass<cc.Asset>, force?: boolean, imm?: boolean): void;
    releaseDir(r_dir_or_dir_path: DirPath | DirInfo, type_or_force?: AssetClass<cc.Asset> | boolean, force_or_imm?: boolean, imm?: boolean) {
        let type: AssetClass<cc.Asset> | undefined;
        let force: boolean | undefined;

        // 矫正参数
        if (cc.js.isChildClassOf(type_or_force as AssetClass<cc.Asset>, cc.Asset)) {
            type = type_or_force as AssetClass<cc.Asset>;
            force = force_or_imm;
        } else {
            force = type_or_force as boolean;
            imm = force_or_imm;
        }

        let dir_path: DirPath = (<DirInfo>r_dir_or_dir_path).DIR ?? r_dir_or_dir_path as DirPath;

        if (!this.bundle) return;
        let assets: CocosAssetInfo<cc.Asset>[];
        if (type) {
            assets = this.bundle.getDirWithPath(dir_path.path, type as unknown as typeof cc.Asset) as CocosAssetInfo<cc.Asset>[];
        } else {
            assets = this.bundle.getDirWithPath(dir_path.path) as CocosAssetInfo<cc.Asset>[];
        }

        for (const asset of assets) {
            this.release({ url: asset.path, type: asset.ctor }, force, imm);
        }
    }


    /**
     * Cocos Bundle 目录资源预获取函数封装
     */
    protected _preloadDir<T extends cc.Asset>(path: string, type?: AssetClass<T>): Promise<ResDirPreloadReturnType> {
        return new Promise((resolve) => {
            if (this.bundle) {

                let onComplete = (err: Error, items: cc.AssetManager.RequestItem[]) => {
                    resolve({ error: err, items: items });
                }

                if (type) {
                    this.bundle.preloadDir(path, type as unknown as typeof cc.Asset, onComplete);
                } else {
                    this.bundle.preloadDir(path, onComplete);
                }
            } else {
                console.error("[RES] 加载错误", "Bundle 未加载或不存在", path);
                resolve({ error: new Error("[RES] 加载错误"), items: null });
            }
        });
    }


    /**
     * Cocos Bundle 目录资源获取函数封装
     */
    protected _loadDir<T extends cc.Asset>(path: string, type?: AssetClass<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
        return new Promise((resolve) => {
            const bundle = this.bundle;
            if (bundle) {

                let onComplete = (err: Error, assets: T[]) => {
                    if (!err) {
                        for (const asset of assets) {
                            // 目录请求只提供文件夹路径。用 UUID 查出每项的包内路径和类型，使单项请求也能命中缓存。
                            let info = bundle.getAssetInfo((asset as T & { _uuid: string })._uuid) as CocosAssetInfo<T>;
                            let url = info.path;
                            this.isCached(url, info.ctor) || this.setCached(url, info.ctor, asset);
                        }
                    }
                    resolve({ error: err, resources: assets });
                }

                if (type) {
                    bundle.loadDir(path, type as unknown as typeof cc.Asset, (finish, total) => {
                        opt?.onProgress && opt?.onProgress(finish, total);
                    }, onComplete);
                } else {
                    bundle.loadDir(path, (finish, total) => {
                        opt?.onProgress && opt?.onProgress(finish, total);
                    }, onComplete);
                }
            } else {
                console.error("[RES] 加载错误", "Bundle 未加载或不存在", path);
                resolve({ error: new Error("[RES] 加载错误"), resources: null });
            }
        });
    }


    /**
     * Cocos Bundle 资源预获取函数封装
     */
    protected _preload<T extends cc.Asset>(url: string, type: AssetClass<T>): Promise<ResPreloadReturnType> {
        return new Promise((resolve) => {
            if (this.bundle) {
                this.bundle.preload(url, type as unknown as typeof cc.Asset, (err, items) => {
                    resolve({ error: err, items: items });
                });
            } else {
                console.error("[RES] 加载错误", "Bundle 未加载或不存在", url);
                resolve({ error: new Error("[RES] 加载错误"), items: null });
            }
        });
    }


    /**
     * Cocos Bundle 资源获取函数封装
     */
    protected _load<T extends cc.Asset>(url: string, type: AssetClass<T>): Promise<ResLoadReturnType<T>> {
        return new Promise((resolve) => {
            if (this.bundle) {
                this.bundle.load(url, type as unknown as typeof cc.Asset, (err, asset: T) => {
                    if (!err) {
                        // 等待引擎回调期间，另一请求可能已缓存同一资源。再次检查可避免重复增加引擎引用。
                        this.isCached(url, type) || this.setCached(url, type, asset);
                    }
                    resolve({ error: err, resource: asset });
                });
            } else {
                console.error("[RES] 加载错误", "Bundle 未加载或不存在", url);
                resolve({ error: new Error("[RES] 加载错误"), resource: null });
            }
        });
    }

}


/**
 * 获取目录资源函数的通用返回类型
 */
export type ResDirLoadReturnType<T extends cc.Asset> =
    | { error: null; resources: T[] }
    | { error: Error; resources: T[] | null };


/**
 * 预获取目录资源函数的通用返回类型
 */
export type ResDirPreloadReturnType = ResPreloadReturnType;


/**
 * Cocos AssetInfo Type
 */
export type CocosAssetInfo<T extends cc.Asset> = { path: string, uuid: string, ctor: AssetClass<T> };


/**
 * 记录资源相对路径的对象
 */
export type DirPath = { path: string };
