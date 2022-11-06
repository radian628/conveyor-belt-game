import { useEffect, useRef, useState } from "react";
import { err, ok, Result } from "../webgl-helpers/Common";
import VERT_SHADER from "./l-system.vert?raw";
import FRAG_SHADER from "./l-system.frag?raw";
import { getProgramFromStrings } from "../webgl-helpers/Shader";
import { createBuffer, createBufferWithData } from "../webgl-helpers/Buffer";
import { createVertexArray } from "../webgl-helpers/VertexArray";
import { mat4, vec3 } from "gl-matrix";
import { bindFramebuffer, createFramebufferWithAttachments, FramebufferWithAttachments } from "../webgl-helpers/Framebuffer";


import LOGIC_VERT from "./game-logic.vert?raw";
import LOGIC_FRAG from "./game-logic.frag?raw";
import DISPLAY_VERT from "./game-display.vert?raw";
import DISPLAY_FRAG from "./game-display.frag?raw";
import { bindTexture, createTexture, createTextureWithFormat } from "../webgl-helpers/Texture";

import gameAssets from "../assets/assets.png";

export function useAnimationFrame(callback: (time: number) => void) {

    const animFrameRef = useRef<number>(-1);
    const prevTimeRef = useRef<number>(0);

    const animate = (time: number) => {
        if (prevTimeRef.current) {
            const dt = time - prevTimeRef.current;
            callback(dt);
        }
        prevTimeRef.current = time;
        animFrameRef.current = requestAnimationFrame(animate);
    }

    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, []);
}



async function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = e => {
            resolve(img);
        }
        img.src = src;
    }) 
}



type WebGLState = {
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    squareBuffer: WebGLBuffer,
    vao: WebGLVertexArrayObject,

    cubeBuffer: WebGLBuffer,
    cubeIndexBuffer: WebGLBuffer,

    currentFramebuffer: FramebufferWithAttachments,
    prevFramebuffer: FramebufferWithAttachments,

    gameLogicProgram: WebGLProgram,
    gameDisplayProgram: WebGLProgram,

    gameAssetsTexture: WebGLTexture,

    gameLogicVAO: WebGLVertexArrayObject,
    gameDisplayVAO: WebGLVertexArrayObject,

    temporaryGameLogicTexture: WebGLTexture
}


