import React, { useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { MainCanvas } from './canvas/MainCanvas'
import { createPixel, Direction, Operation, PixelProperties, Tile } from './game-logic/GameLogic';
import { Settings } from './game-logic/Settings';
import { MainMenu } from './game-logic/MainMenu';
import { Level } from './game-logic/Level';

export enum GameState {
  MENU, GAME, LEVEL_EDITOR
}

function App() {

  const tileToPlaceRef = useRef<PixelProperties>(
    {
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

  const [gameState, setGameState] = useState<GameState>(GameState.MENU);

  const [gameInit, setGameInit] = useState({
    width: 16,
    height: 16,
    pixels: new Uint32Array((new Array(16*16)).fill(0).map((e,i) => {
      return createPixel({
          type: Tile.NONE,
          direction: 0,
          grabber_length: 0,
          has_num: true,
          num: 1,
          operation: Operation.ADD,
          score: 0,
          required_score: 0,
          editable: false
      });
    }).flat())
  });

  const downloadLevelRef = useRef(false);
  const forceRefreshRef = useRef(false);

  return (
    <div className="App">
      {gameState == GameState.MENU 
        ? <MainMenu
          gameState={gameState}
          setGameState={setGameState}
        ></MainMenu>
        : <React.Fragment>
            <MainCanvas 
              isEditor={gameState == GameState.LEVEL_EDITOR}
            forceRefreshRef={forceRefreshRef}
            downloadLevelRef={downloadLevelRef}
            initLevel={gameInit} tileToPlaceRef={tileToPlaceRef}></MainCanvas>
            <Settings
              isEditor={gameState == GameState.LEVEL_EDITOR}
              downloadLevel={() => {
                downloadLevelRef.current = true;
              }}
              uploadLevel={(level: Level) => {
                forceRefreshRef.current = true;
                setGameInit({
                  width: level.width,
                  height: level.height,
                  pixels: new Uint32Array(level.data)
                });
              }}
              setGameState={setGameState}
            tileToPlaceRef={tileToPlaceRef}></Settings>
          </React.Fragment>
      }
    </div>
  )
}

export default App
