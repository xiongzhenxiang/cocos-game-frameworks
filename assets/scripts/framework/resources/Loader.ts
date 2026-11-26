import { AssetClass, sleep } from "./ResourceTypes";

/**
 * Bundle 和 Remote 共用的资源缓存。每个加载器分别记录自己缓存了哪些资源、每份资源被取用了几次。
 */
export abstract class Loader {

    /**
     * 先按类型、再按路径查找。同一路径的 Texture2D 和 SpriteFrame 各有一条缓存记录。
     */
    cached_map: Map<AssetClass<cc.Asset>, Map<string, AssetInfo>> = new Map();

    /**
     * 按实例找到同一条缓存记录，方便使用者直接交还加载时取得的对象。
     */
    info_map: WeakMap<cc.Asset, AssetInfo> = new WeakMap();


    /**
     * 预加载资源
     */
    async preload<T extends cc.Asset>(res_path: ResPath<T>, opt?: ResPreloadOpt): Promise<ResPreloadReturnType> {
        let retry = opt?.retry !== false;
        let retry_time = opt?.retry_time || 500;

        // check param
        if (!res_path) {
            console.error("[RES] 加载错误", "URL 无效");
            return { error: new Error("[RES] 加载错误"), items: null };
        }

        let { url, type } = res_path;
        let result: ResPreloadReturnType;

        do {
            // 素材已在内存中，本次预加载无需再取文件，也不会增加使用次数。
            let info = this.isCached(url, type);
            if (info) {
                return { error: null, items: [] };
            }

            result = await this._preload(url, type);
        } while (result.error && this.printLog(result.error) && retry && (!await sleep(retry_time)));

        return result;
    }


    /**
     * 默认每次成功取用都登记一份业务引用，首次加载和缓存命中遵循同一规则。
     */
    async load<T extends cc.Asset>(res_path: ResPath<T>, opt?: ResLoadOpt): Promise<ResLoadReturnType<T>> {
        let retry = opt?.retry !== false;
        let retry_time = opt?.retry_time || 500;
        let ref = opt?.ref !== false;

        // check param
        if (!res_path) {
            console.error("[RES] 加载错误", "URL 无效");
            return { error: new Error("[RES] 加载错误"), resource: null };
        }

        let { url, type } = res_path;
        let result: ResLoadReturnType<T>;

        do {
            // 两个面板可以拿到同一张图。默认每次命中都增加使用次数，缓存仍只持有一份引擎引用。
            let info = this.isCached(url, type);
            if (info) {
                if (ref) this.addRef(info.asset);
                return { error: null, resource: info.asset as T };
            }

            result = await this._load(url, type);

            if (result.error && result.error.message.includes('maximum')) {
                cc.assetManager.cacheManager?.clearLRU();
            }

        } while (result.error && this.printLog(result.error) && retry && (!await sleep(retry_time)));

        if (!result.error) {
            if (ref) this.addRef(result.resource);
        }

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
     * 子类向引擎发起文件预加载，返回请求项。使用者需要资源实例时再调用 load。
     */
    protected abstract _preload<T extends cc.Asset>(url: string, type: AssetClass<T>): Promise<ResPreloadReturnType>;


    /**
     * 子类取得资源实例后再次检查缓存，首次入缓存时调用 setCached。
     */
    protected abstract _load<T extends cc.Asset>(url: string, type: AssetClass<T>): Promise<ResLoadReturnType<T>>;


    /**
     * 检查资源是否已经缓存
     */
    protected isCached(url: string, type: AssetClass<cc.Asset>) {
        let map = this.cached_map.get(type);
        if (map) {
            return map.get(url);
        } else {
            return null;
        }
    }


    /**
     * 首次入缓存时，加载器通过 asset.addRef() 持有一份引擎引用。面板的使用次数另记在 AssetInfo.ref。
     */
    protected setCached(url: string, type: AssetClass<cc.Asset>, instane: cc.Asset) {
        let map = this.cached_map.get(type);
        if (!map) {
            this.cached_map.set(type, map = new Map());
        }

        instane.addRef();

        let info = new AssetInfo(url, type, instane);
        map.set(url, info);
        this.info_map.set(instane, info);
        return info;
    }


    /**
     * 移除两处索引，再用 asset.decRef() 交还缓存持有的引擎引用。引擎会检查是否还有其他持有者。
     */
    protected removeCache(url: string, type: AssetClass<cc.Asset>) {
        let map = this.cached_map.get(type);
        if (!map) {
            return null;
        }

        let info = map.get(url);
        if (!info) {
            return null;
        }

        map.delete(url);
        this.info_map.delete(info.asset);
        info.asset.decRef();
    }


    /**
     * 通过资源实例获取资源额外数据
     */
    protected getAssetInfo(asset: cc.Asset) {
        return this.info_map.get(asset);
    }


    /**
     * 记录一次业务取用。两个面板分别取用同一张图时，info.ref 增加两次。
     */
    addRef(res: cc.Asset): void;
    addRef(res_path: ResPath<cc.Asset>): void;
    addRef(res_or_res_path: cc.Asset | ResPath<cc.Asset>) {
        let info = res_or_res_path instanceof cc.Asset ? this.getAssetInfo(res_or_res_path) : this.isCached(res_or_res_path.url, res_or_res_path.type);
        if (info) {
            info.ref++;
        }
        return true;
    }


    /**
     * 交还一次业务引用，最低减到零。
     */
    decRef(res: cc.Asset): void;
    decRef(res_path: ResPath<cc.Asset>): void;
    decRef(res_or_res_path: cc.Asset | ResPath<cc.Asset>) {
        let info = res_or_res_path instanceof cc.Asset ? this.getAssetInfo(res_or_res_path) : this.isCached(res_or_res_path.url, res_or_res_path.type);
        if (info) {
            if (info.ref > 0) info.ref--;
        }
        return true;
    }


    /**
     * 置零资源引用计数
     */
    refZero(res: cc.Asset): void;
    refZero(res_path: ResPath<cc.Asset>): void;
    refZero(res_or_res_path: cc.Asset | ResPath<cc.Asset>) {
        let info = res_or_res_path instanceof cc.Asset ? this.getAssetInfo(res_or_res_path) : this.isCached(res_or_res_path.url, res_or_res_path.type);
        if (info) {
            info.ref = 0;
        }
        return true;
    }


    /**
     * 交还一次业务引用。默认先保留缓存，之后可调用 gc 清理使用次数为零的资源。
     * @param force 设为 true 会清零这份资源的全部业务引用，包括其他使用者的引用。
     * @param imm 设为 true 会立即检查使用次数，归零才移出缓存。
     */
    release(res: cc.Asset, force?: boolean, imm?: boolean): void;
    release(res_path: ResPath<cc.Asset>, force?: boolean, imm?: boolean): void;
    release(res_or_res_path: cc.Asset | ResPath<cc.Asset>, force?: boolean, imm?: boolean) {

        // 资源实例
        let info = res_or_res_path instanceof cc.Asset ? this.getAssetInfo(res_or_res_path) : this.isCached(res_or_res_path.url, res_or_res_path.type);
        if (!info) return;

        let asset = info.asset;

        // 减少计数
        if (force) {
            this.refZero(asset);
        } else {
            this.decRef(asset);
        }

        // 立即释放
        if (imm) {
            if (info.ref == 0) {
                this._release(info);
            }
        }
    }


    /**
     * 对所有资源引用计数减 1，仅持续引用才需调用此接口
     * @param force 直接把计数清零，默认 false
     * @param imm 是否立即触发释放流程，默认为 false
     */
    releaseAll(force?: boolean, imm?: boolean) {
        for (const { 1: map } of this.cached_map) {
            for (const { 1: info } of map) {
                if (force) {
                    this.refZero(info.asset);
                } else {
                    this.decRef(info.asset);
                }

                if (imm) {
                    if (info.ref == 0) {
                        this._release(info);
                    }
                }
            }
        }
    }


    /**
     * 尝试释放单个资源
     * @param force 不判断计数是否清零而强制释放，默认 false
     */
    protected _release(asset: cc.Asset | AssetInfo, force: boolean = false) {
        let info = asset instanceof AssetInfo ? asset : this.getAssetInfo(asset);
        if (info && (info.ref <= 0 || force)) {
            this.removeCache(info.url, info.type);
        }
    }


    /**
     * 扫描本加载器的缓存，交还使用次数已归零的资源。
     */
    gc() {
        for (const { 1: map } of this.cached_map) {
            for (const { 1: info } of map) {
                this._release(info.asset);
            }
        }
    }

}


/**
 * 资源额外数据类
 */
export class AssetInfo {

