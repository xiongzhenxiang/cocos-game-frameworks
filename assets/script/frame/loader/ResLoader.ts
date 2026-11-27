import type { ResLoadOpt } from "../res/Loader";
import { ResLoaderBase } from "./ResLoaderBase";
import { BundleName } from "../Type/ResLoaderType";
import type { Class } from "../Type/PropType";

/** 战斗共用的使用者标识。它和 bundle 名称恰好同为 "battleScene"，这里用它决定退出时交还哪组资源。 */
const battleTarget = "battleScene";

/**
 * 两个面板共用一张道具图标时，可以沿着这四步读源码。
 * 1. 第一个面板调用 resLoader.loadResToBundle，传入 bundle 名称、图片路径、cc.SpriteFrame 和自己的 target。
 *    resLoader 是 ResLoader 的共享实例。它继承的 ResLoaderBase 会记住这次请求属于哪个面板。
 * 2. res（ResManager 的实例）找到对应的 Bundle。Loader 按类型和路径查图片缓存，首次未命中就由 Bundle 向引擎取图。
 * 3. 图片首次入缓存时，缓存对图片调用一次 addRef()。默认每成功取用一次，Loader 另给业务计数加一。
 *    第二个面板命中同一张图片时，业务计数从 1 变成 2。两个面板各自的 target 名下都有一条取用记录。
 * 4. 两个面板分别用自己的 target 调用 resLoader.releaseResToBundle。第一个关闭后计数为 1，另一个仍可显示图片。
 *    最后一次交还后计数归零，框架移除缓存并对图片调用 decRef()。图片能否回收还取决于引擎中的其他引用。
 */
export class ResLoader extends ResLoaderBase {
    /** 从战斗 bundle 取一项资源。随战斗结束一起释放时用默认 target，要单独关闭的面板传自己的标识。 */
    loadResToBattleBundle<T extends cc.Asset>(url: string, type: Class<T>, target = battleTarget, opt?: ResLoadOpt) {
        return this.loadResToBundle(BundleName.BATTLE_SCENE, url, type, target, opt);
    }

    /** 并行加载战斗资源，返回顺序与 urls 一致。默认登记在 battleTarget 名下，与单项加载共用释放入口。 */
    loadResArrayToBattleBundle<T extends cc.Asset>(urls: string[], type: Class<T>, opt?: ResLoadOpt) {
        return this.loadResArrayToBundle(BundleName.BATTLE_SCENE, urls, type, battleTarget, opt);
    }

    /** 加载战斗目录，返回的资源由 releaseDirToBundle(battleTarget) 逐项交还。 */
    loadDirToBattleBundle<T extends cc.Asset>(path: string, type: Class<T>, opt?: ResLoadOpt) {
        return this.loadDirToBundle(BundleName.BATTLE_SCENE, path, type, battleTarget, opt);
    }

    /** 提前准备单个文件。显示资源时再走正式加载。 */
    preLoadResToBattleBundle<T extends cc.Asset>(url: string, type: Class<T>) {
        return this.preLoadResToBundle(BundleName.BATTLE_SCENE, url, type);
    }

    /** 按传入顺序提前准备多个文件，返回预加载请求项。 */
    preLoadResArrayToBattleBundle<T extends cc.Asset>(urls: string[], type: Class<T>, opt?: ResLoadOpt) {
        return this.preLoadResArrayToBundle(BundleName.BATTLE_SCENE, urls, type, battleTarget, opt);
    }

    /** 提前准备目录文件。预加载不会增加业务使用次数。 */
    preLoadDirToBattleBundle<T extends cc.Asset>(path: string, type: Class<T>, opt?: ResLoadOpt) {
        return this.preLoadDirToBundle(BundleName.BATTLE_SCENE, path, type, battleTarget, opt);
    }
}

/** 面板导入的小写 resLoader 是 ResLoader 的实例，可直接调用它继承的通用方法。 */
export const resLoader = ResLoader.getIns();
