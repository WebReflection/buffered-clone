export function encoder({ littleEndian, circular, byteOffset, byteLength, useFloat32, useUTF16, mirrored, buffer, }?: {
    littleEndian: boolean;
    circular: boolean;
    byteOffset: number;
    byteLength: number;
    useFloat32: boolean;
    useUTF16: boolean;
    mirrored: any[];
}): (value: any, into?: boolean | ArrayBufferLike) => Uint8Array | number;
export class Encoder {
    constructor(options?: {
        littleEndian: boolean;
        circular: boolean;
        byteOffset: number;
        byteLength: number;
        useFloat32: boolean;
        useUTF16: boolean;
        mirrored: any[];
    });
    encode: (value: any, into?: boolean | ArrayBufferLike) => Uint8Array | number;
}