    /**
     * 加载时传入的 URL
     */
    url: string;

    /**
     * 与 URL 共同构成缓存键的资源类型，例如 cc.SpriteFrame。
     */
    type: AssetClass<cc.Asset>;

    /**
     * 资源实例
     */
    asset: cc.Asset;

    /**
     * 业务使用次数，初始为零。首次入缓存时取得的引擎引用单独由 cc.Asset 记录。
     */
    ref: number;

    constructor(url: string, type: AssetClass<cc.Asset>, asset: cc.Asset) {
        this.url = url;
        this.type = type;
        this.asset = asset;
        this.ref = 0;
    }

}


/**
 * 加载可选参数
 */
export class ResLoadOpt {
    /**
     * 是否无限重试直到加载成功，默认为 true
     */
    retry?: boolean;

    /**
     * 重试间隔时间，默认为 500 毫秒
     */
    retry_time?: number;

    /**
     * 默认记录使用次数，用完后调用 release。传入 false 时仅缓存资源，供 gc 清理。
     */
    ref?: boolean;

    /**
     * 加载的进度回调
     */
    onProgress?: Function;

    /**
     * 快捷参数：重试，500ms，并对资源引用计数 +1
     */
    static readonly AddRef: ResLoadOpt = Object.freeze({ ref: true });
}


/**
 * 预加载可选参数
 */
export class ResPreloadOpt {
    /**
     * 是否无限重试直到加载成功，默认为 true
     */
    retry?: boolean;

    /**
     * 重试间隔时间，默认为 500 毫秒
     */
    retry_time?: number;
}


/**
 * 获取资源函数的通用返回类型
 */
export type ResLoadReturnType<T extends cc.Asset> =
    | { error: null; resource: T }
    | { error: Error; resource: T | null };

/**
 * 获取资源返回的通用类型
 */
export type ResLoadDirReturnType<T extends cc.Asset> = { error: Error | null; resource: (T | null)[] };


/**
 * 获取资源函数的通用返回类型
 */
export type ResPreloadReturnType =
    | { error: null; items: cc.AssetManager.RequestItem[] }
    | { error: Error; items: cc.AssetManager.RequestItem[] | null };


/**
 * 记录资源相对路径的对象
 */
export type ResPath<T extends cc.Asset> = { url: string, type: AssetClass<T> };
