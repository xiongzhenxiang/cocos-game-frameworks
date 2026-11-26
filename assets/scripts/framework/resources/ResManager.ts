import { AssetClass, sleep } from "./ResourceTypes";
import { Bundle, ResDirLoadReturnType, ResDirPreloadReturnType } from "./Bundle";
import type { Loader, ResLoadOpt, ResLoadReturnType, ResPath, ResPreloadOpt, ResPreloadReturnType } from "./Loader";
import { Remote } from "./Remote";


/**
 * 资源管理模块
 */
export class ResManager {

    /**
     * 远程资源加载器
     */
    remote: Remote = new Remote();

    /**
     * Resources Bundle
     */
    resources?: Bundle;

    /**
     * Main Bundle
     */
    main?: Bundle;

    /**
     * Internal Bundle
     */
    internal?: Bundle;

    /**
     * Bundle 集合
     */
    bundles: Map<string, Bundle> = new Map();


    constructor() {
        // built-in Bundles
        if (cc.assetManager.resources) {
            this.resources = new Bundle().init(cc.assetManager.resources);
            this.bundles.set("resources", this.resources);
        }

        if (cc.assetManager.main) {
            this.main = new Bundle().init(cc.assetManager.main);
            this.bundles.set("main", this.main);
        }

        if (cc.assetManager.internal) {
            this.internal = new Bundle().init(cc.assetManager.internal);
            this.bundles.set("internal", this.internal);
        }
    }


    /**
     * 通用资源加载函数，支持直接指定加载 Bundle 中的资源，若 Bundle 未加载则会先加载 Bundle，Bundle 加载采用默认选项
     */
    async load<T extends cc.Asset>(r_res: ResRoute<T>, opt?: ResLoadOpt): Promise<ResLoadReturnType<T>> {
        if (!r_res) return { error: new Error("缺少资源路由"), resource: null };

        let bundle_name = r_res.bundle;

        const bundle = bundle_name == "remote" ? this.remote : (await this.loadBundle(bundle_name, opt))?.bundle;

        if (bundle) {
            return await bundle.load(r_res, opt);
        } else {
            console.error("[RES] 加载错误", "无此 Bundle", bundle_name);
            return { error: new Error("[RES] 加载错误"), resource: null };
        }

    }


    /**
     * 通用资源预加载函数，支持直接指定加载 Bundle 中的资源，若 Bundle 未加载则会先加载 Bundle，Bundle 加载采用默认选项
     */
    async preload<T extends cc.Asset>(r_res: ResRoute<T>, opt?: ResLoadOpt): Promise<ResPreloadReturnType> {
        if (!r_res) return { error: new Error("缺少资源路由"), items: null };

        let bundle_name = r_res.bundle;

        const bundle = bundle_name == "remote" ? this.remote : (await this.loadBundle(bundle_name, opt)).bundle;

        if (bundle) {
            return await bundle.preload(r_res, opt);
        } else {
            console.error("[RES] 加载错误", "无此 Bundle", bundle_name);
            return { error: new Error("[RES] 加载错误"), items: null };
        }
    }


