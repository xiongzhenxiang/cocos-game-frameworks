import { AssetClass } from "./ResourceTypes";
import { Loader, ResLoadReturnType, ResPreloadReturnType } from "./Loader";


/**
 * 远程资源加载类
 */
export class Remote extends Loader {

    /**
     * Cocos 远程获取函数封装
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
     * Cocos 远程预获取函数封装
     */
    protected _preload<T extends cc.Asset>(url: string, type: AssetClass<T>): Promise<ResPreloadReturnType> {
        return new Promise((resolve) => {
            // 这段代码用于预加载远程资源，未经过测试
            cc.assetManager.preloadAny(url, { __isNative__: true, ext: type2Ext(type) }, (err, items) => {
                resolve({ error: err, items: items });
            });
        });
    }

}


/**
 * 对应资源类转为 Ext Option
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
