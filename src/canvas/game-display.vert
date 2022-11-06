#version 300 es

precision highp float;

in vec2 pos;
out vec2 texcoord;
out vec2 transformed_texcoord;

uniform vec2 topleft;
uniform vec2 bottomright;

void main() {
    vec2 tc = pos * 0.5 + 0.5;
    texcoord = tc;
    transformed_texcoord = mix(topleft, bottomright, tc);
    gl_Position = vec4(pos, 0.5, 1.0);
}