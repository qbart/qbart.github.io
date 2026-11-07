---
draft: false
image: "output.png"
slug: "release-meshopt-pure"
kicker: "Release · meshopt-pure"
title: "Release: meshopt-pure 1.3.0, meshoptimizer in pure Rust"
date: 2026-10-30T20:17:08+01:00
summary: "An unofficial pure Rust port of meshoptimizer v1.3 with bit-identical output, SIMD decoders and no C dependencies, plus gltfpack and clusterlod in the same repository."
tags:
- rust
- meshoptimizer
- gamedev
- gltf
- release
---

[meshopt-pure](https://github.com/qbart/meshopt-pure) 1.3.0 is out on [crates.io](https://crates.io/crates/meshopt-pure). It's an **unofficial pure Rust port** of [meshoptimizer](https://github.com/zeux/meshoptimizer) by Arseny Kapoulkine - the mesh optimization library, plus its companion projects gltfpack and clusterlod. It is not affiliated with or endorsed by the meshoptimizer authors.

{{< fig src="output.png" caption="Meshlets of the glTF Fox sample model" >}}

## Why?

meshoptimizer does the heavy lifting in my asset pipeline: vertex cache optimization, meshlets and the LOD chain all come from it, and [assetc](https://github.com/qbart/assetc) now uses this crate for that. Existing Rust crates wrap the C++ library; I wanted one with **no C dependencies at all**, so the whole pipeline builds with `cargo` alone, cross-compiles cleanly and runs on WebAssembly.

Same rule as with [ktx-rs]({{< relref "release-ktx-rs.md" >}}): it only counts if the output matches the original bit for bit.

## What's included

- **The library** (`meshopt-pure`, imported as `meshoptimizer`): indexing, vertex cache / overdraw / vertex fetch optimization, simplification (including attribute-aware and sloppy), meshlets (clusterizer, meshlet utils and codec), partitioning, spatial ordering, stripification, tangent space, remeshing, opacity micromaps, vertex / index codecs and filters, quantization and analyzers.
- **SIMD decoders** (feature `simd`, default): SSE2 / SSSE3 / SSE4.1 on x86-64, NEON on AArch64 and simd128 on WebAssembly, detected at runtime.
- **gltfpack**: library and CLI with byte-identical output to C++ gltfpack 1.3, including KTX2 / BasisU texture compression through ktx-rs. It lives in the repository but is not published.
- **clusterlod**: cluster LOD hierarchies, ported from `demo/clusterlod.h`, also unpublished for now.

Versions follow upstream: 1.3.0 is meshoptimizer v1.3 (commit `f0a684f`).

## How it's verified

Every module was diff-tested bit for bit against the C++ reference - real meshes, generated grids, random triangle soups and fuzzed codec streams - with an out-of-repo harness, since C code is not allowed in the repository itself. On top of that:

- the upstream tests are ported 1:1, along with sanity tests and u16 vs u32 index equivalence tests,
- gltfpack and the demo programs are checked against golden C++ output,
- fuzz harnesses run on a pure Rust mutation driver, with coverage-guided libFuzzer targets in a separate dev-only crate,
- NEON is tested under qemu and simd128 / scalar under wasmtime.

## Using it

Function names are the meshoptimizer ones in snake case with the same parameters (`meshopt_optimizeVertexCache` is `optimize_vertex_cache`). They are generic over `u32` and `u16` indices and return `Result<T>`:

```toml
[dependencies]
meshopt-pure = "1.3.0"
```

```rust
use meshoptimizer::{optimize_vertex_cache, simplify};

// indices: Vec<u32>, positions: Vec<f32> (x, y, z)
let source = indices.clone();
optimize_vertex_cache(&mut indices, &source, index_count, vertex_count)?;

// a LOD with half of the triangles
let mut lod = vec![0u32; index_count];
let mut error = 0.0;
let lod_count = simplify(&mut lod, &indices, index_count, &positions, vertex_count, 12, index_count / 2, 0.01, 0, Some(&mut error))?;
lod.truncate(lod_count);
```

The README has the full index -> optimize -> simplify example. gltfpack takes the same flags as the C++ one:

```sh
cargo install --path gltfpack
gltfpack -i scene.gltf -o scene.glb -cc -tc
```

## Not ported

WebP texture output in gltfpack (`-tw` reports "built without WebP support", like a C++ build without libwebp), the custom allocator API (use `#[global_allocator]`), the JS bindings and the internal tuning tools.

## Design notes

- Pure Rust, no C dependencies.
- `unsafe` is denied; the only exception is calling the SIMD decoders after runtime CPU feature detection.
- The library never panics on bad input (`unwrap`, `expect` and `panic!` are denied).
- MIT, like meshoptimizer. The sources are translations of meshoptimizer, cgltf, fast_obj, micro_ply and sdefl, all MIT licensed.

Source and per-module specs are on [GitHub](https://github.com/qbart/meshopt-pure).
