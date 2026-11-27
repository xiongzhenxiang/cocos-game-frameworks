import type { ResLoadOpt } from "./Loader";
import { ResLoaderBase } from "./ResLoaderBase";
import { BundleName } from "./ResourceTypes";
import type { AssetClass } from "./ResourceTypes";

/** 战斗共用的使用者标识。它和 bundle 名称恰好同为 "battleScene"，这里用它决定退出时交还哪组资源。 */
const battleTarget = "battleScene";

/** 界面通过 resLoader 调用这个类。战斗方法填好 bundle 名称，实际加载和按使用者释放的逻辑在父类 ResLoaderBase。 */
export class ResLoader extends ResLoaderBase {
    /** 保存各界面共用的实例。直接 new ResLoader() 会建立另一套使用者清单，底层仍共用 res 管理的缓存。 */
    private static instance?: ResLoader;

    /** 首次调用时创建实例。以后从这里取得的对象与文件末尾导出的 resLoader 相同。 */
    static getIns(): ResLoader {
        if (!ResLoader.instance) {
            ResLoader.instance = new ResLoader();
        }
        return ResLoader.instance;
    }

    /** 从战斗 bundle 取一项资源。随战斗结束一起释放时用默认 target，要单独关闭的面板传自己的标识。 */
    loadResToBattleBundle<T extends cc.Asset>(url: string, type: AssetClass<T>, target = battleTarget, opt?: ResLoadOpt) {
        return this.loadResToBundle(BundleName.BATTLE_SCENE, url, type, target, opt);
    }

    /** 并行加载战斗资源，返回顺序与 urls 一致。默认登记在 battleTarget 名下，与单项加载共用释放入口。 */
    loadResArrayToBattleBundle<T extends cc.Asset>(urls: string[], type: AssetClass<T>, opt?: ResLoadOpt) {
        return this.loadResArrayToBundle(BundleName.BATTLE_SCENE, urls, type, battleTarget, opt);
    }

    /** 加载战斗目录，返回的资源由 releaseDirToBundle(battleTarget) 逐项交还。 */
    loadDirToBattleBundle<T extends cc.Asset>(path: string, type: AssetClass<T>, opt?: ResLoadOpt) {
        return this.loadDirToBundle(BundleName.BATTLE_SCENE, path, type, battleTarget, opt);
    }

    /** 提前准备单个文件。显示资源时再走正式加载。 */
    preLoadResToBattleBundle<T extends cc.Asset>(url: string, type: AssetClass<T>) {
        return this.preLoadResToBundle(BundleName.BATTLE_SCENE, url, type);
    }

    /** 按传入顺序提前准备多个文件，返回预加载请求项。 */
    preLoadResArrayToBattleBundle<T extends cc.Asset>(urls: string[], type: AssetClass<T>, opt?: ResLoadOpt) {
        return this.preLoadResArrayToBundle(BundleName.BATTLE_SCENE, urls, type, battleTarget, opt);
    }

    /** 提前准备目录文件。预加载不会增加业务使用次数。 */
    preLoadDirToBattleBundle<T extends cc.Asset>(path: string, type: AssetClass<T>, opt?: ResLoadOpt) {
        return this.preLoadDirToBundle(BundleName.BATTLE_SCENE, path, type, battleTarget, opt);
    }
}

/** 面板导入的小写 resLoader 是 ResLoader 的实例，可直接调用它继承的通用方法。 */
export const resLoader = ResLoader.getIns();
