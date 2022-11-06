#version 300 es

precision highp float;

in vec2 texcoord;
in vec2 transformed_texcoord;

uniform highp usampler2D in_tex;
uniform sampler2D game_textures;

out vec4 frag_color;



//COMMON_START

// data types
#define NONE 0u
#define CONVEYOR 1u
#define GRABBER 2u
#define CONVERTER 3u
#define INPUT 4u
#define OUTPUT 5u
#define WALL 6u
#define COMPLETE 7u

// direction
#define UP 0u
#define DOWN 1u
#define LEFT 2u
#define RIGHT 3u

// operation
#define ADD 0u
#define SUB 1u
#define MUL 2u
#define DIV 3u

uint get_bits(uint bitfield, uint start, uint end) {
    return (bitfield >> (start - 1u)) 
        & ((1u << (end - start)) + ((1u << (end - start)) - 1u));
}

uint bitmask(uint start, uint end) {
    return ((1u << (end)) - 1u) - ((1u << (start - 1u)) - 1u);
}

void set_bits(inout uint o, uint bits, uint start, uint end) {
    o &= ~bitmask(start, end);
    o += bits << (start - 1u);
}

uvec4 getpixel(ivec2 offset) {
    return texture(in_tex, texcoord + vec2(offset) / vec2(textureSize(in_tex, 0)));
}


#define GETSET(gettername, settername, channel, start, end) \
uint gettername(uvec4 cell) { \
    return get_bits(cell.channel, start, end); \
} \
void settername(inout uvec4 cell, uint value) { \
    set_bits(cell.channel, value, start, end); \
}

//METAPROGRAMMING_START
// r channel
GETSET(g_type, s_type, r, 1u, 3u)
GETSET(g_direction, s_direction, r, 4u, 5u)
GETSET(g_grabber_length, s_grabber_length, r, 6u, 8u)
GETSET(g_operation, s_operation, r, 9u, 12u)

// g channel
GETSET(g_has_num, s_has_num, g, 1u, 1u)
GETSET(g_num, s_num, g, 2u, 16u)

// b channel
GETSET(g_score, s_score, b, 1u, 8u)
GETSET(g_required_score, s_required_score, b, 9u, 16u)

//METAPROGRAMMING_END

//COMMON_END





float digits(uint n) {
    if (n == 0u) return 1.0;
    return floor(log(float(n)) * 0.434294482) + 1.0;
}

float get_digit(float n, float digit) {
    return mod(floor(n / pow(10.0, digit)), 10.0);
}

vec4 draw_number(vec2 tc, uint number, vec2 asset_transform) {
    uint stored_num = number;
    float digit_count = digits(stored_num);
    float place_value = digit_count - floor(tc.x * digit_count) - 1.f;
    float digit = get_digit(float(stored_num), place_value);
    return texture(game_textures, 
        (vec2(digit, 3) + mod(tc * vec2(digit_count, 1.0), 1.0))
            * asset_transform);
}

void main() {
    if (clamp(transformed_texcoord, 0.0, 1.0) != transformed_texcoord) {
        frag_color = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec2 game_tex_size = vec2(textureSize(game_textures, 0));
    vec2 asset_transform = vec2(16.0/game_tex_size.x, -16.0/game_tex_size.y);

    uvec4 s = texture(in_tex, transformed_texcoord + 0.0 / vec2(textureSize(in_tex, 0)));

    vec2 fract_values = vec2(1.f) / vec2(textureSize(in_tex, 0));
    vec2 fract_coord = mod(transformed_texcoord, fract_values) / fract_values;

    vec4 col = vec4(1.0, 1.0, 1.0, 1.0);

    mat2 dir_transform;
    switch (g_direction(s)) {
    case UP:
        dir_transform = mat2(1,0,0,1);
        break;
    case DOWN:
        dir_transform = mat2(1,0,0,-1);
        break;
    case LEFT:
        dir_transform = mat2(0,-1,1,0);
        break;
    case RIGHT:
        dir_transform = mat2(0,1,-1,0);
        break;
    }
    
    switch (g_type(s)) {
    case NONE:
        frag_color = vec4(1.0 - vec3(
            abs(0.5 - fract_coord.x) > 0.48 || 
            abs(0.5 - fract_coord.y) > 0.48 
        ), 1.0);
        return;
    case WALL:
        frag_color = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    case CONVEYOR:
        col *= texture(game_textures, 
            (dir_transform * (fract_coord - vec2(0.5)) + vec2(0.5, 2.5)) * asset_transform
        );
        break;
    case GRABBER:
        col *= texture(game_textures, 
            (dir_transform * (fract_coord - vec2(0.5)) + vec2(4.5, 2.5)) * asset_transform
        );
        if (fract_coord.x < 0.25 && fract_coord.y < 0.4) {
            col = draw_number(fract_coord * vec2(4, 2.5), g_grabber_length(s), asset_transform);
        }
        break;
    case CONVERTER:
        col *= texture(game_textures, 
            (dir_transform * (fract_coord - vec2(0.5)) + vec2(1.5, 2.5)) * asset_transform
        );
        vec4 operation = texture(game_textures, 
            ((fract_coord + vec2(g_operation(s), 1)) * asset_transform));
        col = mix(col, operation, operation.a);
        break;
    case INPUT:
        col *= texture(game_textures, 
            (fract_coord + vec2(2.0, 2.0)) * asset_transform
        );
        break;
    case COMPLETE:
        col *= texture(game_textures, 
            (fract_coord + vec2(5.0, 2.0)) * asset_transform
        );
        break;
    case OUTPUT:
        col *= texture(game_textures, 
            (fract_coord + vec2(3.0, 2.0)) * asset_transform
        );
        uint score = g_score(s);
        float width = log(float(score)) * 0.07;
        if (fract_coord.x < width && fract_coord.y < 0.3) {
            col = draw_number(fract_coord * vec2(1.0 / width, 1.0 / 0.3), score, asset_transform);
        }
        uint r_score = g_required_score(s);
        width = log(float(r_score)) * 0.07;
        vec2 right_fract_coord = fract_coord - vec2(1.0 - width, 0.0);
        if (right_fract_coord.x < width && right_fract_coord.x > 0.0 && right_fract_coord.y < 0.3) {
            col = draw_number(
                right_fract_coord
                * vec2(1.0 / width, 1.0 / 0.3), 
                r_score, 
                asset_transform
            );
        }
        break;
    }

    if (g_has_num(s) == 1u) {
        vec2 num_coord = fract_coord;
        if (g_type(s) == OUTPUT) {
            num_coord.y *= 1.3;
            num_coord.y -= 0.3;
            num_coord = clamp(num_coord, 0.0, 1.0);
        }
        vec4 numcol = draw_number(num_coord, g_num(s), asset_transform);
        col = mix(col, numcol, 1.0 - numcol.r);
    }

    frag_color = col;
}