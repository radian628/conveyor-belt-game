import React, { createRef, useEffect, useRef } from "react";
import { getProgramFromStrings, bindProgram, setUniforms, Matrix4 } from "../webgl-helpers/Shader";
import { bindBuffer, createBufferWithData } from "../webgl-helpers/Buffer";
import { bindVertexArray, createVertexArray } from "../webgl-helpers/VertexArray";
import { useAnimationFrame, useWebGLState } from "./Hooks";
import { mat4, vec3 } from "gl-matrix";
import { useInput } from "./Input";
import { bindTexture } from "../webgl-helpers/Texture";
import { bindFramebuffer } from "../webgl-helpers/Framebuffer";
import { createPixel, decodePixel, Direction, makePixel, Operation, PixelProperties, Tile } from "../game-logic/GameLogic";
import { Level } from "../game-logic/Level";

import { saveAs } from "file-saver";


let wrapper = 0;

export function MainCanvas(props: {
    tileToPlaceRef?: React.MutableRefObject<PixelProperties>,
    initLevel: {
        pixels: Uint32Array,
        width: number, 
        height: number,
        topleft?: [number, number],
        bottomright?: [number, number]
    },
    cacheLevel?: (level: Level) => void,
    cachePlayLevel?: (level: Level) => void,
    cacheLevelRef?: React.MutableRefObject<boolean>,
    cachePlayLevelRef?: React.MutableRefObject<boolean>,
    downloadLevelRef?: React.MutableRefObject<boolean>,
    forceRefreshRef?: React.MutableRefObject<boolean>,
    isEditor: boolean,
    isTrying: boolean,
    notifyLevelComplete: () => void
}) {
    wrapper = 1 - wrapper;
    const canvasRef = useRef<HTMLCanvasElement>();

    const initLevelRef = useRef(props.initLevel);
    useEffect(() => {
        initLevelRef.current = props.initLevel;
    }, [props.initLevel]);

    const isEditorRef = useRef(props.isEditor);
    useEffect(() => {
        isEditorRef.current = props.isEditor;
    }, [props.isEditor]);

    const isTryingRef = useRef(props.isTrying);
    useEffect(() => {
        isTryingRef.current = props.isTrying;
    }, [props.isTrying]);

    const inputRef = useInput(canvasRef);

    const gameStateRef = useRef({
        topleft: props.initLevel.topleft ?? [0.0, 0.0] as [number, number],
        bottomright: props.initLevel.bottomright ?? [0.1, 0.1] as [number, number]
    });
    useEffect(() => {
        const resize = () => {
            const dy = gameStateRef.current.bottomright[1] - gameStateRef.current.topleft[1];
            const avgx = (gameStateRef.current.bottomright[0] + gameStateRef.current.topleft[0]) / 2;
            const aspect = window.innerWidth / window.innerHeight;
            gameStateRef.current.topleft[0] = avgx - dy/2 * aspect;
            gameStateRef.current.bottomright[0] = avgx + dy/2 * aspect;
            console.log("got here");
        };
        window.addEventListener("resize", resize);
        resize();
    }, []);

    const timeRef = useRef(0);

    const glState = useWebGLState(canvasRef, 
    initLevelRef,
    props.forceRefreshRef,
    (time, gls) => {
        const gl = gls.gl;

        function getAllPixels() {

            bindTexture(gl, gl.TEXTURE_2D, 0, gls.currentFramebuffer.attachments[0].tex);
            const pixelsDst = new Uint32Array(
                gls.currentFramebuffer.attachments[0].width
                * gls.currentFramebuffer.attachments[0].height
                * 4
            );
             gl.readPixels(0, 0, 
                gls.currentFramebuffer.attachments[0].width,
                gls.currentFramebuffer.attachments[0].height,
                gl.RGBA_INTEGER,
                gl.UNSIGNED_INT,
                pixelsDst
            );

            return pixelsDst;
        }

        if (props.downloadLevelRef && props.downloadLevelRef.current) {
            props.downloadLevelRef.current = false;
            const pixelsDst = getAllPixels();

            const level: Level = {
                width: gls.currentFramebuffer.attachments[0].width,
                height: gls.currentFramebuffer.attachments[0].height,
                data: Array.from(pixelsDst)
            }

            saveAs(new Blob([JSON.stringify(level)]), "level.mathmachine");
        }
        if (props.cacheLevelRef && props.cacheLevelRef.current) {
            console.log("caching level...")
            props.cacheLevelRef.current = false;
            const pixelsDst = getAllPixels();

            const level: Level = {
                width: gls.currentFramebuffer.attachments[0].width,
                height: gls.currentFramebuffer.attachments[0].height,
                data: Array.from(pixelsDst)
            }

            if (props.cacheLevel) props.cacheLevel(level);
        }
        if (props.cachePlayLevelRef && props.cachePlayLevelRef.current) {
            console.log("caching level...")
            props.cachePlayLevelRef.current = false;
            const pixelsDst = getAllPixels();

            const level: Level = {
                width: gls.currentFramebuffer.attachments[0].width,
                height: gls.currentFramebuffer.attachments[0].height,
                data: Array.from(pixelsDst)
            }

            if (props.cachePlayLevel) props.cachePlayLevel(level);
        }

        timeRef.current++;
        const xSize = gameStateRef.current.bottomright[0] - gameStateRef.current.topleft[0];
        const ySize = gameStateRef.current.bottomright[1] - gameStateRef.current.topleft[1];

        if (
            inputRef.current.downMouseDeltas.x != 0
            || inputRef.current.downMouseDeltas.y != 0
        ) {

            const deltaX = -inputRef.current.downMouseDeltas.x / window.innerWidth * xSize;
            const deltaY = inputRef.current.downMouseDeltas.y / window.innerHeight * ySize;

            gameStateRef.current.bottomright[0] += deltaX;
            gameStateRef.current.topleft[0] += deltaX;
            gameStateRef.current.bottomright[1] += deltaY;
            gameStateRef.current.topleft[1] += deltaY;

            inputRef.current.downMouseDeltas.x = 0;
            inputRef.current.downMouseDeltas.y = 0;
        }

        if (inputRef.current.wheelDelta != 0) {
            const xAvg = (gameStateRef.current.bottomright[0] + gameStateRef.current.topleft[0]) / 2;
            const yAvg = (gameStateRef.current.bottomright[1] + gameStateRef.current.topleft[1]) / 2;
            const sf = (1 + Math.sign(inputRef.current.wheelDelta) * 0.1);
            const xScaleDelta = sf * xSize / 2;
            const yScaleDelta = sf * ySize / 2;

            gameStateRef.current.bottomright[0] = xAvg + xScaleDelta;
            gameStateRef.current.topleft[0] = xAvg - xScaleDelta;
            gameStateRef.current.bottomright[1] = yAvg + yScaleDelta;
            gameStateRef.current.topleft[1] = yAvg - yScaleDelta;

            inputRef.current.wheelDelta = 0;
        }

        const worldMouseX = inputRef.current.mousePos.x / window.innerWidth * xSize
            + gameStateRef.current.topleft[0];
        const worldMouseY = (1 - inputRef.current.mousePos.y / window.innerHeight) * ySize
            + gameStateRef.current.topleft[1];

       
        if (inputRef.current.isMouseDown[2] && props.tileToPlaceRef) {
            const gameMouseX = Math.floor(worldMouseX * gls.currentFramebuffer.attachments[0].width);
            const gameMouseY = Math.floor(worldMouseY * gls.currentFramebuffer.attachments[0].height); 

            const outpixels = new Uint32Array(4);
            gl.readPixels(gameMouseX, gameMouseY, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, outpixels);
            const decodedPixel = decodePixel(Array.from(outpixels) as [number, number, number, number]);

            if ((decodedPixel.editable && !isTryingRef.current) || isEditorRef.current) {
                bindTexture(gl, gl.TEXTURE_2D, 0, gls.currentFramebuffer.attachments[0].tex);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, gameMouseX, gameMouseY, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, new Uint32Array(
                    createPixel(props.tileToPlaceRef.current)
                ));
            }

        }
        
        bindFramebuffer(gl, gl.DRAW_FRAMEBUFFER, null);
        bindFramebuffer(gl, gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        bindTexture(gl, gl.TEXTURE_2D, 0, gls.currentFramebuffer.attachments[0].tex);
        bindTexture(gl, gl.TEXTURE_2D, 1, gls.gameAssetsTexture);

        bindProgram(gl, gls.gameDisplayProgram);
        bindVertexArray(gl, gls.gameDisplayVAO);
        setUniforms(gl, gls.gameDisplayProgram, {
            topleft: gameStateRef.current.topleft,
            bottomright: gameStateRef.current.bottomright,
            in_tex: [0, "i"],
            game_textures: [1, "i"]
        });
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (timeRef.current % 20 == 10) {

            const gameGridWidth = gls.currentFramebuffer.attachments[0].width;
            const gameGridHeight = gls.currentFramebuffer.attachments[0].height;

            gl.viewport(0, 0, gameGridWidth, gameGridHeight);
            bindFramebuffer(gl, gl.DRAW_FRAMEBUFFER, gls.prevFramebuffer.framebuffer);
            bindFramebuffer(gl, gl.READ_FRAMEBUFFER, gls.currentFramebuffer.framebuffer);
            gl.blitFramebuffer(
                0, 0, gameGridWidth, gameGridHeight, 
                0, 0, gameGridWidth, gameGridHeight, 
                gl.COLOR_BUFFER_BIT, gl.NEAREST
            );

                bindProgram(gl, gls.gameLogicProgram);
                bindVertexArray(gl, gls.gameLogicVAO);
                
                bindTexture(gl, gl.TEXTURE_2D, 0, gls.prevFramebuffer.attachments[0].tex);
                bindFramebuffer(gl, gl.DRAW_FRAMEBUFFER, gls.currentFramebuffer.framebuffer);
                setUniforms(gl, gls.gameLogicProgram, {
                    in_tex: [0, "i"],
                });
            if (!isEditorRef.current && isTryingRef.current) {
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }

        }

        if (!isEditorRef.current && timeRef.current % 90 == 50) {
            let levelComplete = true;
            const pixels = getAllPixels();
            for (let i = 0; i < pixels.length; i+=4) {
                const parsedPixel = decodePixel([pixels[i+0], pixels[i+1], pixels[i+2], pixels[i+3]]);
                if (parsedPixel.type == Tile.OUTPUT) {
                    levelComplete = false;
                }
            }
            if (levelComplete) {
                props.notifyLevelComplete();
            }
        }
    });

    return <React.Fragment>
        {!glState.glStatus.ok && <p>{glState.glStatus.data}</p>}
    <canvas
        id="main-canvas"
        ref={elem => {
            canvasRef.current = elem ?? undefined;
        }}
        width={glState.windowSize[0]}
        height={glState.windowSize[1]}
    ></canvas></React.Fragment>
}