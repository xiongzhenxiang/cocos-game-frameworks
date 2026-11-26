/**
 * res 按包名、路径和资源类型加载素材。调用方负责交还自己取得的引用。
 * 面板可以用 resLoader 登记自己请求的动态图片，在销毁时统一交还。
 */
export { ResManager, res, BundleLoadOpt } from "./ResManager";
export type { ResRoute, BundleRoute, DirRoute } from "./ResManager";
export { ResLoader, resLoader } from "./ResLoader";
export { ResLoadOpt, ResPreloadOpt } from "./Loader";
export type { AssetClass } from "./ResourceTypes";
