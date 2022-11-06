import React, { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { MainCanvas } from './canvas/MainCanvas'
import { createPixel, Direction, Operation, PixelProperties, Tile } from './game-logic/GameLogic';
import { Settings } from './game-logic/Settings';
import { MainMenu } from './game-logic/MainMenu';
import { Level } from './game-logic/Level';

export enum GameState {
  MENU, GAME_EDITOR, LEVEL_EDITOR, GAME_RUNNING
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
          editable: true
      });
    }).flat())
  });

  const downloadLevelRef = useRef(false);
  const forceRefreshRef = useRef(false);
  const cacheLevelRef = useRef(false);
  const shouldCachePlayLevelRef = useRef(false);

  const [cachedEditorLevel, setCachedEditorLevel] = useState<Level | undefined>();
  const cachedEditorLevelRef = useRef<Level | undefined>();
  useEffect(() => {
    cachedEditorLevelRef.current = cachedEditorLevel;
  }, [cachedEditorLevel]);


  const [cachedPlayLevel, setCachedPlayLevel] = useState<Level | undefined>();
  const cachedPlayLevelRef = useRef<Level | undefined>();
  useEffect(() => {
    cachedPlayLevelRef.current = cachedPlayLevel;
  }, [cachedPlayLevel]);


  function loadLevel(level: Level) {
    forceRefreshRef.current = true;
    setGameInit({
      width: level.width,
      height: level.height,
      pixels: new Uint32Array(level.data)
    });
  }

  const isInLevelEditor = useRef<boolean>(false);

  function levelDone() {
    console.log("loading cached editor level!");
    setGameState(isInLevelEditor ? GameState.LEVEL_EDITOR : GameState.GAME_EDITOR);
    if (cachedEditorLevelRef.current) loadLevel(cachedEditorLevelRef.current);
  }

  return (
    <div className="App">
      {gameState == GameState.MENU 
        ? <MainMenu
          gameState={gameState}
          setGameState={setGameState}
        ></MainMenu>
        : <React.Fragment>
            <MainCanvas 
              isTrying={gameState == GameState.GAME_RUNNING}
              notifyLevelComplete={() => {
                window.alert("You completed the level!");
                levelDone();
              }}
              isEditor={gameState == GameState.LEVEL_EDITOR}
              cacheLevel={l => {
                setCachedEditorLevel(l);
                setGameState(GameState.GAME_EDITOR);
              }}
              cacheLevelRef={cacheLevelRef}
              cachePlayLevel={l => {
                setCachedPlayLevel(l);
                setGameState(GameState.GAME_RUNNING);
              }}
              cachePlayLevelRef={shouldCachePlayLevelRef}
              forceRefreshRef={forceRefreshRef}
              downloadLevelRef={downloadLevelRef}
              initLevel={gameInit} tileToPlaceRef={tileToPlaceRef}
            ></MainCanvas>
            <Settings
              testLevel={() => {
                cacheLevelRef.current = true;
              }}
              isEditor={gameState == GameState.LEVEL_EDITOR}
              isTrying={gameState == GameState.GAME_RUNNING}
              toggleIsTrying={() => {
                if (gameState == GameState.GAME_RUNNING) {
                  if (cachedPlayLevelRef.current) loadLevel(cachedPlayLevelRef.current);
                  setGameState(GameState.GAME_EDITOR);
                } else {
                  shouldCachePlayLevelRef.current = true;
                  setGameState(GameState.GAME_RUNNING);
                }
              }}
              downloadLevel={() => {
                downloadLevelRef.current = true;
              }}
              uploadLevel={(level: Level) => {
                loadLevel(level);
              }}
              goBack={() => {
                levelDone();
              }}
              setGameState={setGameState}
            tileToPlaceRef={tileToPlaceRef}></Settings>
          </React.Fragment>
      }
    </div>
  )
}

export default App
