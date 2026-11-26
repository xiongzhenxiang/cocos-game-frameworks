/** Cocos Creator 2.4 资源构造函数，用于按类型加载及区分同路径资源。 */
export type AssetClass<T extends cc.Asset> = new (...args: any[]) => T;

export function sleep(ms: number): Promise<undefined> {
    return new Promise(resolve => setTimeout(() => resolve(undefined), ms));
}
