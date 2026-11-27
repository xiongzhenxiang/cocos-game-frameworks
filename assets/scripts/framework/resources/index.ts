/**
 * 读一张动态图片的加载流程，可以从这里开始：
 * 1. 面板通过 resLoader（ResLoader 的共享实例）调用 loadResToBundle，传入图片路径和使用者 target。
 * 2. 这个方法定义在 ResLoaderBase 中。它记住本次请求所属的分组，将加载交给 res（ResManager 的实例）。
 * 3. ResManager 找到对应的 Bundle。Bundle 继承 Loader 的缓存逻辑：命中时复用图片，否则向引擎加载。
 * 4. 默认加载成功后，Loader 记一次业务使用，ResLoaderBase 将图片登记到 target 名下。
 *    面板销毁时调用 resLoader.releaseResToBundle(target)，逐次交还自己取用的图片。
 */
export { ResManager, res, BundleLoadOpt } from "./ResManager";
export type { ResRoute, BundleRoute, DirRoute } from "./ResManager";
export { ResLoader, resLoader } from "./ResLoader";
export { ResLoaderBase } from "./ResLoaderBase";
export { BundleName } from "./ResourceTypes";
export { ResLoadOpt, ResPreloadOpt } from "./Loader";
export type { AssetClass } from "./ResourceTypes";
