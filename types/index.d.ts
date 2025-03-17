export default class JSPack {
    constructor(options?: {
        littleEndian: boolean;
        circular: boolean;
        byteOffset: number;
        byteLength: number;
        useFloat32: boolean;
        useUTF16: boolean;
        mirrored: any[];
    });
    decode: (view: Uint8Array) => any;
    encode: (value: any, into?: boolean) => Uint8Array | number;
}
