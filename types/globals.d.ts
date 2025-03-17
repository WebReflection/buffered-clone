export const MAX_ARGS: 65535;
export const Array: ArrayConstructor;
export const ArrayBuffer: ArrayBufferConstructor;
export const DataView: DataViewConstructor;
export const Date: DateConstructor;
export const Error: ErrorConstructor;
export const Map: MapConstructor;
export const Number: NumberConstructor;
export const Object: ObjectConstructor;
export const RegExp: RegExpConstructor;
export const Set: SetConstructor;
export const String: StringConstructor;
export const TypeError: TypeErrorConstructor;
export const ImageData: {
    new (sw: number, sh: number, settings?: ImageDataSettings): ImageData;
    new (data: Uint8ClampedArray, sw: number, sh?: number, settings?: ImageDataSettings): ImageData;
    prototype: ImageData;
} | typeof Nope;
export const Uint8Array: Uint8ArrayConstructor;
export const Uint8ClampedArray: Uint8ClampedArrayConstructor;
export const Uint16Array: Uint16ArrayConstructor;
export const Uint32Array: Uint32ArrayConstructor;
export const Float16Array: any;
export const Float32Array: Float32ArrayConstructor;
export const Float64Array: Float64ArrayConstructor;
export const Int8Array: Int8ArrayConstructor;
export const Int16Array: Int16ArrayConstructor;
export const Int32Array: Int32ArrayConstructor;
export const BigUint64Array: BigUint64ArrayConstructor;
export const BigInt64Array: BigInt64ArrayConstructor;
declare class Nope {
}
export {};
