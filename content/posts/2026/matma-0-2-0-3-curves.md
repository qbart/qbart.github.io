---
draft: false
drawing: "splines"
slug: "matma-0-2-0-3-curves"
kicker: "Devlog · matma"
title: "matma 0.2 and 0.3: splines, animation curves and monotone ramps"
date: 2026-10-30T19:45:19+01:00
summary: "Two follow-up releases of matma: 0.2.0 brings the curves module (Catmull-Rom splines, arc length, AnimationCurve), 0.3.0 adds MonotoneCurve, a Fritsch-Carlson cubic that never overshoots."
tags:
- rust
- math
- gamedev
- curves
---

Two releases since [matma 0.1.0]({{< relref "release-matma.md" >}}), both about curves.

## 0.2.0: the curves module

Released the same evening as 0.1.0. The engine had a `spline.cpp` and an `animation_curve.cpp` sitting next to vkm, and they're now ported as `matma::curves`, generic over the vector type (it needs `alloc`):

- `hermite`, `catmull_rom` and `cardinal` evaluation, with tangents.
- `Spline<V>`: a Catmull-Rom / cardinal spline through waypoints with phantom end knots, so the curve passes through every waypoint, ends included. Defaults to tension 0 and centripetal parameterization (alpha 0.5).
- `SplineArcLength`: an arc-length table on top of a spline for constant-speed travel (distance -> `u`), even sampling and nearest-point queries.
- `AnimationCurve`: Unity-style keyframes with presets and tangent handles.

```rust
use matma::*;

let mut path = Spline::<float3>::new();
path.add(float3::new(0.0, 1.0, 5.0));
path.add(float3::new(3.0, 2.0, 2.0));
path.add(float3::new(3.0, 1.5, -2.0));
path.add(float3::new(-1.0, 1.0, -4.0));

let p = path.evaluate(1.5);                      // u = segment index + fraction
let polyline = path.sample(8);                   // 3 segments * 8 + 1 points

let arc = SplineArcLength::build(&path, 32);     // rebuild after editing the path
let pos = arc.evaluate_by_distance(&path, 2.0);  // 2 world units along the curve
let mid = arc.evaluate_uniform(&path, 0.5);      // halfway by distance, not by u
let u = arc.nearest_u(&path, float3::new(2.0, 1.0, 0.0));

let mut fade = AnimationCurve::<f32>::from_preset(Preset::EaseInOut);
fade.add_key(0.6, 1.2);
let alpha = fade.evaluate(0.3);
```

The only thing that stayed behind is the `Timer` overload, which belongs to the engine. `cargo run --example curves` walks through all of it.

## 0.3.0: MonotoneCurve

This one is new - it was never in vkm. Smooth curves through keys are great until you use them as a remap ramp. Take speed -> field of view: flat at 60° up to 10 m/s, then up to 80° by 20 m/s. A Catmull-Rom through those keys dips below 60 before 10 m/s and overshoots 80 after 20 m/s, because it only cares about being smooth.

`MonotoneCurve` is a monotone cubic Hermite `y = f(x)` using the Fritsch-Carlson method: tangents are limited so the curve never leaves the range of its neighbouring keys. Flat stays flat, rising stays rising.

```rust
let fov = MonotoneCurve::from_keys([   // speed -> FOV, never over/undershoots
    float2::new(0.0, 60.0),
    float2::new(10.0, 60.0),
    float2::new(20.0, 80.0),
    float2::new(40.0, 82.0),
]);
let deg = fov.evaluate(15.0);          // between 60 and 80, guaranteed
let slope = fov.derivative(15.0);
let lut = fov.sample(64);              // bake to a table for a shader or a hot loop
```

`AnimationCurve` picked up the same idea as `set_monotone_tangents()` - the "make monotone" button: keep your keys, drop the overshoot between them.

