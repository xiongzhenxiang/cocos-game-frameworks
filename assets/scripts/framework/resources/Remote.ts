import { AssetClass } from "./ResourceTypes";
import { Loader, ResLoadReturnType, ResPreloadReturnType } from "./Loader";


/**
 * 处理 bundle 为 "remote" 的请求。以完整 URL 和请求类型为键，复用 Loader 的缓存与释放流程。
 */
export class Remote extends Loader {

    /**
     * 把请求类型映射为引擎的 ext 参数，帮助引擎选择文件处理器。例如 cc.Texture2D 对应 .png。
     */
    protected _load<T extends cc.Asset>(url: string, type: AssetClass<T>): Promise<ResLoadReturnType<T>> {
        return new Promise((resolve) => {
            cc.assetManager.loadRemote(url, { ext: type2Ext(type) }, (err, asset: T) => {
                if (!err) {
                    this.isCached(url, type) || this.setCached(url, type, asset);
                }
                resolve({ error: err, resource: asset });
            });
        });
    }


    /**
     * 通过 preloadAny 预取远程文件，返回引擎请求项 items。
     */
    protected _preload<T extends cc.Asset>(url: string, type: AssetClass<T>): Promise<ResPreloadReturnType> {
        return new Promise((resolve) => {
            // __isNative__ 告诉引擎按原始文件处理这个 URL。此分支尚未在真实引擎中验证。
            cc.assetManager.preloadAny(url, { __isNative__: true, ext: type2Ext(type) }, (err, items) => {
                resolve({ error: err, items: items });
            });
        });
    }

}


/**
 * 这里配置的是文件扩展名。loadRemote 最终返回的对象由 Cocos 对应的文件处理器创建。
 */
export function type2Ext(type: AssetClass<cc.Asset>): string {
    switch (type) {
        case cc.Texture2D:
            return ".png";
        case cc.SpriteFrame:
            return "";
        case cc.JsonAsset:
            return ".json";
        case cc.TextAsset:
            return ".txt";
        case cc.SpriteAtlas:
            return "";
        case cc.AnimationClip:
            return ".clip";
        case cc.AudioClip:
            return ".mp3";
        default:
            return "";
    }
}


/**
 * 远程获取的资源支持类型
 */
export type RemoteSupportType = AssetClass<cc.Texture2D> | AssetClass<cc.JsonAsset>;
