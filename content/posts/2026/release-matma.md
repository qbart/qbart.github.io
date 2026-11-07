---
draft: false
drawing: "axes"
slug: "release-matma"
kicker: "Release · matma"
title: "Release: matma 0.1.0, game math for Vulkan in Rust"
date: 2026-10-25T21:38:32+01:00
summary: "SIMD-first math for games and Vulkan with Slang/HLSL naming, std140/std430 derives and GPU packing helpers. A Rust port of my C++23 library vkm, with no third-party dependencies."
tags:
- rust
- math
- vulkan
- gamedev
- release
---

[matma](https://github.com/qbart/matma) 0.1.0 is out on [crates.io](https://crates.io/crates/matma). It's SIMD-first math for games and Vulkan with Slang/HLSL naming - a Rust port of [vkm](https://github.com/qbart/vkm), my C++23 math library. Pure Rust, no third-party dependencies, and `#![deny(unsafe_code)]` everywhere except the small SIMD seam.

Think "GLM, but Vulkan conventions by default and Slang-style names so Rust and shader code mirror each other".

```rust
use matma::*;

let q = quat::from_axis_angle(float3::Z, rad(30.0));
let model = compose_trs(float3::new(0.0, 1.0, 0.0), q, float3::ONE);
let view = look_at(float3::new(0.0, 0.0, 5.0), float3::ZERO, float3::UP);
let proj = perspective(rad(60.0), 16.0 / 9.0, 0.1, 100.0); // Vulkan clip: depth [0,1], Y down

let mvp = proj * view * model;
let clip = mvp * float4::new(0.0, 0.0, 0.0, 1.0);

let normal_packed: short2 = oct_encode16(float3::UP); // -> R16G16_SNORM vertex attribute
```

## Why another math crate?

The shaders are written in Slang, so I wanted the CPU side to read the same: `float3`, `float4x4`, `uint4`, `quat` rather than `Vec3` / `Mat4`, and `*` on vectors being component-wise like in a shader. (GLSL aliases such as `vec3`, `mat4` and `ivec2` are there too.) The other half is GPU interop - Vulkan's clip space, `std140` / `std430` layouts and vertex packing - which usually ends up as hand-written glue in every project.

## What's in 0.1.0

- **Vectors, matrices and quaternions**: `Vector2/3/4<T>`, `Matrix<V, C>` and `Quaternion<T>` are generic over `f32`, `f64` and the integer types; `f32` is the one with SIMD hooks. Swizzles, `inverse`, `determinant`, `normal_matrix`, `slerp`, `look_rotation`, `decompose` and friends.
- **Vulkan conventions baked in**: `[0, 1]` depth and flipped Y in `perspective` / `ortho`. World space is right-handed, Y-up, forward is `-Z`; Vulkan's Y-down only exists in clip space.
- **Column-major, column-vector math**: `v' = M * v`, composed right to left. `float4x4` is 64 contiguous bytes with the translation in the last column, so it memcpys straight into a UBO `mat4`.
- **Matrix shape in the type**: `float3x4` is 3 rows x 4 columns like Slang's `floatRxC`, and products check shapes at compile time (`float2x3 * float3x2 = float2x2`).
- **Shader-style common functions**: `saturate`, `lerp`, `smoothstep`, `reflect`, `step`, ... generic over scalars and vectors, exactly like overload sets in a shader. `min` / `max` / `clamp` treat NaN the HLSL way, not the IEEE way.
- **GPU packing**: snorm / unorm quantization (8/10/16-bit), octahedral normals, tangent + handedness packing and half floats - `const fn` wherever no `sqrt` is involved.
- **SIMD**: SSE2 on x86 / x86-64, NEON on AArch64 and a scalar fallback, behind one tiny `simd` module. The `force-scalar` feature switches the backend off to diff results.

## std140 / std430 derives

My favourite part. Declare the uniform block with the same fields as the shader and derive its layout - the macro generates a padded struct at the GLSL offsets and checks them at compile time:

```rust
use matma::*;

// layout(std140) uniform CameraData { mat4 view; mat4 proj; vec3 eye; float near; };
#[derive(Clone, Copy, Std140)]
struct CameraData {
    view: float4x4, // offset 0
    proj: float4x4, // offset 64
    eye: float3,    // offset 128
    near: f32,      // offset 140 - tucked into the vec3's 4th lane, as in GLSL
}                   // size 144
```

The derive lives in the in-repo `matma-derive` crate (default feature `derive`); `--no-default-features` drops it entirely.

Source on [GitHub](https://github.com/qbart/matma).
