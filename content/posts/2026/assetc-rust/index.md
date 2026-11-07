---
draft: false
image: "model.png"
slug: "release-assetc-rust"
kicker: "Release · assetc"
title: "Release: assetc 0.2.0, the asset compiler rebuilt in Rust"
date: 2026-11-07T15:07:49+01:00
summary: "assetc is rebuilt from scratch in Rust: a CLI and Bevy/egui editor that compiles textures, glTF models, materials, shaders, fonts and game data into runtime formats, plus a dependency-free SDK crate for the game side."
tags:
- rust
- gamedev
- assetc
- tools
- release
---

[assetc](https://github.com/qbart/assetc) 0.2.0 is out. It's my asset compiler: it turns source assets - textures, glTF models, materials, shaders, fonts and game data - into runtime-friendly binary formats for games. Back in September I wrote about [LOD controls]({{< relref "posts/2026/assetc-lod-controls.md" >}}) in the C++ version; that one now lives on as [assetc-cpp](https://github.com/qbart/assetc-cpp), and assetc itself has been **rebuilt from scratch in Rust**.

{{< fig src="model.png" caption="Fox.glb with locators, bounds and the inspector" >}}

## Why rewrite it?

The building blocks were ready. Over the previous week and a half I ported [meshoptimizer]({{< relref "posts/2026/release-meshopt-pure/index.md" >}}) and my math library [matma]({{< relref "posts/2026/release-matma.md" >}}) to pure Rust, and assetc uses both: meshopt-pure for meshlets and levels of detail, matma for the math. With those in place the whole tool builds with `cargo`, the GUI runs on Bevy and egui, and the runtime side could become a plain Rust crate. The first commit of the Rust version landed on 30 October; 0.2.0 is tagged a bit over a week later.

## What it compiles

| Source | Output |
|--------|--------|
| `png`, `jpg`, `tga` | `.ktx2` with full mip chains, sRGB or linear per glob |
| `.exr` | HDR environment cubemap |
| `.cube` | color LUT, as a strip or a 3D texture |
| `.gltf`, `.glb` | mesh with meshlets and LODs, materials, textures, skin and animations |
| `.amat` + textures by name | PBR material, ORM packed |
| `.ashader` + SPIR-V, `.acmat` | shader interface and custom materials |
| `.ttf`, `.otf` | SDF font with its atlas |
| `.anoise`, `.agradient`, `.apalette` | generated textures, gradients and palettes |
| folder `*.atlas` | packed texture with named frames |
| `.aschema`, `.adata`, `.agraph`, `.atree` | typed game data, graphs and trees |

Meshes get octahedral-packed normals and tangents, meshlets (64 vertices / 124 triangles by default) and LODs at configurable ratios. Every binary format is little-endian, mostly chunked so a reader can skip what it doesn't know, and each one has a detailed spec in `docs/spec/`.

Assets are referenced by **64-bit IDs** - FNV-1a of the asset path (`textures/Grass.png` -> `textures/Grass`) - instead of file paths, so they stay stable across builds and source formats. A single manifest maps every ID to its output file. Embedded textures go into a shared store keyed by content, so the same texture used by two models is encoded once and shares one runtime handle.

## The editor

Running `assetc` with no arguments opens the GUI: input and output trees on the left, a 2D/3D preview in the middle and the inspector on the right. It previews textures channel by channel, models with locators and LODs, materials on a sphere, fonts, atlases, graphs and trees - and it edits the source files it understands.

{{< fig src="material.png" caption="PBR material: an .amat with its textures found by name, previewed on a sphere" >}}

Per-file settings live in an `.amod` sidecar next to the source (`Fox.glb.amod`): mesh settings, locators, properties, shapes, regions, paths, vertex colors and animation events, all edited in the inspector.

{{< fig src="noise.png" caption="Generated textures: noise, patterns, gradients and palettes from parameters" >}}

It's not only art assets. Schemas, data instances, graphs and trees cover the game data side - quest maps, dialogue, AI - with references to assets and to other instances.

{{< fig src="graph.png" caption="Directed graph editor: quest maps, dialogue and AI on the canvas" >}}

The **Output** tab inspects what the build actually wrote, so you can check meshlet bounds, LODs, the skin and locators on the compiled file rather than on the source.

{{< fig src="compiled-mesh.png" caption="Fox.amesh.bin in the Output tab, with its meshlet bounds" >}}

## The CLI

```sh
assetc init     # starter assetc.toml
assetc build    # compile input -> output
assetc watch    # rebuild only what changed, until Ctrl+C
assetc pack     # build, then bundle everything into one .pak
```

Like git with `.git`, it finds the project by looking for `assetc.toml` in the current directory and its parents. Every key is optional - an empty file builds `assets/` into `build/`:

```toml
input = "samples"
output = "tmp/build"

[textures]
linear = ["**/*_n.png"]
no_mipmaps = ["ui/**"]

[meshes]
lod_ratios = [0.5, 0.25]

[pack]
alignment = 4096           # page-aligned files, for memory mapping

[targets.mobile]           # assetc build --target mobile -> tmp/build-mobile
meshes = { lod_ratios = [0.5] }
```

Targets are named variants of the settings that build into their own output, so a mobile build with fewer LODs is one flag away. The `.pak` keeps every file readable - or memory-mapped - in place.

## The SDK

The game side is the [`assetc` crate](https://crates.io/crates/assetc). It reads everything `build` and `pack` write, from a `.pak` or an output directory, into plain Rust values: textures with all mips, materials, meshes with unpacked normals and tangents, animations with sampling, SDF fonts with text layout, data, graphs and more. It depends on **nothing but `std`** - no Bevy, no glTF, none of the compiler's code - so turning those values into GPU resources stays your engine's job. API docs are on [docs.rs](https://docs.rs/assetc).

```toml
[dependencies]
assetc = "0.2"
```

```rust
use assetc::{Assets, Kind, Mesh, Texture};

let assets = Assets::open("build/assetc.pak")?;     // or the output directory
for entry in assets.of_kind(Kind::Mesh) {
    let mesh: Mesh = assets.load(entry.id)?;
    println!("{}: {} vertices", entry.path, mesh.vertices.len());
}
let texture: Texture = assets.load_path("ui/fire.ktx2")?;
```

`make demo` packs the samples and opens a small Bevy app that loads all of them through the SDK only, the way a game would.

## Getting it

Pushing the version tag builds release binaries for Linux x64, macOS (Apple silicon) and Windows x64 on GitHub. Or build it yourself with `make install`. The SDK is MIT or Apache-2.0, at your option.

Source, specs and docs for every feature are on [GitHub](https://github.com/qbart/assetc).
