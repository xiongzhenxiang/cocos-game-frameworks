import { sleep } from "../../common/Utils";
import type { Class } from "../Type/PropType";
import { Bundle, ResDirLoadReturnType, ResDirPreloadReturnType } from "./Bundle";
import type { ResLoadOpt, ResLoadReturnType, ResPath, ResPreloadOpt, ResPreloadReturnType } from "./Loader";
import { Remote } from "./Remote";


/**
 * 根据请求中的 bundle 名称选择加载器。每个 bundle 有独立缓存，远程 URL 由 remote 加载器处理。
 */
export class ResManager {

    /**
     * 远程加载器。请求中的 bundle 名称为 "remote" 时，由它按 URL 获取资源。
     */
    remote: Remote = new Remote();

    /**
     * 内置 resources 的框架 Bundle 实例。创建管理器时，如果引擎已打开它，就复用并登记。
     */
    resources?: Bundle;

    /**
     * 内置 main 的框架 Bundle 实例，从引擎已打开的 main 初始化。
     */
    main?: Bundle;

    /**
     * 内置 internal 的框架 Bundle 实例，从引擎已打开的 internal 初始化。
     */
    internal?: Bundle;

    /**
     * 已打开的 bundle。键是引擎返回的名称，值是框架的 Bundle 对象，后续同名请求复用它。
     */
    bundles: Map<string, Bundle> = new Map();


