---
draft: false
title: "assetc gets LOD controls"
date: 2026-09-19T22:30:00+02:00
tags:
- c++
- gamedev
- assetc
- tools
---

Small update to assetc, my asset compiler for turning glTF/OBJ sources into the engine's binary `.hmesh` format: mesh LOD generation is now a first-class, tunable step instead of a fixed default.

Every submesh already got reduced LODs via [meshoptimizer](https://github.com/zeux/meshoptimizer)'s `meshopt_simplify` (stored in optional `LODI`/`LODT` chunks so the full-res path in `IDXS`/`SUBM`/`MLET` is untouched). What was missing was control over *how* that simplification runs, and the answer wasn't always "just works" - `meshopt_simplify` is topology-preserving, so it refuses to collapse an edge unless exactly two triangles share it. Hard-edged or unwelded source geometry (duplicated verts at every seam, common straight out of a DCC export) can make almost every edge look like a boundary and stall a level at 0% reduction.

Now `assetc.yml` exposes it per-asset:

```yaml
mesh:
  lod:
    ratios: [0.5, 0.25]  # target index-count fraction per level, from LOD0
    error: 0.05          # meshopt_simplify target_error (0..1), first attempt
    errorStep: 0.05       # relax target_error by this much per retry on a stall
    maxAttempts: 3        # retries at relaxed error before falling back
    sloppyFallback: true  # meshopt_simplifySloppy if still stalled after that
```

If a level keeps stalling, the encoder retries at a relaxed error limit up to `maxAttempts`, then optionally falls back to `meshopt_simplifySloppy`, which ignores topology entirely and always hits the target triangle count (at the cost of possibly distorting UVs/attributes a bit more).

The inspector in `assetc ui` picked up a matching LOD selector, so you can flip between levels on a compiled mesh and see the triangle count and preview drop in real time:

{{< fig src="/posts/2026/assetc-lod-controls.png" caption="tree.hmesh with 3 generated LODs (348 / 152 / 68 tris) in the assetc inspector" >}}

Small piece, but one less thing to hand-tune per model.
