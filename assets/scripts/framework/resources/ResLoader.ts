import type { ResLoadOpt } from "./Loader";
import { ResLoaderBase } from "./ResLoaderBase";
import { BundleName } from "./ResourceTypes";
import type { AssetClass } from "./ResourceTypes";

/** 默认将战斗请求记在这个使用者名下，退出战斗时可按它交还整组引用。 */
const battleTarget = "battleScene";

/** 项目入口。通用的加载、使用者登记和释放方法继承自 ResLoaderBase。 */
export class ResLoader extends ResLoaderBase {
    /** 模块导出的共享实例。直接 new ResLoader() 时会得到独立的使用者清单。 */
    private static instance?: ResLoader;

    static getIns(): ResLoader {
        if (!ResLoader.instance) {
            ResLoader.instance = new ResLoader();
        }
        return ResLoader.instance;
    }

    /** 从战斗 bundle 取一项资源。独立关闭的面板可以传入自己的 target。 */
    loadResToBattleBundle<T extends cc.Asset>(url: string, type: AssetClass<T>, target = battleTarget, opt?: ResLoadOpt) {
        return this.loadResToBundle(BundleName.BATTLE_SCENE, url, type, target, opt);
    }

    /** 并行取多项战斗资源，结果顺序与 urls 一致，引用登记在 battleTarget 名下。 */
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

export const resLoader = ResLoader.getIns();
