/** Cocos Creator 2.4 资源构造函数，用于按类型加载及区分同路径资源。 */
export type AssetClass<T extends cc.Asset> = new (...args: any[]) => T;

/** 《暴雪之界》使用的 bundle 名称。通用接口也接受调用方传入其他名称。 */
export enum BundleName {
    RES = "res",
    PREFAB = "prefab",
    SPRITE = "sprite",
    BATTLE_SCENE = "battleScene",
}

export function sleep(ms: number): Promise<undefined> {
    return new Promise(resolve => setTimeout(() => resolve(undefined), ms));
}