async function createWebGLState(gl: WebGL2RenderingContext): Promise<Result<WebGLState, string>> {
    const program = getProgramFromStrings(gl, VERT_SHADER, FRAG_SHADER);
    if (!program.ok) return err("Failed to create shader program.");
    
    const buf = createBufferWithData(gl, new Float32Array([
        -1, -1, 1, -1, -1, 1, 
        1, -1, -1, 1, 1, 1
    ]).buffer, gl.STATIC_DRAW);
    if (!buf.ok) return (err("Failed to create buffer."));


    const cubeBuffer = createBufferWithData(gl, new Float32Array([
        0, 0, 0, -1, 0, 0,
        0, 1, 0, -1, 0, 0,
        0, 1, 1, -1, 0, 0,
        0, 0, 1, -1, 0, 0,
        
        1, 0, 0, 1, 0, 0,
        1, 1, 0, 1, 0, 0,
        1, 1, 1, 1, 0, 0,
        1, 0, 1, 1, 0, 0,
        
        0, 0, 0, 0, -1, 0,
        1, 0, 0, 0, -1, 0,
        1, 0, 1, 0, -1, 0,
        0, 0, 1, 0, -1, 0,
        
        0, 1, 0, 0, 1, 0,
        1, 1, 0, 0, 1, 0,
        1, 1, 1, 0, 1, 0,
        0, 1, 1, 0, 1, 0,

        0, 0, 0, 0, 0, -1,
        1, 0, 0, 0, 0, -1,
        1, 1, 0, 0, 0, -1,
        0, 1, 0, 0, 0, -1,

        0, 0, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1,
        1, 1, 1, 0, 0, 1,
        0, 1, 1, 0, 0, 1
    ]), gl.STATIC_DRAW);
    if (!cubeBuffer.ok) return err("Failed to create cube buffer");

    const cubeIndexBuffer = createBufferWithData(gl, new Uint8Array([
        1, 0, 2, 
        2, 0, 3,

        4, 5, 6, 
        4, 6, 7,

        8, 9, 10, 
        8, 10, 11,

        14, 13, 12, 
        14, 12, 15,

        17, 16, 18, 
        16, 19, 18,

        20, 21, 22, 
        20, 22, 23
    ]), gl.STATIC_DRAW, gl.ELEMENT_ARRAY_BUFFER);
    if (!cubeIndexBuffer.ok) return err("Failed to create cube index buffer");

    const framebufferSettings = {
        texture: {
            min: gl.NEAREST,
            mag: gl.NEAREST,
            swrap: gl.REPEAT,
            twrap: gl.REPEAT
        },
        format: {
            width: 64,
            height: 64,
            internalformat: gl.RGBA32UI,
            format: gl.RGBA_INTEGER,
            type: gl.UNSIGNED_INT
        }
    }

    const currentFramebuffer = createFramebufferWithAttachments(gl, [
        framebufferSettings
    ]);
    if (!currentFramebuffer.ok) return err("Failed to create current framebuffer");
    const prevFramebuffer = createFramebufferWithAttachments(gl, [
        framebufferSettings
    ]);
    if (!prevFramebuffer.ok) return err("Failed to create previous framebuffer");

    bindFramebuffer(gl, gl.FRAMEBUFFER, null);

    const v = createVertexArray(gl, program.data, {
        in_pos: {
            size: 3,
            type: gl.FLOAT,
            stride: 24,
            offset: 0,
            buffer: cubeBuffer.data
        },
        in_normal: {
            size: 3,
            type: gl.FLOAT,
            stride: 24,
            offset: 12,
            buffer: cubeBuffer.data
        }
    }, cubeIndexBuffer.data);
    if (!v.ok) return (err("Failed to create VAO."));



    const gameLogicProgram = getProgramFromStrings(gl, LOGIC_VERT, LOGIC_FRAG);
    if (!gameLogicProgram.ok) return err("Failed to create shader program.");

    const gameDisplayProgram = getProgramFromStrings(gl, DISPLAY_VERT, DISPLAY_FRAG);
    if (!gameDisplayProgram.ok) return err("Failed to create shader program.");

    const gameAssetsTexture = createTextureWithFormat(gl, {
        min: gl.LINEAR,
        mag: gl.LINEAR,
        swrap: gl.REPEAT,
        twrap: gl.REPEAT
    }, {
        type: gl.UNSIGNED_BYTE,
        internalformat: gl.RGBA,
        format: gl.RGBA,
        width: 256,
        height: 64,
        source: await loadImage("./public/assets.png")
    });
    if (!gameAssetsTexture.ok) return err("Failed to create assets texture.");


    const gameLogicVAO = createVertexArray(gl, gameLogicProgram.data, {
        pos: {
            size: 2,
            type: gl.FLOAT,
            offset: 0,
            stride: 0,
            buffer: buf.data
        }
    });
    if (!gameLogicVAO.ok) return err("Failed to create game logic VAO.");

    const gameDisplayVAO = createVertexArray(gl, gameDisplayProgram.data, {
        pos: {
            size: 2,
            type: gl.FLOAT,
            offset: 0,
            stride: 0,
            buffer: buf.data
        }
    });
    if (!gameDisplayVAO.ok) return err("Failed to create game display VAO.");

    const gameGridWidth = currentFramebuffer.data.attachments[0].width;
    const gameGridHeight = currentFramebuffer.data.attachments[0].height;

    const gameLogic = new Uint32Array((new Array(gameGridWidth * gameGridHeight * 4)).fill(0).map((e,i) => {
        return Math.floor(Math.random() * (2 ** 10));
    }));

    bindTexture(gl, gl.TEXTURE_2D, 0, currentFramebuffer.data.attachments[0].tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gameGridWidth, gameGridHeight, gl.RGBA_INTEGER, gl.UNSIGNED_INT, gameLogic);
    bindTexture(gl, gl.TEXTURE_2D, 0, prevFramebuffer.data.attachments[0].tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gameGridWidth, gameGridHeight, gl.RGBA_INTEGER, gl.UNSIGNED_INT, gameLogic);

    const temporaryGameLogicTexture = createTextureWithFormat(gl, {
        min: gl.NEAREST,
        mag: gl.NEAREST,
        swrap: gl.REPEAT,
        twrap: gl.REPEAT
    }, {
        width: gameGridWidth,
        height: gameGridHeight,
        internalformat: gl.RGBA32UI,
        type: gl.UNSIGNED_INT,
        format: gl.RGBA_INTEGER,
        source: gameLogic
    });
    if (!temporaryGameLogicTexture.ok) return err("Failed to create temp game logic texture.");



    return ok({
        gl,
        program: program.data,
        squareBuffer: buf.data,
        vao: v.data,

        cubeBuffer: cubeBuffer.data,
        cubeIndexBuffer: cubeIndexBuffer.data,

        currentFramebuffer: currentFramebuffer.data,
        prevFramebuffer: prevFramebuffer.data,

        gameLogicProgram: gameLogicProgram.data,
        gameDisplayProgram: gameDisplayProgram.data,
        gameAssetsTexture: gameAssetsTexture.data,

        gameLogicVAO: gameLogicVAO.data,
        gameDisplayVAO: gameDisplayVAO.data,

        temporaryGameLogicTexture: temporaryGameLogicTexture.data
    });
}



export function useWebGLState(
    canvasRef: React.RefObject<HTMLCanvasElement>, 
    callback: (time: number, gls: WebGLState) => void
): {
    glStatus: Result<undefined, string>,
    windowSize: [number, number]
} {
    const stateRef = useRef<WebGLState>();
    const [webGLError, setWebGLError] = useState<Result<undefined, string>>(ok(undefined));

    const [windowSize, setWindowSize] = useState<[number, number]>([window.innerWidth, window.innerHeight]);

    useEffect(() => {
        window.addEventListener("resize", e => {
            stateRef.current = undefined;
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        });
    })

    useAnimationFrame(async (time) => {
        const gl = canvasRef.current?.getContext("webgl2");
        if (!gl) return setWebGLError(err("Failed to create WebGL context."));

        if (!stateRef.current) {
            const state = await createWebGLState(gl);

            if (!state.ok) return setWebGLError(err(state.data));

            stateRef.current = state.data;
        }
        callback(time, stateRef.current);
    });
    return {
        glStatus: webGLError,
        windowSize
    };
}