    /**
     * 加载目录下所有指定类型资源，若 Bundle 未加载则会先加载 Bundle，Bundle 加载采用默认选项
     */
    loadDir<T extends cc.Asset>(dir_info: DirRoute, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(dir_info: DirRoute, type: AssetClass<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, type: AssetClass<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    async loadDir<T extends cc.Asset>(dir_info_or_r_dir: DirRoute | DirInfo, type_or_opt?: AssetClass<T> | ResLoadOpt, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
        if (!dir_info_or_r_dir) return { error: new Error("缺少目录路由"), resources: null };

        let dir_info: DirRoute = (<DirInfo>dir_info_or_r_dir).DIR ?? dir_info_or_r_dir as DirRoute;
        let bundle_name = dir_info.bundle;

        if (bundle_name == "remote") {
            console.error("[RES] 加载错误", "不支持对 remote loader 进行目录相关操作");
            return { error: new Error("[RES] 加载错误"), resources: null };
        }

        const options = typeof type_or_opt === "function" ? opt : type_or_opt ?? opt;
        let bundle = (await this.loadBundle(bundle_name, options)).bundle;

        if (bundle) {
            return await bundle.loadDir(dir_info, type_or_opt as AssetClass<T>, opt);
        } else {
            console.error("[RES] 加载错误", "无此 Bundle", bundle_name);
            return { error: new Error("[RES] 加载错误"), resources: null };
        }

    }


    /**
     * 预加载目录下所有指定类型资源，若 Bundle 未加载则会先加载 Bundle，Bundle 加载采用默认选项
     */
    preloadDir<T extends cc.Asset>(dir_info: DirRoute, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(dir_info: DirRoute, type: AssetClass<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, type: AssetClass<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    async preloadDir<T extends cc.Asset>(dir_info_or_r_dir: DirRoute | DirInfo, type_or_opt?: AssetClass<T> | ResPreloadOpt, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType> {
        if (!dir_info_or_r_dir) return { error: new Error("缺少目录路由"), items: null };

        let dir_info: DirRoute = (<DirInfo>dir_info_or_r_dir).DIR ?? dir_info_or_r_dir as DirRoute;
        let bundle_name = dir_info.bundle;

        if (bundle_name == "remote") {
            console.error("[RES] 加载错误", "不支持对 remote loader 进行目录相关操作");
            return { error: new Error("[RES] 加载错误"), items: null };
        }

        const options = typeof type_or_opt === "function" ? opt : type_or_opt ?? opt;
        let bundle = (await this.loadBundle(bundle_name, options)).bundle;

        if (bundle) {
            return await bundle.preloadDir(dir_info, type_or_opt as AssetClass<T>, opt);
        } else {
            console.error("[RES] 加载错误", "无此 Bundle", bundle_name);
            return { error: new Error("[RES] 加载错误"), items: null };
        }
    }


    /**
     * 对目录下所有指定类型资源引用计数减 1，仅持续引用才需调用此接口
     * @param force 直接把计数清零，默认 false
     * @param imm 是否立即触发释放流程，默认为 false
     */
    releaseDir<T extends cc.Asset>(dir_info: DirRoute, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(r_dir: DirInfo, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(dir_info: DirRoute, type: AssetClass<T>, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(r_dir: DirInfo, type: AssetClass<T>, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(dir_info_or_r_dir: DirRoute | DirInfo, type_or_force?: AssetClass<T> | boolean, force_or_imm?: boolean, imm?: boolean) {
        if (!dir_info_or_r_dir) return;

        let dir_info: DirRoute = (<DirInfo>dir_info_or_r_dir).DIR ?? dir_info_or_r_dir as DirRoute;
        let bundle_name = dir_info.bundle;

        if (bundle_name == "remote") {
            console.error("[RES] 加载错误", "不支持对 remote loader 进行目录相关操作");
            return { error: new Error("[RES] 加载错误"), items: null };
        }

        let bundle = this.bundles.get(bundle_name);

        if (bundle) {
            bundle.releaseDir(dir_info, type_or_force as AssetClass<T>, force_or_imm, imm);
        }
    }


    /**
     * 通用资源释放函数，对资源引用计数减 1，仅持续引用时才需调用此接口
     * @param imm 是否立即触发释放流程，默认为 false，只会减少计数
     */
    release(r_res: ResRoute<cc.Asset>, force?: boolean, imm?: boolean): void;
    release(r_bundle: BundleRoute, res: cc.Asset, force?: boolean, imm?: boolean): void;
    release(r_res_or_r_bundle: ResRoute<cc.Asset> | BundleRoute, force_or_res?: cc.Asset | boolean, force_or_imm?: boolean, imm?: boolean) {
        if (!r_res_or_r_bundle) return;

        let bundle_name: string;
        let force: boolean | undefined;
        let res_or_res_path: cc.Asset | ResPath<cc.Asset>;

        if (force_or_res instanceof cc.Asset) {
            bundle_name = (<BundleRoute>r_res_or_r_bundle).NAME;
            force = force_or_imm;
            res_or_res_path = force_or_res as cc.Asset;
        } else {
            bundle_name = (<ResRoute<cc.Asset>>r_res_or_r_bundle).bundle;
            force = force_or_res;
            imm = force_or_imm;
            res_or_res_path = r_res_or_r_bundle as ResPath<cc.Asset>;
        }

        const bundle = bundle_name == "remote" ? this.remote : this.bundles.get(bundle_name);

        if (bundle) {
            bundle.release(res_or_res_path as ResRoute<cc.Asset>, force, imm);
        }
    }


    /**
     * 加载某个 Bundle
     */
    loadBundle(name_or_url: string, opt?: BundleLoadOpt): Promise<BundleLoadReturnType>;
    loadBundle(r_bundle: BundleRoute, opt?: BundleLoadOpt): Promise<BundleLoadReturnType>;
    async loadBundle(name_or_url_or_r_bundle: string | BundleRoute, opt?: BundleLoadOpt): Promise<BundleLoadReturnType> {
        let retry = opt?.retry !== false;
        let retry_time = opt?.retry_time || 5000;

        // check param
        if (!name_or_url_or_r_bundle) {
            console.error("[RES] 加载错误", "Bundle NameOrUrl 无效");
            return { error: new Error("[RES] 加载错误"), bundle: null };
        }

        let bundle_name = typeof name_or_url_or_r_bundle == "string" ? name_or_url_or_r_bundle : name_or_url_or_r_bundle.NAME;

        let result: BundleLoadReturnType;

        do {
            // is cached
            let bundle = this.isCached(bundle_name);
            if (bundle) {
                return { error: null, bundle: bundle };
            }

            // load
            result = await this._loadBundle(bundle_name, opt);

        } while (!result.bundle && this.printLog(result.error) && retry && (!await sleep(retry_time)));

        return result;
    }


    /**
     * 打印日志信息，并返回 true
     */
    protected printLog(err: Error) {
        console.log("[RES] 加载错误", err);
        return true;
    }


    /**
     * 加载 Bundle 核心函数
     */
    protected _loadBundle(name_or_url: string, opt?: BundleLoadOpt): Promise<BundleLoadReturnType> {
        let version = opt?.version;

        let promise = new Promise<BundleLoadReturnType>((resolve) => {
            cc.assetManager.loadBundle(name_or_url, {
                version: version,
            }, (err, assetbundle) => {
                if (!err) {
                    // 加载依赖 Bundle
                    if (assetbundle.deps.length !== 0) {
                        const promises = assetbundle.deps.map(v => this.loadBundle(v, opt ? { retry: opt.retry, retry_time: opt.retry_time } : undefined));
                        const results = Promise.all(promises);
                        results.then(arr => {
                            for (let i = 0; i < arr.length; i++) {
                                const result = arr[i];
                                if (result.error) {
                                    resolve({ error: new Error(`Bundle ${name_or_url} 加载失败：因为依赖 Bundle ${assetbundle.deps[i]} 加载失败`), bundle: null });
                                    return;
                                }
                            }

                            let bundle = this.isCached(assetbundle.name) || this.setCached(assetbundle.name, new Bundle().init(assetbundle, version));
                            resolve({ bundle: bundle, error: null });
                        });
                    } else {
                        let bundle = this.isCached(assetbundle.name) || this.setCached(assetbundle.name, new Bundle().init(assetbundle, version));
                        resolve({ bundle: bundle, error: null });
                    }
                } else {
                    resolve({ error: err, bundle: null });
                }
            });
        });

        return promise;
    }


    /**
     * 检查 Bundle 是否已经缓存
     */
    protected isCached(name: string) {
        return this.bundles.get(name);
    }


    /**
     * 设置 Bundle 已经缓存
     */
    protected setCached(name: string, instane: Bundle) {
        this.bundles.set(name, instane);
        return instane;
    }


    /**
     * 移除缓存 Bundle，并释放
     */
    protected removeCache(name: string) {
        let bundle = this.isCached(name);
        if (bundle?.bundle) {
            this.bundles.delete(name);
            cc.assetManager.removeBundle(bundle.bundle);
        }
    }


    /**
     * 释放某个 Bundle，会忽略计数直接释放所有包内资源并立即调用 GC，然后删除该 Bundle 实例，一般情况下请调用 releaseDir
     */
    releaseBundle(r_bundle: BundleRoute): void;
    releaseBundle(bundle: Bundle): void;
    releaseBundle(r_bundle_or_bundle: BundleRoute | Bundle) {
        const name = r_bundle_or_bundle instanceof Bundle ? r_bundle_or_bundle.bundle?.name : r_bundle_or_bundle.NAME;
        if (!name) return;
        const bundle = this.bundles.get(name);
        if (bundle && (!(r_bundle_or_bundle instanceof Bundle) || r_bundle_or_bundle === bundle)) {
            bundle.releaseAll(true, true);
            this.removeCache(name);
        }
    }


    /**
     * 触发资源释放，若不提供 Bundle 名称，则会触发所有 Bundle 的资源释放
     */
    gc(r_bundle?: BundleRoute) {
        if (r_bundle) {
            let bundle_name = r_bundle.NAME;
            if (bundle_name == "remote") {
                this.remote.gc();
            } else {
                let bundle = this.bundles.get(bundle_name);
                bundle && bundle.gc();
            }
        } else {
            this.bundles.forEach(v => v.gc());
            this.remote.gc();
        }
    }

}


/**
 * 加载 Bundle 时的可选参数
 */
export class BundleLoadOpt {
    /**
     * 是否无限重试直到加载成功，默认为 true
     */
    retry?: boolean;

    /**
     * 重试间隔时间，默认为 500 毫秒
     */
    retry_time?: number;

    /**
     * 加载指定 Version 的 Bundle
     */
    version?: string;
}


/**
 * Bundle 加载返回类型
 */
export type BundleLoadReturnType =
    | { error: null; bundle: Bundle }
    | { error: Error; bundle: null };


/**
 * 记录资源或资源目录所在 bundle 与相对路径的对象
 */
export type ResRoute<T extends cc.Asset> = { bundle: string, url: string, type: AssetClass<T> };


/**
 * 记录 Bundle 名称的对象
 */
export type BundleRoute = { NAME: string };


/**
 * 记录目录所在 Bundle 与相对路径的对象
 */
export type DirInfo = { DIR: DirRoute };


/**
 * 记录目录所在 Bundle 与相对路径的对象
 */
export type DirRoute = { bundle: string, path: string };


/**
 * 游戏资源管理
 */
export const res = new ResManager();
