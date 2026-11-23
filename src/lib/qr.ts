/**
 * Gerador local de QR Code (ISO/IEC 18004 — Byte Mode, ECC Level L, Versões 1–12)
 * 100% offline/Edge (zero chamadas a APIs externas — conformidade LGPD).
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        GF_EXP[i] = x;
        GF_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
        GF_EXP[i] = GF_EXP[i - 255];
    }
})();

function gfMul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
        const next = new Uint8Array(poly.length + 1);
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= poly[j];
            next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
        }
        poly = next;
    }
    return poly;
}

function rsRemainder(data: Uint8Array, ecLen: number): Uint8Array {
    const gen = rsGeneratorPoly(ecLen);
    const rem = new Uint8Array(ecLen);
    for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ rem[0];
        for (let j = 0; j < ecLen - 1; j++) rem[j] = rem[j + 1];
        rem[ecLen - 1] = 0;
        if (factor !== 0) {
            for (let j = 0; j < ecLen; j++) {
                rem[j] ^= gfMul(gen[j + 1], factor);
            }
        }
    }
    return rem;
}

// Versões 1–12 (ECC Level L): [totalDataCodewords, ecPerBlock, numBlocksGroup1, dataPerBlockGroup1, numBlocksGroup2, dataPerBlockGroup2]
const VERSION_L_TABLE: Record<number, [number, number, number, number, number, number]> = {
    1: [19, 7, 1, 19, 0, 0],
    2: [34, 10, 1, 34, 0, 0],
    3: [55, 15, 1, 55, 0, 0],
    4: [80, 20, 1, 80, 0, 0],
    5: [108, 26, 1, 108, 0, 0],
    6: [136, 18, 2, 68, 0, 0],
    7: [156, 20, 2, 78, 0, 0],
    8: [194, 24, 2, 97, 0, 0],
    9: [232, 30, 2, 116, 0, 0],
    10: [274, 18, 2, 68, 2, 69],
    11: [324, 20, 4, 81, 0, 0],
    12: [370, 24, 2, 92, 2, 93]
};

const ALIGNMENT_CENTERS: Record<number, number[]> = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50],
    11: [6, 30, 54],
    12: [6, 32, 58]
};

function chooseVersion(byteLen: number): number {
    for (let v = 1; v <= 12; v++) {
        const capBits = VERSION_L_TABLE[v][0] * 8;
        const countBits = v < 10 ? 8 : 16;
        if (4 + countBits + byteLen * 8 <= capBits) return v;
    }
    return 12;
}

function buildCodewords(bytes: Uint8Array, version: number): Uint8Array {
    const [totalData, ecPerBlock, g1Count, g1Data, g2Count, g2Data] = VERSION_L_TABLE[version];
    const bits: number[] = [];
    const pushBits = (val: number, len: number) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };

    // Byte mode indicator (0100)
    pushBits(0b0100, 4);
    pushBits(bytes.length, version < 10 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

    const maxBits = totalData * 8;
    const termLen = Math.min(4, maxBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataBytes = new Uint8Array(totalData);
    let idx = 0;
    for (let i = 0; i < bits.length && idx < totalData; i += 8) {
        let b = 0;
        for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
        dataBytes[idx++] = b;
    }
    const pads = [0xec, 0x11];
    let padIdx = 0;
    while (idx < totalData) {
        dataBytes[idx++] = pads[padIdx++ % 2];
    }

    // Split into RS blocks
    const blocks: Uint8Array[] = [];
    const ecs: Uint8Array[] = [];
    let offset = 0;
    for (let i = 0; i < g1Count; i++) {
        const slice = dataBytes.subarray(offset, offset + g1Data);
        offset += g1Data;
        blocks.push(slice);
        ecs.push(rsRemainder(slice, ecPerBlock));
    }
    for (let i = 0; i < g2Count; i++) {
        const slice = dataBytes.subarray(offset, offset + g2Data);
        offset += g2Data;
        blocks.push(slice);
        ecs.push(rsRemainder(slice, ecPerBlock));
    }

    const totalCodewords = totalData + (g1Count + g2Count) * ecPerBlock;
    const out = new Uint8Array(totalCodewords);
    let outIdx = 0;
    const maxBlockLen = Math.max(g1Data, g2Data);
    for (let col = 0; col < maxBlockLen; col++) {
        for (let b = 0; b < blocks.length; b++) {
            if (col < blocks[b].length) out[outIdx++] = blocks[b][col];
        }
    }
    for (let col = 0; col < ecPerBlock; col++) {
        for (let b = 0; b < ecs.length; b++) {
            out[outIdx++] = ecs[b][col];
        }
    }
    return out;
}

function getFormatBitsL(mask: number): number {
    // ECC Level L = 01
    const data = (0b01 << 3) | mask;
    let rem = data << 10;
    const poly = 0x537;
    for (let i = 14; i >= 10; i--) {
        if ((rem >>> i) & 1) rem ^= poly << (i - 10);
    }
    return ((data << 10) | rem) ^ 0x5412;
}

function getVersionBits(version: number): number {
    let rem = version << 12;
    const poly = 0x1f25;
    for (let i = 17; i >= 12; i--) {
        if ((rem >>> i) & 1) rem ^= poly << (i - 12);
    }
    return (version << 12) | rem;
}

export function generateQrMatrix(text: string): boolean[][] {
    const bytes = new TextEncoder().encode(text);
    const version = chooseVersion(bytes.length);
    const size = version * 4 + 17;
    const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    const setFn = (r: number, c: number, dark: boolean) => {
        if (r < 0 || c < 0 || r >= size || c >= size) return;
        modules[r][c] = dark;
        isFunction[r][c] = true;
    };

    const drawFinder = (r0: number, c0: number) => {
        for (let dr = -1; dr <= 7; dr++) {
            for (let dc = -1; dc <= 7; dc++) {
                const r = r0 + dr;
                const c = c0 + dc;
                if (r < 0 || c < 0 || r >= size || c >= size) continue;
                const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
                const inBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
                const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
                setFn(r, c, inOuter && (inBorder || inCenter));
            }
        }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
        setFn(6, i, i % 2 === 0);
        setFn(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    const centers = ALIGNMENT_CENTERS[version];
    for (let i = 0; i < centers.length; i++) {
        for (let j = 0; j < centers.length; j++) {
            const r0 = centers[i];
            const c0 = centers[j];
            if (isFunction[r0][c0]) continue;
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const dist = Math.max(Math.abs(dr), Math.abs(dc));
                    setFn(r0 + dr, c0 + dc, dist !== 1);
                }
            }
        }
    }

    // Reserve format areas
    for (let i = 0; i <= 8; i++) {
        if (!isFunction[8][i]) setFn(8, i, false);
        if (!isFunction[i][8]) setFn(i, 8, false);
    }
    for (let i = size - 8; i < size; i++) {
        if (!isFunction[8][i]) setFn(8, i, false);
        if (!isFunction[i][8]) setFn(i, 8, false);
    }
    setFn(size - 8, 8, true); // Dark module

    // Version info (v >= 7)
    if (version >= 7) {
        const vBits = getVersionBits(version);
        for (let i = 0; i < 18; i++) {
            const bit = Boolean((vBits >>> i) & 1);
            const r = Math.floor(i / 3);
            const c = size - 11 + (i % 3);
            setFn(r, c, bit);
            setFn(c, r, bit);
        }
    }

    // Place data bits in zigzag
    const codewords = buildCodewords(bytes, version);
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    const mask = 0; // (r + c) % 2 === 0

    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
            for (let j = 0; j < 2; j++) {
                const c = right - j;
                const upward = ((right + 1) & 2) === 0;
                const r = upward ? size - 1 - vert : vert;
                if (!isFunction[r][c]) {
                    let dark = false;
                    if (bitIdx < totalBits) {
                        dark = Boolean((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1);
                        bitIdx++;
                    }
                    if ((r + c) % 2 === 0) dark = !dark;
                    modules[r][c] = dark;
                }
            }
        }
    }

    // Write format info (ISO/IEC 18004: MSB bit 14 at (8,0) and (size-1,8), LSB bit 0 at (0,8) and (8,size-1))
    const fmt = getFormatBitsL(mask);
    const fmtBit = (pos: number): boolean => Boolean((fmt >>> pos) & 1);

    // Copy 1 (top-left finder perimeter)
    for (let i = 0; i <= 5; i++) modules[8][i] = fmtBit(14 - i);
    modules[8][7] = fmtBit(8);
    modules[8][8] = fmtBit(7);
    modules[7][8] = fmtBit(6);
    for (let i = 0; i <= 5; i++) modules[i][8] = fmtBit(i);

    // Copy 2 (bottom-left vertical 7 bits + top-right horizontal 8 bits; preserves dark module at (size-8, 8))
    for (let i = 0; i < 7; i++) modules[size - 1 - i][8] = fmtBit(14 - i);
    for (let i = 0; i < 8; i++) modules[8][size - 8 + i] = fmtBit(7 - i);

    return modules;
}

export function renderQrCodeDataUri(text: string): string {
    if (!text) return '';
    const matrix = generateQrMatrix(text);
    const n = matrix.length;
    const quiet = 4;
    const total = n + quiet * 2;
    let paths = '';
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (matrix[r][c]) {
                paths += `M${c + quiet},${r + quiet}h1v1h-1z`;
            }
        }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#FFFFFF"/><path d="${paths}" fill="#000000"/></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
