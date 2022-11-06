import { useEffect, useRef, useState } from "react";

export function useInput(pointerLockRef: React.MutableRefObject<HTMLElement | undefined>) {
    
    const inputRef = useRef({
        keysDown: {} as { [key: string]: boolean },
        mouseDeltas: {
            x: 0, y: 0
        },
        downMouseDeltas: { x: 0, y: 0},
        mousePos: {
            x: 0, y: 0
        },
        isMouseDown: {} as {
            [key: number]: boolean
        },
        wheelDelta: 0
    });
    
    useEffect(() => {

        const wheel = (e: WheelEvent) => {
            inputRef.current.wheelDelta = e.deltaY;
        }
        document.addEventListener("wheel", wheel);

        const contextmenu = (e: Event) => {
            e.preventDefault();
            return false;
        }
        document.addEventListener("contextmenu", contextmenu);   

        const mousedown = (e: MouseEvent) => {
            inputRef.current.isMouseDown[e.button] = true;
        }
        document.addEventListener("mousedown", mousedown);

        const mouseup = (e: MouseEvent) => {
            inputRef.current.isMouseDown[e.button] = false;
        }
        document.addEventListener("mouseup", mouseup);
        
        const keydown = (e: KeyboardEvent) => {
            inputRef.current.keysDown[e.key.toUpperCase()] = true;
        }
        document.addEventListener("keydown", keydown);
        

        const keyup = (e: KeyboardEvent) => {
            inputRef.current.keysDown[e.key.toUpperCase()] = false;
        };
        document.addEventListener("keyup", keyup);


        const mousemove = (e: MouseEvent) => {
            inputRef.current.mousePos.x = e.clientX;
            inputRef.current.mousePos.y = e.clientY;
            inputRef.current.mouseDeltas.x += e.movementX;
            inputRef.current.mouseDeltas.y += e.movementY;
            if (inputRef.current.isMouseDown[0]) {
                inputRef.current.downMouseDeltas.x += e.movementX;
                inputRef.current.downMouseDeltas.y += e.movementY;
            }
        }
        window.addEventListener("mousemove", mousemove);
        return () => {
            window.removeEventListener("mousemove", mousemove);
            window.removeEventListener("keydown", keydown);
            window.removeEventListener("keyup", keyup);
        }
    }, []);

    return inputRef;
}