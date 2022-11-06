import COMMON_GLSL from "../canvas/common.glsl?raw";

export type PixelState = {
    channel: 0 | 1 | 2 | 3;
    start: number;
    end: number;
};

export enum Tile {
    NONE = 0,
    CONVEYOR = 1,
    GRABBER = 2,
    CONVERTER = 3,
    INPUT = 4,
    OUTPUT = 5,
    WALL = 6,
    COMPLETE = 7
};

export enum Direction {
    UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3
};

export enum Operation {
    ADD = 0, SUB = 1, MUL = 2, DIV = 3
}

export type PixelProperties = {
    type: Tile,
    direction: Direction,
    grabber_length: number,
    operation: Operation,
    has_num: boolean,
    num: number,
    score: number,
    required_score: number
};

export type PixelSpecification = Map<string, PixelState>;

export function getPixelSpec(str: string) {
    const splitStr = str.match(/\/\/METAPROGRAMMING_START[\w\W]*?\/\/METAPROGRAMMING_END/g)?.[0].split("\n");
    if (!splitStr) {
        window.alert("failed to get pixel specification");
        throw "";
    }

    const spec: PixelSpecification = new Map();
    for (const line of splitStr) {
        const args = line.match(/\([\w\W]*?\)/g)?.[0].slice(1, -1).split(",").map(s => s.replace(/ /g, ""));
        if (!args) continue;
        const name = args[0].slice(2);
        const channel = "rgba".split("").indexOf(args[2]) as 0 | 1 | 2 | 3;
        const start = Number(args[3].slice(0, -1));
        const end = Number(args[4].slice(0, -1));
        spec.set(name, {
            channel, start, end
        });
    }
    return spec;
}


export function makePixel(p: PixelProperties, spec: PixelSpecification): 
[number, number, number, number] {
    const out = [0, 0, 0, 0] as [number, number, number, number];
    for (let [k, v] of Object.entries(p)) {
        const specEntry = spec.get(k);
        if (specEntry) {
            out[specEntry.channel] +=
                +v << (specEntry.start - 1);
        }
    }
    return out;
}


const pspec = getPixelSpec(COMMON_GLSL);
export function createPixel(p: PixelProperties) {
    return makePixel(p, pspec);
}