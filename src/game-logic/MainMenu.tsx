import React from "react";
import { GameState } from "../App";
import { MainCanvas } from "../canvas/MainCanvas";
import { createPixel, Operation, Tile } from "./GameLogic";
import "./MainMenu.css";

export function MainMenu(props: {
    gameState: GameState,
    setGameState: (s: GameState) => void
}) {

    const width=256;
    const height=256;

    const pixels = new Uint32Array((new Array(256 * 256)).fill(0).map((e,i) => {
        return [0, 0, 0, 0].map(e => Math.floor(Math.random() * (2 ** 31)))}).flat());

    return <React.Fragment>
        <MainCanvas
            isEditor={false}
            initLevel={{
                width, height, pixels,
                topleft: [0.2, 0.2],
                bottomright: [0.3, 0.3]
            }}
        ></MainCanvas>
        <div className="main-menu">
            <header>
                <h1>MATH MACHINES</h1>
                <p>The math-based Factorio ripoff built out of fragment shaders.</p>
            </header>
            <div className="main-menu-options">
                <button
                    onClick={e => {
                        props.setGameState(GameState.LEVEL_EDITOR);
                    }}
                >Level Editor</button>
            </div>
        </div>
    </React.Fragment>
}