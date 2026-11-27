import { sleep } from "../../common/Utils";
import type { Class } from "../Type/PropType";
import { Loader, ResLoadOpt, ResLoadReturnType, ResPreloadOpt, ResPreloadReturnType } from "./Loader";
import type { DirInfo } from "./ResManager";

/** 框架的 Bundle 继承 Loader。缓存中找不到图片时，才通过 this.bundle 调用 Cocos 的加载方法。 */
export class Bundle extends Loader {

    /**
     * init 保存的 Cocos 引擎 bundle 对象。读取单项或目录时，通过它调用引擎的加载方法。
     */
    bundle?: cc.AssetManager.Bundle;

    /**
     * 打开这个 bundle 时传入的版本标识。未指定版本时为 undefined。
     */
    version?: string;


    /**
     * 保存引擎已经打开的 bundle 和版本号，返回当前框架对象供 ResManager 登记。
     */
    init(bundle: cc.AssetManager.Bundle, version?: string) {
        this.bundle = bundle;
        this.version = version;
        return this;
    }


    /**
     * 提前准备目录文件，成功时返回引擎请求项 items。显示图片时再调用 loadDir。
     */
    preloadDir<T extends cc.Asset>(dir_path: DirPath, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(dir_path: DirPath, type: Class<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, type: Class<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    async preloadDir<T extends cc.Asset>(r_dir_or_dir_path: DirPath | DirInfo, type_or_opt?: Class<T> | ResPreloadOpt, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType> {
        let type: Class<T> | undefined;

        // 第二个参数既可以是 cc.SpriteFrame 等资源类型，也可以是加载选项。
        cc.js.isChildClassOf(type_or_opt as Class<T>, cc.Asset) ? (type = type_or_opt as Class<T>) : (opt = type_or_opt as ResPreloadOpt);

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
     * 目录加载成功后，默认给返回的每个资源各加一次业务计数。即使某张图之前已被单独加载，这次目录取用也要计数。
     */
    loadDir<T extends cc.Asset>(dir_path: DirPath, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(dir_path: DirPath, type: Class<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, type: Class<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    async loadDir<T extends cc.Asset>(r_dir_or_dir_path: DirPath | DirInfo, type_or_opt?: Class<T> | ResLoadOpt, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
        let type: Class<T> | undefined;

        // 第二个参数既可以是 cc.SpriteFrame 等资源类型，也可以是加载选项。
        cc.js.isChildClassOf(type_or_opt as Class<T>, cc.Asset) ? (type = type_or_opt as Class<T>) : (opt = type_or_opt as ResLoadOpt);

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
     * 按目录路径和可选的资源类型枚举条目，逐项在当前缓存中查找，命中就交还一次。
     * @param force 为 true 时清零每项资源的全部业务计数，其他使用者也受影响。
     * @param imm 为 true 时立即移除使用次数已归零的缓存项。
     */
    releaseDir(dir_path: DirPath, force?: boolean, imm?: boolean): void;
    releaseDir(r_dir: DirInfo, force?: boolean, imm?: boolean): void;
    releaseDir(dir_path: DirPath, type: Class<cc.Asset>, force?: boolean, imm?: boolean): void;
    releaseDir(r_dir: DirInfo, type: Class<cc.Asset>, force?: boolean, imm?: boolean): void;
    releaseDir(r_dir_or_dir_path: DirPath | DirInfo, type_or_force?: Class<cc.Asset> | boolean, force_or_imm?: boolean, imm?: boolean) {
        let type: Class<cc.Asset> | undefined;
        let force: boolean | undefined;

        // 传了资源类型时只匹配该类型，否则第二个参数就是强制清零开关。
        if (cc.js.isChildClassOf(type_or_force as Class<cc.Asset>, cc.Asset)) {
            type = type_or_force as Class<cc.Asset>;
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
     * 调用引擎的 preloadDir。回调中的 items 是本次预加载的请求项。
     */
    protected _preloadDir<T extends cc.Asset>(path: string, type?: Class<T>): Promise<ResDirPreloadReturnType> {
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
     * 调用引擎的 loadDir，将返回的每项资源分别加入缓存，并将加载进度传给调用方。
     */
    protected _loadDir<T extends cc.Asset>(path: string, type?: Class<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
        return new Promise((resolve) => {
            const bundle = this.bundle;
            if (bundle) {

                let onComplete = (err: Error, assets: T[]) => {
                    if (!err) {
                        for (const asset of assets) {
                            // 目录请求只提供文件夹路径。用 UUID 查出每项在 bundle 中的路径和资源类型，使单项请求也能命中缓存。
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
     * 调用引擎的 preload 准备单个文件。此阶段无需登记图片使用者。
     */
    protected _preload<T extends cc.Asset>(url: string, type: Class<T>): Promise<ResPreloadReturnType> {
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
     * 父类查不到缓存时调用这里。引擎返回图片后，用同一路径和类型保存图片，再把它交给父类登记使用次数。
     */
    protected _load<T extends cc.Asset>(url: string, type: Class<T>): Promise<ResLoadReturnType<T>> {
        return new Promise((resolve) => {
            if (this.bundle) {
                this.bundle.load(url, type as unknown as typeof cc.Asset, (err, asset: T) => {
                    if (!err) {
                        // 两个面板可能同时请求同一张图。先返回的请求负责入缓存，后返回的复用该记录，缓存只持有一份引擎引用。
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
 * 引擎记录的资源信息。path 和 ctor 组成缓存键，uuid 标识引擎中的资源。
 */
export type CocosAssetInfo<T extends cc.Asset> = { path: string, uuid: string, ctor: Class<T> };


/**
 * 记录资源相对路径的对象
 */
export type DirPath = { path: string };
