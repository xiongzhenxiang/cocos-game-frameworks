import type { ResDirLoadReturnType } from "./Bundle";
import type { ResLoadDirReturnType, ResLoadOpt, ResLoadReturnType, ResPreloadReturnType } from "./Loader";
import { res } from "./ResManager";
import type { AssetClass } from "./ResourceTypes";

/** 一次成功取用的记录。同一张图取用两次，就保留两条记录。 */
type HeldAsset = {
    /** 资源所属的 bundle 名称。释放时用它找到原来的加载器。 */
    bundle: string;
    /** 这次加载实际返回的对象，例如一张 cc.SpriteFrame。释放时交还这个对象。 */
    asset: cc.Asset;
};

/** 键是使用者标识 target，值是这个使用者需要交还的记录列表。 */
type OwnerGroups = Map<string, HeldAsset[]>;

/**
 * 按使用者（target）记录动态加载的资源。需要分别清理的两个面板实例应使用不同的 target。
 * 同一面板请求同一张图两次，就保存两条记录，关闭时才能交还两次引用。
 */
export class ResLoaderBase {
    /** 单项和数组加载的登记表。按 target 查出已取用的资源，由 releaseResToBundle 逐条交还。 */
    private readonly assets: OwnerGroups = new Map();

    /** 目录加载的登记表。按 target 保存目录加载实际返回的每项资源，由 releaseDirToBundle 逐条交还。 */
    private readonly directories: OwnerGroups = new Map();

    private group(groups: OwnerGroups, target: string): HeldAsset[] {
        let current = groups.get(target);
        if (!current) {
            current = [];
            groups.set(target, current);
        }
        return current;
    }

    private releaseGroup(groups: OwnerGroups, target: string, force: boolean, immediate: boolean): void {
        const held = groups.get(target);
        if (!held) return;
        // 先移除旧分组。同名面板再次打开时会拿到新数组，尚未返回的请求仍关联旧数组。
        groups.delete(target);
        for (const { bundle, asset } of held) {
            res.release({ NAME: bundle }, asset, force, immediate);
        }
    }

    private record(groups: OwnerGroups, target: string, group: HeldAsset[], bundle: string, assets: cc.Asset[]): boolean {
        // group 是发起请求时的列表。参数 assets 是本次返回的资源数组，this.assets 则是整个单项与数组登记表。
        if (groups.get(target) !== group) {
            // 等待加载期间使用者已释放。归还本次引用，不交给同名的新使用者。
            for (const asset of assets) res.release({ NAME: bundle }, asset, false, true);
            return false;
        }
        for (const asset of assets) group.push({ bundle, asset });
        return true;
    }

    /** 开始加载时记住使用者，成功后登记实际返回的资源。ref 为 false 时跳过使用登记。 */
    async loadResToBundle<T extends cc.Asset>(bundle: string, url: string, type: AssetClass<T>, target: string, opt?: ResLoadOpt): Promise<ResLoadReturnType<T>> {
        const group = opt?.ref !== false ? this.group(this.assets, target) : null;
        const result = await res.load({ bundle, url, type }, opt);
        if (group && !result.error && !this.record(this.assets, target, group, bundle, [result.resource])) {
            return { error: new Error("加载期间使用者已释放"), resource: null };
        }
        return result;
    }

    async loadResArrayToBundle<T extends cc.Asset>(bundle: string, urls: string[], type: AssetClass<T>, target: string, opt?: ResLoadOpt): Promise<ResLoadDirReturnType<T>> {
        if (urls.length === 0) return { error: null, resource: [] };
        // 整批请求属于开始加载时的分组。回调可能在全部图片返回前关闭或重开面板。
        const group = opt?.ref !== false ? this.group(this.assets, target) : null;
        let finished = 0;
        const results = await Promise.all(urls.map(async url => {
            const result = await this.loadResToBundle(bundle, url, type, target, opt);
            opt?.onProgress?.(++finished, urls.length);
            return result;
        }));
        if (group && this.assets.get(target) !== group) {
            // 单项已各自处理引用，这里只丢弃旧分组的结果，并保留与输入相同的索引。
            return { error: new Error("加载期间使用者已释放"), resource: urls.map(() => null) };
        }
        return {
            error: results.find(result => result.error)?.error ?? null,
            resource: results.map(result => result.resource),
        };
    }

    /** 按实际返回的资源逐项登记，稍后用 releaseDirToBundle 交还这一组目录请求。 */
    async loadDirToBundle<T extends cc.Asset>(bundle: string, path: string, type: AssetClass<T>, target: string, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
        const group = opt?.ref !== false ? this.group(this.directories, target) : null;
        const result = await res.loadDir({ bundle, path }, type, opt);
        if (group && !result.error && !this.record(this.directories, target, group, bundle, result.resources)) {
            return { error: new Error("加载期间使用者已释放"), resources: null };
        }
        return result;
    }

    /** 预加载只获取文件，成功后不增加使用者的资源引用。 */
    preLoadResToBundle<T extends cc.Asset>(bundle: string, url: string, type: AssetClass<T>, _target?: string) {
        return res.preload({ bundle, url, type });
    }

    async preLoadResArrayToBundle<T extends cc.Asset>(bundle: string, urls: string[], type: AssetClass<T>, _target?: string, opt?: ResLoadOpt): Promise<ResPreloadReturnType> {
        const items: cc.AssetManager.RequestItem[] = [];
        for (const url of urls) {
            const result = await res.preload({ bundle, url, type }, opt);
            if (result.error) return { error: result.error, items };
            items.push(...result.items);
            opt?.onProgress?.();
        }
        return { error: null, items };
    }

    preLoadDirToBundle<T extends cc.Asset>(bundle: string, path: string, type: AssetClass<T>, _target?: string, opt?: ResLoadOpt) {
        return res.preloadDir({ bundle, path }, type, opt);
    }

    /** 面板销毁时，用加载时的 target 交还单项和数组请求。默认逐次减引用，其他使用者仍可继续使用。 */
    releaseResToBundle(target: string, force = false, immediate = true): void {
        this.releaseGroup(this.assets, target, force, immediate);
    }

    releaseDirToBundle(target: string): void {
        this.releaseGroup(this.directories, target, false, true);
    }
}
