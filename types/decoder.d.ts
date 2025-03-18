export function decoder({ littleEndian, circular, byteOffset, mirrored, }?: {
    littleEndian: boolean;
    circular: boolean;
    byteOffset: number;
    byteLength: number;
    useFloat32: boolean;
    useUTF16: boolean;
    mirrored: any[];
}): (view: Uint8Array) => any;
export class Decoder {
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
}
