import { Dir } from "fs";
import React, { Fragment } from "react";
import { useEffect, useRef, useState } from "react";
import { GameState } from "../App";
import { loadImage } from "../canvas/Hooks";
import { Direction, Operation, PixelProperties, Tile } from "./GameLogic";
import { Level } from "./Level";

import "./Settings.css"

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
    min: number,
    max: number,
    step?: number,
    setVal: (s: number) => void
} & React.HTMLAttributes<HTMLInputElement>) {
    return <input
        type="number"
        {...removeAttribs(props, "val", "setVal")}
        onInput={e => {
            const truncatedNum = props.step
                ? Math.floor(Number(e.currentTarget.value) / props.step) * props.step
                : Number(e.currentTarget.value);
            props.setVal(Math.max(props.min, Math.min(props.max, truncatedNum)));
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

export function TileTypeButton(props: {
    tile: Tile,
    name: string,
    x: number,
    y: number,
    ctile: Tile,
    set: (tile: Tile) => void
}) {
    const canvasRef = useRef<HTMLCanvasElement | undefined>();
    const [img, setImg] = useState<HTMLImageElement | undefined>();
    useEffect(() => {
        (async () => {
            if (!img) {
                setImg(await loadImage("./assets.png"));
            }
        })();
    }, []);

    useEffect(() => {
        if (!img) return;
        canvasRef.current
        ?.getContext("2d")?.drawImage(img, props.x, props.y, 16, 16,  0, 0, 50, 50);
    }, [img, canvasRef]);

    return <button onClick={() => props.set(props.tile)} className={
        (props.tile == props.ctile) ? "tile-type-button set-tile-type-button" : "tile-type-button"
    }>
        <canvas width="50" height="50" ref={e => canvasRef.current = e ?? undefined}>
        </canvas>
        <span>{props.name}</span>
    </button>
}

export function TileTypeSelector(props: {
    val: Tile,
    setVal: (tile: Tile) => void,
    isEditor: boolean
}) {
    return <div className="tile-type-selector">
        <TileTypeButton 
            name={"None"} tile={Tile.NONE}
            x={0} y={48} 
            set={props.setVal} ctile={props.val}
        ></TileTypeButton>
        <TileTypeButton 
            name={"Conveyor"} tile={Tile.CONVEYOR}
            x={0} y={16} 
            set={props.setVal} ctile={props.val}
        ></TileTypeButton>
        <TileTypeButton 
            name={"Grabber"} tile={Tile.GRABBER}
            x={64} y={16} 
            set={props.setVal} ctile={props.val}
        ></TileTypeButton>
        <TileTypeButton 
            name={"Converter"} tile={Tile.CONVERTER}
            x={16} y={16} 
            set={props.setVal} ctile={props.val}
        ></TileTypeButton>
        {
            props.isEditor ? 
            <React.Fragment>
                <TileTypeButton 
                    name={"Input"} tile={Tile.INPUT}
                    x={32} y={16} 
                    set={props.setVal} ctile={props.val}
                ></TileTypeButton>
                <TileTypeButton 
                    name={"Output"} tile={Tile.OUTPUT}
                    x={48} y={16} 
                    set={props.setVal} ctile={props.val}
                ></TileTypeButton>
                <TileTypeButton 
                    name={"Complete"} tile={Tile.COMPLETE}
                    x={80} y={16} 
                    set={props.setVal} ctile={props.val}
                ></TileTypeButton>
                <TileTypeButton 
                    name={"Wall"} tile={Tile.WALL}
                    x={16} y={48} 
                    set={props.setVal} ctile={props.val}
                ></TileTypeButton>
            </React.Fragment> : undefined
        }
    </div>
}





export function Settings(props: {
    tileToPlaceRef: React.MutableRefObject<PixelProperties>
    setGameState: (g: GameState) => void,
    downloadLevel: () => void,
    uploadLevel: (level: Level) => void,
    testLevel: () => void,
    goBack: () => void,
    isEditor: boolean,
    isTrying: boolean,
    toggleIsTrying: () => void
}) {

    const [settings, setSettings] = useState<PixelProperties>({
        type: Tile.CONVERTER,
        num: 1,
        has_num: false,
        grabber_length: 3,
        score: 0,
        required_score: 10,
        direction: Direction.UP,
        operation: Operation.ADD,
        editable: false
    });
    const set = propSetterSetter(settings, setSettings);

    useEffect(() => {
        props.tileToPlaceRef.current = settings;
    }, [settings]);

    let associatedTileSettings = <p></p>;

    const dirEditor = <EnumInput
        alternatives={[
            [Direction.UP, "Up"],
            [Direction.DOWN, "Down"],
            [Direction.LEFT, "Left"],
            [Direction.RIGHT, "Right"],
        ]}
        val={settings.direction}
        setVal={set("direction")}
    ></EnumInput>

    const numberEditors = <Fragment>
        <label>Number</label>
        <NumberInput
            min={0}
            max={32767}
            step={1}
            val={settings.num}
            setVal={set("num")}
        ></NumberInput>
        <label>Has number?</label>
        <BooleanInput
            val={settings.has_num}
            setVal={set("has_num")}
        ></BooleanInput>
    </Fragment>

    switch (settings.type) {
    case Tile.CONVEYOR:
        associatedTileSettings = dirEditor;
        break;
    case Tile.GRABBER:
        associatedTileSettings = <Fragment>
            {dirEditor}
        <label>Grabber Length</label>
        <NumberInput
            min={2}
            max={4}
            step={1}
            val={settings.grabber_length}
            setVal={set("grabber_length")}
        ></NumberInput>
        </Fragment>
        break;
    case Tile.INPUT:
        associatedTileSettings = numberEditors;
        break;
    case Tile.OUTPUT:
        associatedTileSettings = <Fragment>
            {numberEditors}
            <label>Score</label>
            <NumberInput
                min={0}
                max={255}
                step={1}
                val={settings.score}
                setVal={set("score")}
            ></NumberInput>
            <label>Required Score</label>
            <NumberInput
                min={0}
                max={255}
                step={1}
                val={settings.required_score}
                setVal={set("required_score")}
            ></NumberInput>
        </Fragment>
        break;
    case Tile.CONVERTER:
        associatedTileSettings = <Fragment>
            {dirEditor}
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
        </Fragment>
        break;
    }

    if (props.isTrying) {
        return <div className="settings">
            <div className="settings-group">
                <button
                    onClick={e => {
                        props.toggleIsTrying();
                    }}
                >Go Back</button>
            </div>
        </div>
    }

    return <div className="settings">
        <div className="settings-group">
            <TileTypeSelector
                isEditor={props.isEditor}
                val={settings.type}
                setVal={tileType => {
                    setSettings({
                        ...settings,
                        type: tileType,
                        editable: tileType == Tile.CONVEYOR
                        || tileType == Tile.NONE
                        || tileType == Tile.GRABBER
                        || tileType == Tile.CONVERTER,
                        has_num: tileType == Tile.INPUT || tileType == Tile.OUTPUT
                    });
                }}
            ></TileTypeSelector>
        </div>
        <div className="settings-group">
            {associatedTileSettings}
        </div>
        { props.isEditor ? 
        <React.Fragment>
            <div className="settings-group">
                <button
                    onClick={e => {
                        props.testLevel();
                    }}
                >Play Level</button>
                <button
                    onClick={e => {
                        props.downloadLevel();
                    }}
                >Save Level</button>
            </div>
            <div className="settings-group">
                <button
                    onClick={e => {
                        props.setGameState(GameState.MENU);
                    }}
                >Back to Main Menu</button>
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
        </React.Fragment> :
        <React.Fragment>
            <div className="settings-group">
                <button
                    onClick={e => {
                        props.toggleIsTrying();
                    }}
                >Try Solution</button>
            </div>
            <div className="settings-group">
                <button
                    onClick={e => {
                        props.goBack();
                    }}
                >Go Back</button>
            </div>
        </React.Fragment>
        }
    </div>
}