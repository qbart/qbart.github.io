---
draft: false
drawing: "mips"
slug: "release-ktx-rs"
kicker: "Release · ktx-rs"
title: "Release: ktx-rs 4.4.2, KTX-Software ported to Rust"
date: 2026-10-27T20:15:01+01:00
summary: "An unofficial Rust port of Khronos KTX-Software: libktx, the ktx CLI and the Basis Universal and ASTC encoders, byte identical to upstream and passing the full CLI conformance suite."
tags:
- rust
- ktx
- textures
- basisu
- release
---

[ktx-rs](https://github.com/qbart/ktx-rs) 4.4.2 is out on [crates.io](https://crates.io/crates/ktx-rs). It's an **unofficial Rust port** of [Khronos KTX-Software](https://github.com/KhronosGroup/KTX-Software) - the `libktx` library and the `ktx` command line tool, together with the Basis Universal encoders and transcoders. It is not affiliated with or endorsed by The Khronos Group.

## Why?

KTX2 with Basis Universal is the go-to container for GPU textures, but using it from Rust meant building the C++ library and going through FFI. Bindings would have been the easy route; a port means one `cargo build` with no C++ toolchain, no `unsafe` sprinkled around FFI, and a library that never panics on bad input.

The bar was simple: if the Rust version doesn't produce exactly the same bytes as the C++ tools, it's not a port.

## What's included

- KTX1 / KTX2 reading, writing and validation, with zstd and zlib supercompression.
- Basis Universal: ETC1S (Basis-LZ), UASTC, UASTC HDR 4x4 and 6x6i encoders, and transcoding to every target libktx supports.
- ASTC encoding and decoding (a port of astcenc), ETC unpack, PNG / JPEG / EXR input.
- GPU upload through a Vulkan loader (feature `vulkan`, default) and an OpenGL / OpenGL ES loader (feature `opengl`, opt in).
- The `ktx` CLI: `create`, `convert`, `encode`, `deflate`, `transcode`, `extract`, `info`, `validate`, `compare` and `help`, with man pages.

Output is **byte identical** to the upstream tools and every case of the upstream CLI conformance test suite (CTS) passes. The upstream unit, texture and transcode tests are ported as well.

Not ported: the legacy tools (`toktx`, `ktx2check`, ...), the language bindings, OpenCL encoding and ASTC HDR encoding (broken upstream, so deferred).

## Using it

The package is `ktx-rs`, the library is imported as `ktx`. Functions keep their libktx names in snake case (`ktxTexture2_TranscodeBasis` becomes `Texture2::transcode_basis`) and return `KtxResult<T>`:

```rust
use ktx::texture::KtxTexture;
use ktx::{KtxResult, Texture2, TranscodeFmt};

fn transcode_to_bc7(src: &str, dst: &str) -> KtxResult<()> {
    let mut texture =
        Texture2::create_from_named_file(src, ktx::KTX_TEXTURE_CREATE_LOAD_IMAGE_DATA_BIT)?;
    if texture.needs_transcoding() {
        texture.transcode_basis(TranscodeFmt::BC7_RGBA, 0)?;
    }
    texture.write_to_named_file(dst)
}
```

Or from the shell, same commands as upstream:

```sh
ktx create --format R8G8B8A8_SRGB --generate-mipmap albedo.png albedo.ktx2
ktx encode --codec basis-lz albedo.ktx2 albedo_blz.ktx2
ktx info albedo_blz.ktx2
```

## Versioning

The crate version follows upstream KTX-Software, so 4.4.2 is the port of KTX-Software 4.4.2. Port-only fixes get a separate patch number while `LIBKTX_VERSION` keeps reporting the upstream version.

## Performance

Being byte exact is not enough if it's 20x slower. The encoders use multiple threads (`--threads`, all cores by default) with the same job splits as the C++ code, so the output never depends on the thread count. The astcenc compressor is compiled three times - SSE2, SSE4.1 and AVX2 - and the right copy is picked at runtime, so no `target-cpu` flags are needed.

Rust time vs C++ time on 24 threads (lower is better, 1.0 is parity):

| case | Rust / C++ |
|---|---|
| rgba8 + mipmaps / zstd 20 | 1.05 / 1.16 |
| UASTC 2 / UASTC 4 + RDO | 0.76 / 1.10 |
| Basis-LZ / q255 + mips | 0.69 / 0.96 |
| Basis-LZ clevel 5 (2048²) | 1.4 |
| ASTC 4x4 thorough / 6x6 medium / 6x6 2048² | 1.23 / 1.23 / 1.07 |

ASTC started at 21.6x slower before the SIMD kernels and runtime dispatch went in, so it's in a good place now, with some optional work left.

## Design notes

- Pure Rust except the allowed C bindings: Vulkan (`ash`) and, behind `opengl`, OpenGL.
- `unsafe` is denied outside the GPU loaders and the astcenc SIMD code; `unwrap`, `expect` and `panic!` are denied everywhere.
- Each translated file keeps the license of the code it was ported from, so the crate is `Apache-2.0 AND BSD-3-Clause AND MIT AND Zlib` (details in `NOTICE.md` and `REUSE.toml`).

Source, roadmap and per-component implementation notes are on [GitHub](https://github.com/qbart/ktx-rs).
