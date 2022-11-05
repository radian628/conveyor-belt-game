#version 300 es

precision highp float;

in vec2 texcoord;
in vec2 transformed_texcoord;

uniform usampler2D 

out vec4 frag_color;

void main() {
    vec2 tc = pos * 0.5 + 0.5;;
    texcoord = tc;
    transformed_texcoord = mix(topleft, bottomright, tc);
    gl_Position = vec4(pos, 0.5, 1.0);
}