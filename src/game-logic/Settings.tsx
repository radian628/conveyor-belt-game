import { Dir } from "fs";
import { useEffect, useState } from "react";
import { GameState } from "../App";
import { Direction, Operation, PixelProperties, Tile } from "./GameLogic";
import { Level } from "./Level";

export function noUndefined<T>(obj: T): { [K in keyof T]: Exclude<T[K], undefined> } {
    //@ts-ignore
    return Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined));
}

export function removeAttribs<T, K extends (keyof T)[]>(obj: T, ...props: K): Omit<T, K[number]> {
    let objCopy = { ...obj };
    for (let key of props) {
        delete objCopy[key];
    }
    return objCopy;
}

export function StringInput(props: {
    val: string,
    setVal: (s: string) => void
} & React.HTMLAttributes<HTMLInputElement>) {
    return <input
        {...removeAttribs(props, "val", "setVal")}
        onInput={e => {
            props.setVal(e.currentTarget.value);
        }}
        value={props.val}
    ></input>
}


export function NumberInput(props: {
    val: number,
    setVal: (s: number) => void
} & React.HTMLAttributes<HTMLInputElement>) {
    return <input
        {...removeAttribs(props, "val", "setVal")}
        onInput={e => {
            props.setVal(Number(e.currentTarget.value));
        }}
        value={props.val.toString()}
    ></input>
}

function BooleanInput(props: {
    val: boolean,
    setVal: (s: boolean) => void
} & React.HTMLAttributes<HTMLInputElement>) {
    return <input
        type="checkbox"
        {...removeAttribs(props, "val", "setVal")}
        onChange={e => {
            props.setVal(e.currentTarget.checked);
        }}
        checked={props.val}
    ></input>
}

export function EnumInput<T>(props: {
    alternatives: [T, string][]
    val: T,
    setVal: (t: T) => void 
}) {
    const [strValue, setStrValue] 
        = useState(props.alternatives.find(([value, label]) => value == props.val)?.[1] ?? "");

    useEffect(() => {
        props.setVal(props.alternatives.find(([value, label]) => label == strValue)?.[0] ?? props.val);
    }, [strValue]);

    return <select
        value={strValue}
        onChange={e => {
            setStrValue(e.currentTarget.value);
        }}
    >
        {props.alternatives.map(([altVal, altName], i) => {
            return <option key={altName} value={altName}>{altName}</option>
        })}
    </select>
}

function propSetterSetter<T extends object>(obj: T, setter: (t: T) => void) {
    return <U extends keyof T>(key: keyof T) => {
        return (v: T[U]) => {
            setter({
                ...obj, [key]: v
            });
        }
    }
}


export function Settings(props: {
    tileToPlaceRef: React.MutableRefObject<PixelProperties>
    setGameState: (g: GameState) => void,
    downloadLevel: () => void,
    uploadLevel: (level: Level) => void
}) {

    const [settings, setSettings] = useState<PixelProperties>({
        type: Tile.CONVERTER,
        num: 1,
        has_num: false,
        grabber_length: 0,
        score: 0,
        required_score: 0,
        direction: Direction.UP,
        operation: Operation.ADD
    });
    const set = propSetterSetter(settings, setSettings);

    useEffect(() => {
        props.tileToPlaceRef.current = settings;
    }, [settings]);

    return <div className="settings">
        <EnumInput
            alternatives={[
                [Tile.CONVERTER, "Converter"],
                [Tile.CONVEYOR, "Conveyor"],
                [Tile.GRABBER, "Grabber"],
                [Tile.INPUT, "Input"],
                [Tile.OUTPUT, "Output"],
                [Tile.NONE, "None"],
                [Tile.WALL, "Wall"],
                [Tile.COMPLETE, "Complete"]
            ]}
            val={settings.type}
            setVal={set("type")}
        ></EnumInput>
        <label>Number</label>
        <NumberInput
            val={settings.num}
            setVal={set("num")}
        ></NumberInput>
        <label>Has number?</label>
        <BooleanInput
            val={settings.has_num}
            setVal={set("has_num")}
        ></BooleanInput>
        <label>Grabber Length</label>
        <NumberInput
            val={settings.grabber_length}
            setVal={set("grabber_length")}
        ></NumberInput>
        <label>Score</label>
        <NumberInput
            val={settings.score}
            setVal={set("score")}
        ></NumberInput>
        <label>Required Score</label>
        <NumberInput
            val={settings.required_score}
            setVal={set("required_score")}
        ></NumberInput>
        <EnumInput
            alternatives={[
                [Direction.UP, "Up"],
                [Direction.DOWN, "Down"],
                [Direction.LEFT, "Left"],
                [Direction.RIGHT, "Right"],
            ]}
            val={settings.direction}
            setVal={set("direction")}
        ></EnumInput>
        <EnumInput
            alternatives={[
                [Operation.ADD, "Add"],
                [Operation.SUB, "Subtract"],
                [Operation.MUL, "Multiply"],
                [Operation.DIV, "Divide"],
            ]}
            val={settings.operation}
            setVal={set("operation")}
        ></EnumInput>
        <button
            onClick={e => {
                props.setGameState(GameState.MENU);
            }}
        >Back to Main Menu</button>
        <button
            onClick={e => {
                props.downloadLevel();
            }}
        >Save Level</button>
        <button
            onClick={e => {
                const input = document.createElement("input");
                input.type = "file";
                input.onchange = async e => {
                    const file = (e.currentTarget as any as HTMLInputElement)?.files?.[0];
                    if (!file) return;
                    try {
                        const parsedFile = JSON.parse(await file.text());
                        if (typeof parsedFile.width != "number") throw "no width";
                        if (typeof parsedFile.height != "number") throw "no height";
                        if (!Array.isArray(parsedFile.data)) throw "no pixels";
                        props.uploadLevel(parsedFile as Level);
                    } catch (err) {
                        window.alert("Failed to upload level: " + JSON.stringify(err));
                    }
                }
                input.click();
            }}
        >Upload Level</button>
    </div>
}