import type { ResDirLoadReturnType } from "./Bundle";
import type { ResLoadDirReturnType, ResLoadOpt, ResLoadReturnType, ResPreloadReturnType } from "./Loader";
import { res } from "./ResManager";
import type { AssetClass } from "./ResourceTypes";

type HeldAsset = { bundle: string; asset: cc.Asset };
type OwnerGroups = Map<string, HeldAsset[]>;

/** 按使用者记录动态加载的资源。Bundle 名称由调用方传入。 */
export class ResLoader {
    private readonly assets: OwnerGroups = new Map();
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
        groups.delete(target);
        for (const { bundle, asset } of held) {
            res.release({ NAME: bundle }, asset, force, immediate);
        }
    }

    private record(groups: OwnerGroups, target: string, group: HeldAsset[], bundle: string, assets: cc.Asset[]): boolean {
        if (groups.get(target) !== group) {
            // 等待加载期间使用者已释放。归还本次引用，不交给同名的新使用者。
            for (const asset of assets) res.release({ NAME: bundle }, asset, false, true);
            return false;
        }
        for (const asset of assets) group.push({ bundle, asset });
        return true;
    }

    async loadResToBundle<T extends cc.Asset>(bundle: string, url: string, type: AssetClass<T>, target: string, opt?: ResLoadOpt): Promise<ResLoadReturnType<T>> {
        const group = opt?.ref !== false ? this.group(this.assets, target) : null;
        const result = await res.load({ bundle, url, type }, opt);
        if (group && !result.error && !this.record(this.assets, target, group, bundle, [result.resource])) {
            return { error: new Error("加载期间使用者已释放"), resource: null };
        }
        return result;
    }

    async loadResArrayToBundle<T extends cc.Asset>(bundle: string, urls: string[], type: AssetClass<T>, target: string, opt?: ResLoadOpt): Promise<ResLoadDirReturnType<T>> {
        let finished = 0;
        const results = await Promise.all(urls.map(async url => {
            const result = await this.loadResToBundle(bundle, url, type, target, opt);
            opt?.onProgress?.(++finished, urls.length);
            return result;
        }));
        return { error: results.find(result => result.error)?.error ?? null, resource: results.map(result => result.resource) };
    }

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

    releaseResToBundle(target: string, force = false, immediate = true): void {
        this.releaseGroup(this.assets, target, force, immediate);
    }

    releaseDirToBundle(target: string): void {
        this.releaseGroup(this.directories, target, false, true);
    }
}

export const resLoader = new ResLoader();
