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
export { ResManager, res, BundleLoadOpt } from "./ResManager";
export type { ResRoute, BundleRoute, DirRoute } from "./ResManager";
export { ResLoader, resLoader } from "./ResLoader";
export { ResLoaderBase } from "./ResLoaderBase";
export { BundleName } from "./ResourceTypes";
export { ResLoadOpt, ResPreloadOpt } from "./Loader";
export type { AssetClass } from "./ResourceTypes";
