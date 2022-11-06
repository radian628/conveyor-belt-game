import { createRef, useEffect, useRef } from "react";
import { getProgramFromStrings, bindProgram, setUniforms, Matrix4 } from "../webgl-helpers/Shader";
import { bindBuffer, createBufferWithData } from "../webgl-helpers/Buffer";
import { bindVertexArray, createVertexArray } from "../webgl-helpers/VertexArray";
import { useAnimationFrame, useWebGLState } from "./Hooks";
import { mat4, vec3 } from "gl-matrix";
import { useInput } from "./Input";
import { bindTexture } from "../webgl-helpers/Texture";
import { bindFramebuffer } from "../webgl-helpers/Framebuffer";



export function MainCanvas() {
    const canvasRef = createRef<HTMLCanvasElement>();

    const inputRef = useInput(canvasRef);

    const rotationRef = useRef({ x: 0, y: 0 });

    const positionRef = useRef(vec3.fromValues(-3.5, -3.5, -3.5))

    const timeRef = useRef(0);

    const glState = useWebGLState(canvasRef, (time, gls) => {
        timeRef.current++;

        const currentRotation = 
        mat4.mul(
            mat4.create(),
            mat4.rotateX(mat4.create(), mat4.create(), rotationRef.current.y * 0.01),
            mat4.rotateY(mat4.create(), mat4.create(), rotationRef.current.x * 0.01),
        );

        const translation = vec3.fromValues(0, 0, 0);
        const k = inputRef.current.keysDown;
        if (k.W) vec3.add(translation, translation, vec3.fromValues(0, 0, 1));
        if (k.A) vec3.add(translation, translation, vec3.fromValues(1, 0, 0));
        if (k.S) vec3.add(translation, translation, vec3.fromValues(0, 0, -1));
        if (k.D) vec3.add(translation, translation, vec3.fromValues(-1, 0, 0));
        if (k.SHIFT) vec3.add(translation, translation, vec3.fromValues(0, 1, 0));
        if (k[" "]) vec3.add(translation, translation, vec3.fromValues(0, -1, 0));

        vec3.transformMat4(translation, translation, mat4.transpose(mat4.create(), currentRotation));
        vec3.scale(translation, translation, 0.1);

        vec3.add(positionRef.current, positionRef.current, translation);
        
        vec3.transformMat4(translation, translation, currentRotation);
        rotationRef.current.x += inputRef.current.mouseDeltas.x;
        rotationRef.current.y += inputRef.current.mouseDeltas.y;
        inputRef.current.mouseDeltas.x = 0;
        inputRef.current.mouseDeltas.y = 0;

        const gl = gls.gl;
        //gl.enable(gl.DEPTH_TEST);
        //gl.enable(gl.CULL_FACE);
        bindFramebuffer(gl, gl.DRAW_FRAMEBUFFER, null);
        bindFramebuffer(gl, gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // bindProgram(gl, gls.program);
        // bindVertexArray(gl, gls.vao);
        // setUniforms(gl, gls.program, {
        //     vp: 
        //         Array.from(mat4.mul(    
        //             mat4.create(),
        //             mat4.mul(
        //                 mat4.create(),
        //                 mat4.perspective(mat4.create(), 2, window.innerWidth / window.innerHeight, 0.1, 1000),
        //                 currentRotation
        //             ),
        //             mat4.translate(mat4.create(), mat4.create(), positionRef.current)
        //         ).map(e => e)) as Matrix4

        // });
        // gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);

        bindTexture(gl, gl.TEXTURE_2D, 0, gls.prevFramebuffer.attachments[0].tex);
        bindTexture(gl, gl.TEXTURE_2D, 1, gls.gameAssetsTexture);

        bindProgram(gl, gls.gameDisplayProgram);
        bindVertexArray(gl, gls.gameDisplayVAO);
        setUniforms(gl, gls.gameDisplayProgram, {
            topleft: [0.0, 0.0],
            bottomright: [0.5, 0.5],
            in_tex: [0, "i"],
            game_textures: [1, "i"]
        });
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (timeRef.current % 100 == 90) {

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
            //bindFramebuffer(gl, gl.READ_FRAMEBUFFER, null);
            bindFramebuffer(gl, gl.DRAW_FRAMEBUFFER, gls.currentFramebuffer.framebuffer);
            setUniforms(gl, gls.gameLogicProgram, {
                in_tex: [0, "i"],
            });
            gl.drawArrays(gl.TRIANGLES, 0, 6);

        }
    });

    if (!glState.glStatus.ok) {
        return <p>{glState.glStatus.data}</p>;
    }

    return <canvas
        id="main-canvas"
        ref={canvasRef}
        width={glState.windowSize[0]}
        height={glState.windowSize[1]}
    ></canvas>
}