    constructor() {
        // 引擎可能已经打开内置 bundle。为现有对象创建框架 Bundle，后续与自定义 bundle 共用同一套查找流程。
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
     * 先按名称找到加载器，再调用它继承的 Loader.load。普通图片用 bundle 内路径，选择 "remote" 时用完整 URL。
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
     * 提前准备文件，把重试选项传给 loadBundle 和加载器。成功时 items 包含引擎请求项。
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
     * 先取得 bundle，再按相对路径加载目录。传入 cc.SpriteFrame 时只取图片帧，省略类型时由引擎返回目录中的各类资源。
     */
    loadDir<T extends cc.Asset>(dir_info: DirRoute, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(dir_info: DirRoute, type: Class<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    loadDir<T extends cc.Asset>(r_dir: DirInfo, type: Class<T>, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>>;
    async loadDir<T extends cc.Asset>(dir_info_or_r_dir: DirRoute | DirInfo, type_or_opt?: Class<T> | ResLoadOpt, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
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
            return await bundle.loadDir(dir_info, type_or_opt as Class<T>, opt);
        } else {
            console.error("[RES] 加载错误", "无此 Bundle", bundle_name);
            return { error: new Error("[RES] 加载错误"), resources: null };
        }

    }


    /**
     * 取得 bundle 后，按 bundle 内的相对路径预加载目录。成功时返回请求项，正式加载时才登记取用。
     */
    preloadDir<T extends cc.Asset>(dir_info: DirRoute, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(dir_info: DirRoute, type: Class<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    preloadDir<T extends cc.Asset>(r_dir: DirInfo, type: Class<T>, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType>;
    async preloadDir<T extends cc.Asset>(dir_info_or_r_dir: DirRoute | DirInfo, type_or_opt?: Class<T> | ResPreloadOpt, opt?: ResPreloadOpt): Promise<ResDirPreloadReturnType> {
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
            return await bundle.preloadDir(dir_info, type_or_opt as Class<T>, opt);
        } else {
            console.error("[RES] 加载错误", "无此 Bundle", bundle_name);
            return { error: new Error("[RES] 加载错误"), items: null };
        }
    }


    /**
     * 按目录路径找到已打开的 bundle，由它逐项交还匹配资源的业务引用。
     * @param force 直接把计数清零，默认 false
     * @param imm 是否立即触发释放流程，默认为 false
     */
    releaseDir<T extends cc.Asset>(dir_info: DirRoute, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(r_dir: DirInfo, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(dir_info: DirRoute, type: Class<T>, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(r_dir: DirInfo, type: Class<T>, force?: boolean, imm?: boolean): void;
    releaseDir<T extends cc.Asset>(dir_info_or_r_dir: DirRoute | DirInfo, type_or_force?: Class<T> | boolean, force_or_imm?: boolean, imm?: boolean) {
        if (!dir_info_or_r_dir) return;

        let dir_info: DirRoute = (<DirInfo>dir_info_or_r_dir).DIR ?? dir_info_or_r_dir as DirRoute;
        let bundle_name = dir_info.bundle;

        if (bundle_name == "remote") {
            console.error("[RES] 加载错误", "不支持对 remote loader 进行目录相关操作");
            return { error: new Error("[RES] 加载错误"), items: null };
        }

        let bundle = this.bundles.get(bundle_name);

        if (bundle) {
            bundle.releaseDir(dir_info, type_or_force as Class<T>, force_or_imm, imm);
        }
    }


    /**
     * 按 bundle 名称找到原加载器，传回资源对象，或用路径和类型找到对应缓存项，默认减一次业务使用。
     * @param imm 为 true 时在本次释放中检查计数，归零就移出缓存。
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
     * 按名称或地址打开 bundle。先查已登记的框架 Bundle，成功返回的 bundle 可以继续加载图片。
     */
    loadBundle(name_or_url: string, opt?: BundleLoadOpt): Promise<BundleLoadReturnType>;
    loadBundle(r_bundle: BundleRoute, opt?: BundleLoadOpt): Promise<BundleLoadReturnType>;
    async loadBundle(name_or_url_or_r_bundle: string | BundleRoute, opt?: BundleLoadOpt): Promise<BundleLoadReturnType> {
        let retry = opt?.retry !== false;
        let retry_time = opt?.retry_time || 5000;

        // 缺少名称或地址时直接返回错误。
        if (!name_or_url_or_r_bundle) {
            console.error("[RES] 加载错误", "Bundle NameOrUrl 无效");
            return { error: new Error("[RES] 加载错误"), bundle: null };
        }

        let bundle_name = typeof name_or_url_or_r_bundle == "string" ? name_or_url_or_r_bundle : name_or_url_or_r_bundle.NAME;

        let result: BundleLoadReturnType;

        do {
            // 此处查的是已打开的 bundle。单张图片的缓存要等进入 Loader.load 后再查。
            let bundle = this.isCached(bundle_name);
            if (bundle) {
                return { error: null, bundle: bundle };
            }

            // 首次打开时等待引擎和依赖 bundle 就绪。
            result = await this._loadBundle(bundle_name, opt);

        } while (!result.bundle && this.printLog(result.error) && retry && (!await sleep(retry_time)));

        return result;
    }


    /**
     * 记录本次打开 bundle 的错误，交由 loadBundle 判断是否重试。
     */
    protected printLog(err: Error) {
        console.log("[RES] 加载错误", err);
        return true;
    }


    /**
     * 让 cc.assetManager 打开 bundle。若引擎报告了依赖，就等每个依赖打开成功，再返回当前的框架 Bundle。
     */
    protected _loadBundle(name_or_url: string, opt?: BundleLoadOpt): Promise<BundleLoadReturnType> {
        let version = opt?.version;

        let promise = new Promise<BundleLoadReturnType>((resolve) => {
            cc.assetManager.loadBundle(name_or_url, {
                version: version,
            }, (err, assetbundle) => {
                if (!err) {
                    // 当前 bundle 的图片可能依赖其他 bundle。依赖列表中任何一项打开失败，这次打开就返回错误。
                    // 每个 bundle 可以有自己的版本号，传给依赖的选项只包括重试开关和间隔。
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
     * 按引擎返回的名称，在 bundles 表中查已打开的框架 Bundle。
     */
    protected isCached(name: string) {
        return this.bundles.get(name);
    }


    /**
     * 登记这个名称对应的框架 Bundle，后续同名请求可以直接复用。
     */
    protected setCached(name: string, instane: Bundle) {
        this.bundles.set(name, instane);
        return instane;
    }


    /**
     * 从 bundles 表移除框架对象，并从引擎移除对应 bundle。资源缓存由调用方 releaseBundle 先清理。
     */
    protected removeCache(name: string) {
        let bundle = this.isCached(name);
        if (bundle?.bundle) {
            this.bundles.delete(name);
            cc.assetManager.removeBundle(bundle.bundle);
        }
    }


    /**
     * 卸载整个 bundle 时，先清零其中所有缓存项的业务计数、交还引擎引用，再移除 bundle。
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
     * 只清理业务使用次数已归零的缓存项。传名称时只扫描对应加载器，省略时检查所有 bundle 和远程缓存。
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
     * Bundle 加载失败后的重试间隔，默认 5000 毫秒。
     */
    retry_time?: number;

    /**
     * 传给 cc.assetManager.loadBundle 的版本号，适用于本次要打开的 bundle。
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
 * 单项资源的位置和类型。普通资源填写 bundle 内的 url，远程资源使用 "remote" 和完整 URL。
 */
export type ResRoute<T extends cc.Asset> = { bundle: string, url: string, type: Class<T> };


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
 * 共享的 ResManager 实例。界面使用的 resLoader 会把加载请求转交给这里。
 */
export const res = new ResManager();
