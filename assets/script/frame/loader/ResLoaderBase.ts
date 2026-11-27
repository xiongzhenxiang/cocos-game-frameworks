import { Singleton } from "../../common/Singleton";
import type { ResDirLoadReturnType } from "../res/Bundle";
import type { ResLoadDirReturnType, ResLoadOpt, ResLoadReturnType, ResPreloadReturnType } from "../res/Loader";
import { res } from "../res/ResManager";
import type { Class } from "../Type/PropType";

/** 一条记录对应一次需要交还的取用。同一张图片加载成功两次，清单里就有两条。 */
type HeldAsset = {
    /** 加载这张图时使用的 bundle 名称。交还时用它找到保存图片的加载器。 */
    bundle: string;
    /** 加载返回的资源对象，例如交给图标显示的 cc.SpriteFrame。释放时可直接用它找到缓存记录。 */
    asset: cc.Asset;
};

/** 按使用者分组。键是调用方传入的字符串 target，值是这个使用者尚未交还的每一次取用。 */
type OwnerGroups = Map<string, HeldAsset[]>;

/**
 * 管理界面动态加载的资源。target 由调用方指定，它决定哪些资源一起释放。
 * 同时打开两个背包面板时，分别给它们一个标识。关闭第一个面板，只传回第一个标识。
 */
export class ResLoaderBase extends Singleton {
    /** 单张或按数组加载的资源记在这里。面板关闭时，releaseResToBundle(target) 逐条交还。 */
    private readonly assets: OwnerGroups = new Map();

    /** 整个目录加载成功后，每个返回的资源都记在这里。调用 releaseDirToBundle(target) 交还。 */
    private readonly directories: OwnerGroups = new Map();

    /** 请求发出前取得清单。即使 target 字符串相同，面板关闭后重开也会拿到一个新的数组。 */
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
        // group 是请求开始时的清单，groups.get(target) 是现在的清单。比较数组本身就能辨认同名面板是否重开。
        if (groups.get(target) !== group) {
            // 图片晚于面板关闭才返回。加载器刚记了一次取用，这里立即交还，避免旧图片留在新面板名下。
            for (const asset of assets) res.release({ NAME: bundle }, asset, false, true);
            return false;
        }
        for (const asset of assets) group.push({ bundle, asset });
        return true;
    }

    /**
     * 从指定 bundle 取一项资源。加载图片时，url 是 bundle 内的路径，type 通常传 cc.SpriteFrame。
     * 成功时从 result.resource 取得图片帧。默认按 target 登记这次取用，关闭面板时传回同一个 target。
     * 传入 ref: false 会跳过这次业务计数和使用者登记，图片仍可进入加载器缓存。
     */
    async loadResToBundle<T extends cc.Asset>(bundle: string, url: string, type: Class<T>, target: string, opt?: ResLoadOpt): Promise<ResLoadReturnType<T>> {
        const group = opt?.ref !== false ? this.group(this.assets, target) : null;
        const result = await res.load({ bundle, url, type }, opt);
        if (group && !result.error && !this.record(this.assets, target, group, bundle, [result.resource])) {
            return { error: new Error("加载期间使用者已释放"), resource: null };
        }
        return result;
    }

    /** 并行加载多项。resource[i] 对应 urls[i]，进度按实际完成的项数通知，单项失败也计入进度。 */
    async loadResArrayToBundle<T extends cc.Asset>(bundle: string, urls: string[], type: Class<T>, target: string, opt?: ResLoadOpt): Promise<ResLoadDirReturnType<T>> {
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
            // 先返回的图片在面板关闭时已交还，晚到的由 record 交还。整批返回空结果占位，避免把旧图片交给新面板。
            return { error: new Error("加载期间使用者已释放"), resource: urls.map(() => null) };
        }
        return {
            error: results.find(result => result.error)?.error ?? null,
            resource: results.map(result => result.resource),
        };
    }

    /** 按实际返回的资源逐项登记，稍后用 releaseDirToBundle 交还这一组目录请求。 */
    async loadDirToBundle<T extends cc.Asset>(bundle: string, path: string, type: Class<T>, target: string, opt?: ResLoadOpt): Promise<ResDirLoadReturnType<T>> {
        const group = opt?.ref !== false ? this.group(this.directories, target) : null;
        const result = await res.loadDir({ bundle, path }, type, opt);
        if (group && !result.error && !this.record(this.directories, target, group, bundle, result.resources)) {
            return { error: new Error("加载期间使用者已释放"), resources: null };
        }
        return result;
    }

    /** 提前准备文件，返回引擎请求项 items。要把图片交给组件显示，再调用 loadResToBundle。 */
    preLoadResToBundle<T extends cc.Asset>(bundle: string, url: string, type: Class<T>, _target?: string) {
        return res.preload({ bundle, url, type });
    }

    /** 按 urls 顺序预加载。某项失败就停止，items 里保留此前已取得的请求项。 */
    async preLoadResArrayToBundle<T extends cc.Asset>(bundle: string, urls: string[], type: Class<T>, _target?: string, opt?: ResLoadOpt): Promise<ResPreloadReturnType> {
        const items: cc.AssetManager.RequestItem[] = [];
        for (const url of urls) {
            const result = await res.preload({ bundle, url, type }, opt);
            if (result.error) return { error: result.error, items };
            items.push(...result.items);
            opt?.onProgress?.();
        }
        return { error: null, items };
    }

    /** 提前准备目录中指定类型的文件。预加载不会写入 directories，正式加载目录时才登记使用者。 */
    preLoadDirToBundle<T extends cc.Asset>(bundle: string, path: string, type: Class<T>, _target?: string, opt?: ResLoadOpt) {
        return res.preloadDir({ bundle, path }, type, opt);
    }

    /**
     * 面板关闭时，用加载时的 target 交还单项和数组请求。默认每条记录减一次业务计数，减到零才移出缓存。
     * force 为 true 会把这项资源的业务计数全部清零，包括其他面板的取用。immediate 为 false 时留待 gc 检查。
     */
    releaseResToBundle(target: string, force = false, immediate = true): void {
        this.releaseGroup(this.assets, target, force, immediate);
    }

    /** 只交还这个 target 的目录清单。同一个面板还加载过单张图片时，另调 releaseResToBundle(target)。 */
    releaseDirToBundle(target: string): void {
        this.releaseGroup(this.directories, target, false, true);
    }
}
