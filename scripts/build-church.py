#!/usr/bin/env python3
"""Day and night dioramas of Onze-Lieve-Vrouw Onbevlekt Ontvangenkerk, Ospel.

Massing is taken from the two reference photographs: a square brick tower with
an octagonal slate spire on the west, a long nave, a lower south aisle with
lancets and a door, a transept gable with a traceried window, and a rose-window
chapel. Cars, signs, and the neighbouring houses are not modelled.
"""

from __future__ import annotations

import json
import math
import struct
import zlib
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "assets" / "models"
POSTER_DIR = ROOT / "assets" / "posters"
# Decorative lancets, roses and the door stay on. Their colours, and the
# repeating brick and slate, are generated to match the Ospel photograph.
PHOTO = False

# Sunlit south wall, measured from the photograph: orange-red brick, warm mortar.
BRICK = (206, 152, 106)
MORTAR = (174, 166, 154)
SLATE = (128, 136, 146)
SLATE_GAP = (72, 78, 86)
PAVE = (164, 154, 142)
PAVE_GAP = (118, 110, 100)


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def mul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def length(a):
    return math.sqrt(dot(a, a))


def norm(a):
    n = length(a) or 1
    return (a[0] / n, a[1] / n, a[2] / n)


def basis(normal):
    n = norm(normal)
    helper = (0, 0, 1) if abs(n[1]) > 0.9 else (0, 1, 0)
    right = norm(cross(helper, n))
    up = norm(cross(n, right))
    return right, up


class Builder:
    def __init__(self):
        self.pos = {}
        self.nrm = {}
        self.uv = {}
        self.idx = {}

    def tri(self, mat, a, b, c, uva=(0, 0), uvb=(1, 0), uvc=(0, 1)):
        n = cross(sub(b, a), sub(c, a))
        if length(n) < 1e-8:
            return
        n = norm(n)
        bag = self.pos.setdefault(mat, [])
        base = len(bag)
        bag.extend((a, b, c))
        self.nrm.setdefault(mat, []).extend((n, n, n))
        self.uv.setdefault(mat, []).extend((uva, uvb, uvc))
        self.idx.setdefault(mat, []).extend((base, base + 1, base + 2))

    def tri_out(self, mat, a, b, c, center, uva=(0, 0), uvb=(1, 0), uvc=(0, 1)):
        n = cross(sub(b, a), sub(c, a))
        if dot(n, sub(a, center)) < 0:
            b, c = c, b
            uvb, uvc = uvc, uvb
        self.tri(mat, a, b, c, uva, uvb, uvc)

    def quad(self, mat, a, b, c, d, uva=(0, 0), uvb=(1, 0), uvc=(1, 1), uvd=(0, 1)):
        self.tri(mat, a, b, c, uva, uvb, uvc)
        self.tri(mat, a, c, d, uva, uvc, uvd)

    def quad_out(self, mat, a, b, c, d, center, uva=(0, 0), uvb=(1, 0), uvc=(1, 1), uvd=(0, 1)):
        self.tri_out(mat, a, b, c, center, uva, uvb, uvc)
        self.tri_out(mat, a, c, d, center, uva, uvc, uvd)

    def box(self, mat, cx, cy, cz, sx, sy, sz):
        hx, hy, hz = sx / 2, sy / 2, sz / 2
        x0, x1 = cx - hx, cx + hx
        y0, y1 = cy - hy, cy + hy
        z0, z1 = cz - hz, cz + hz
        c = (cx, cy, cz)

        def tile(u, v):
            return (0, 0), (u, 0), (u, v), (0, v)

        faces = [
            ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), tile(sx, sy)),
            ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), tile(sx, sy)),
            ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), tile(sz, sy)),
            ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), tile(sz, sy)),
            ((x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0), tile(sx, sz)),
            ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), tile(sx, sz)),
        ]
        for a, b, c3, d, uvs in faces:
            self.quad_out(mat, a, b, c3, d, c, *uvs)

    def bounds(self):
        pts = [p for bag in self.pos.values() for p in bag]
        xs, ys, zs = zip(*pts)
        return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def png_bytes(image: Image.Image) -> bytes:
    buf = Path("/tmp/church-tex.png")
    image.save(buf, format="PNG", optimize=True)
    return buf.read_bytes()


def _noise(x, y):
    n = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 255) / 255


def _paint_wrapped(img, y0, y1, x0, width, color):
    """Write a horizontal run, wrapping across the left and right edges."""
    size = img.shape[1]
    x0 %= size
    x1 = x0 + width
    if x1 <= size:
        img[y0:y1, x0:x1] = color
        return
    img[y0:y1, x0:] = color[:, : size - x0]
    img[y0:y1, : x1 - size] = color[:, size - x0 :]


def _courses(size, rows, cols, body, gap, mortar, rng, darken=0.16, jitter=None):
    """A seamless running-bond of rectangular units. One tile equals one metre."""
    img = np.empty((size, size, 3), np.float32)
    noise = rng.normal(0, 5, img.shape).astype(np.float32)
    img[:] = np.array(mortar, np.float32) + noise
    ch = size // rows
    pitch = size // cols
    bh = ch - gap[1]
    bw = pitch - gap[0]
    # jitter is (lightness, warmth). Warmth stays on the body hue: brick stays
    # orange, slate stays blue-grey. Independent channel noise turns both muddy.
    light_std, warm_std = (jitter if jitter is not None else (12.0, 4.0))
    body = np.array(body, np.float32)
    for row in range(rows):
        y0 = row * ch
        y1 = y0 + bh
        off = pitch // 2 if row % 2 else 0
        for col in range(cols):
            warmth = float(rng.normal(0, warm_std))
            tone = body + float(rng.normal(0, light_std)) + np.array(
                [warmth, warmth * 0.15, -warmth * 0.4], np.float32
            )
            if rng.random() < darken:
                tone *= float(rng.uniform(0.80, 0.92))
            patch = tone + rng.normal(0, 2.4, (bh, bw, 1))
            shade = np.ones((bh, bw, 1), np.float32)
            shade[-max(2, bh // 18) :] *= 0.84
            shade[:, -max(2, bw // 18) :] *= 0.90
            shade[:1] *= 1.05
            _paint_wrapped(img, y0, y1, col * pitch + gap[0] // 2 - off, bw, np.clip(patch * shade, 0, 255))
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def make_brick():
    # About four bricks across and sixteen courses: the size of the real wall.
    rng = np.random.default_rng(4)
    return _courses(1024, 16, 4, BRICK, (8, 6), MORTAR, rng, darken=0.14, jitter=(11.0, 5.0))


def make_slate():
    rng = np.random.default_rng(11)
    return _courses(1024, 8, 5, SLATE, (5, 4), SLATE_GAP, rng, darken=0.34, jitter=(9.0, 2.0))


def make_pave():
    rng = np.random.default_rng(19)
    return _courses(512, 8, 8, PAVE, (4, 4), PAVE_GAP, rng, darken=0.18, jitter=(7.0, 2.5))


MATERIALS = {
    "brick": {"rough": 0.9, "metal": 0.0, "color": (1, 1, 1, 1), "tex": "brick"},
    "plinth": {"rough": 0.92, "metal": 0.0, "color": (0.66, 0.55, 0.58, 1), "tex": "brick"},
    "slate": {"rough": 0.72, "metal": 0.04, "color": (1, 1, 1, 1), "tex": "slate"},
    "stone": {"rough": 0.8, "metal": 0.0, "color": (0.74, 0.72, 0.68, 1), "tex": None},
    "frame": {"rough": 0.7, "metal": 0.0, "color": (0.91, 0.80, 0.66, 1), "tex": None},
    "wood": {"rough": 0.72, "metal": 0.0, "color": (0.34, 0.18, 0.10, 1), "tex": None},
    "ground": {"rough": 0.95, "metal": 0.0, "color": (1, 1, 1, 1), "tex": "pave"},
    "metal": {"rough": 0.35, "metal": 0.7, "color": (0.18, 0.19, 0.2, 1), "tex": None},
    "win": {"rough": 0.12, "metal": 0.0, "color": (0.20, 0.16, 0.11, 1), "tex": None},
    "winlamp": {"rough": 0.4, "metal": 0.2, "color": (0.45, 0.38, 0.28, 1), "tex": None},
}

NIGHT_COLOR = {
    "brick": (0.22, 0.2, 0.26, 1),
    "plinth": (0.14, 0.11, 0.12, 1),
    "slate": (0.16, 0.17, 0.22, 1),
    "stone": (0.26, 0.26, 0.28, 1),
    "frame": (0.32, 0.27, 0.22, 1),
    "wood": (0.28, 0.14, 0.07, 1),
    "ground": (0.18, 0.18, 0.2, 1),
    "metal": (0.22, 0.23, 0.26, 1),
    "win": (1.0, 0.74, 0.36, 1),
    "winlamp": (1.0, 0.8, 0.45, 1),
}
NIGHT_EMISSIVE = {
    "win": (1.15, 0.58, 0.16),
    "winlamp": (1.8, 0.95, 0.32),
    "wood": (0.18, 0.06, 0.015),
}


def build_glb(builder: Builder, images: dict[str, bytes], night: bool, mimes=None, clamp=None) -> bytes:
    blobs = []
    buffer_views = []
    accessors = []
    materials = []
    textures = []
    image_defs = []
    mimes = mimes or {}
    clamp = set(clamp or [])
    samplers = [
        {"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497},
        {"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071},
    ]
    tex_index = {}

    def push(data: bytes, target: int | None = None) -> int:
        pad = (4 - (len(data) % 4)) % 4
        view = {"buffer": 0, "byteOffset": sum(len(b) for b in blobs), "byteLength": len(data)}
        if target:
            view["target"] = target
        buffer_views.append(view)
        blobs.append(data + b"\x00" * pad)
        return len(buffer_views) - 1

    for name, raw in images.items():
        view = push(raw)
        image_defs.append({"bufferView": view, "mimeType": mimes.get(name, "image/png")})
        textures.append({"sampler": 1 if name in clamp else 0, "source": len(image_defs) - 1})
        tex_index[name] = len(textures) - 1

    primitives = []
    for mat_name, positions in builder.pos.items():
        spec = MATERIALS[mat_name]
        pos = np.array(positions, np.float32)
        nrm = np.array(builder.nrm[mat_name], np.float32)
        uv = np.array(builder.uv[mat_name], np.float32)
        idx = np.array(builder.idx[mat_name], np.uint32)
        pos_view = push(pos.tobytes(), 34962)
        nrm_view = push(nrm.tobytes(), 34962)
        uv_view = push(uv.tobytes(), 34962)
        idx_view = push(idx.tobytes(), 34963)
        pa = len(accessors)
        accessors.append({
            "bufferView": pos_view, "componentType": 5126, "count": len(pos), "type": "VEC3",
            "min": pos.min(0).tolist(), "max": pos.max(0).tolist(),
        })
        accessors.append({
            "bufferView": nrm_view, "componentType": 5126, "count": len(nrm), "type": "VEC3",
        })
        accessors.append({
            "bufferView": uv_view, "componentType": 5126, "count": len(uv), "type": "VEC2",
        })
        accessors.append({
            "bufferView": idx_view, "componentType": 5125, "count": len(idx), "type": "SCALAR",
        })
        color = NIGHT_COLOR[mat_name] if night else spec["color"]
        pbr = {
            "baseColorFactor": list(color),
            "metallicFactor": spec["metal"],
            "roughnessFactor": spec["rough"] if not night else min(1, spec["rough"] + 0.05),
        }
        if spec["tex"]:
            pbr["baseColorTexture"] = {"index": tex_index[spec["tex"]]}
        material = {"name": mat_name, "pbrMetallicRoughness": pbr, "doubleSided": False}
        glow = spec.get("glow")
        if night and glow and glow in tex_index:
            material["emissiveTexture"] = {"index": tex_index[glow]}
            material["emissiveFactor"] = [1.35, 0.85, 0.42]
        elif night and mat_name == "photo" and "emit" in tex_index:
            material["emissiveTexture"] = {"index": tex_index["emit"]}
            material["emissiveFactor"] = [1.2, 0.78, 0.32]
        elif night and mat_name in NIGHT_EMISSIVE:
            material["emissiveFactor"] = list(NIGHT_EMISSIVE[mat_name])
        materials.append(material)
        primitives.append({
            "attributes": {"POSITION": pa, "NORMAL": pa + 1, "TEXCOORD_0": pa + 2},
            "indices": pa + 3,
            "material": len(materials) - 1,
        })

    blob = b"".join(blobs)
    gltf = {
        "asset": {"version": "2.0", "generator": "build-church.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "church-night" if night else "church-day"}],
        "meshes": [{"primitives": primitives}],
        "materials": materials,
        "textures": textures,
        "images": image_defs,
        "samplers": samplers,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(blob)}],
    }
    json_buf = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_pad = (4 - (len(json_buf) % 4)) % 4
    json_chunk = json_buf + b" " * json_pad
    bin_pad = (4 - (len(blob) % 4)) % 4
    bin_chunk = blob + b"\x00" * bin_pad
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    out = bytearray(total)
    struct.pack_into("<III", out, 0, 0x46546C67, 2, total)
    struct.pack_into("<II", out, 12, len(json_chunk), 0x4E4F534A)
    out[20:20 + len(json_chunk)] = json_chunk
    o = 20 + len(json_chunk)
    struct.pack_into("<II", out, o, len(bin_chunk), 0x004E4942)
    out[o + 8:o + 8 + len(bin_chunk)] = bin_chunk
    return bytes(out)


# --- church -----------------------------------------------------------------

# West is +Z, south is +X, up is +Y. Metres.
TOWER_W = 7.1
TOWER_Z = 13.6
NAVE_HALF = 4.15
AISLE_S = 8.55
NAVE_WEST = 10.05
NAVE_EAST = -16.4
EAVE = 8.15
RIDGE = 13.05


def wall_point(x, y, z, normal, depth):
    return (x + normal[0] * depth, y, z + normal[2] * depth)


def pointed(b: Builder, mat, origin, right, up, normal, w, h):
    bh = h * 0.62
    hw = w / 2
    p0 = add(origin, add(mul(right, -hw), mul(up, 0)))
    p1 = add(origin, add(mul(right, hw), mul(up, 0)))
    p2 = add(origin, add(mul(right, hw), mul(up, bh)))
    p3 = add(origin, add(mul(right, -hw), mul(up, bh)))
    tip = add(origin, mul(up, h))
    b.quad(mat, p0, p1, p2, p3, (0, 0), (1, 0), (1, 0.62), (0, 0.62))
    b.tri(mat, p3, p2, tip, (0, 0.62), (1, 0.62), (0.5, 1))


def lancet(b: Builder, sill, normal, w, h, panes=1):
    """A stone-framed lancet sitting just proud of a wall. `sill` is the centre of the sill."""
    if PHOTO:
        return
    right, up = basis(normal)
    stone_o = add(sill, mul(normal, 0.045))
    glass_o = add(sill, mul(normal, 0.09))
    pointed(b, "frame", stone_o, right, up, normal, w + 0.28, h + 0.06)
    pointed(b, "win", glass_o, right, up, normal, w, h)
    # mullions and a small roundel in the head
    if panes > 1:
        gap = w / panes
        for i in range(1, panes):
            cx = add(glass_o, add(mul(right, -w / 2 + gap * i), mul(up, h * 0.34)))
            b.box("frame", cx[0], cx[1], cx[2], *(
                (0.07, h * 0.62, 0.05) if abs(normal[0]) > 0.5 else (0.05, h * 0.62, 0.07)
            ))
    head = add(glass_o, mul(up, h * 0.78))
    disk(b, "frame", head, right, up, 0.16 if panes == 1 else 0.22, 0.02)
    disk(b, "win", add(head, mul(normal, 0.02)), right, up, 0.09 if panes == 1 else 0.13, 0.02)


def disk(b: Builder, mat, center, right, up, radius, depth_bias=0):
    steps = 18
    c = center
    pts = []
    for i in range(steps):
        a = math.tau * i / steps
        pts.append(add(c, add(mul(right, math.cos(a) * radius), mul(up, math.sin(a) * radius))))
    for i in range(steps):
        b.tri(mat, c, pts[i], pts[(i + 1) % steps])


def ring(b: Builder, mat, center, right, up, inner, outer):
    steps = 20
    for i in range(steps):
        a0 = math.tau * i / steps
        a1 = math.tau * (i + 1) / steps
        def p(a, r):
            return add(center, add(mul(right, math.cos(a) * r), mul(up, math.sin(a) * r)))
        b.quad(mat, p(a0, inner), p(a1, inner), p(a1, outer), p(a0, outer))


def rose(b: Builder, center, normal, radius):
    if PHOTO:
        return
    right, up = basis(normal)
    c = add(center, mul(normal, 0.08))
    disk(b, "frame", add(center, mul(normal, 0.04)), right, up, radius + 0.16)
    disk(b, "win", c, right, up, radius)
    ring(b, "frame", add(c, mul(normal, 0.03)), right, up, radius * 0.34, radius * 0.48)
    for i in range(8):
        a = math.tau * i / 8
        spoke = add(c, add(mul(right, math.cos(a) * radius * 0.48), mul(up, math.sin(a) * radius * 0.48)))
        b.box(
            "frame", spoke[0], spoke[1], spoke[2],
            0.06 if abs(normal[0]) < 0.5 else 0.05,
            0.06,
            0.05 if abs(normal[0]) < 0.5 else 0.06,
        )
        # radial bar
        mid = add(c, add(mul(right, math.cos(a) * radius * 0.72), mul(up, math.sin(a) * radius * 0.22)))
    # a stone cross in the rose
    b.box("frame", c[0], c[1], c[2], *(
        (0.05, radius * 1.15, 0.05) if abs(normal[0]) > 0.5 else (0.05, radius * 1.15, 0.05)
    ))
    horiz = (radius * 0.7, 0.05, 0.05) if abs(normal[2]) > 0.5 else (0.05, 0.05, radius * 0.7)
    if abs(normal[0]) > 0.5:
        horiz = (0.05, 0.05, radius * 0.7)
    b.box("frame", c[0], c[1], c[2], *horiz)


def door(b: Builder, sill, normal, w, h):
    if PHOTO:
        return
    right, up = basis(normal)
    pointed(b, "frame", add(sill, mul(normal, 0.05)), right, up, normal, w + 0.36, h + 0.08)
    pointed(b, "wood", add(sill, mul(normal, 0.1)), right, up, normal, w, h)
    # two leaves suggested by a centre stile
    stile = add(sill, add(mul(normal, 0.14), mul(up, h * 0.32)))
    size = [0.06, h * 0.6, 0.04]
    if abs(normal[0]) > 0.5:
        size = [0.04, h * 0.6, 0.06]
    b.box("wood", stile[0], stile[1], stile[2], *size)


def buttress(b: Builder, x, z, normal, height):
    """A pier with a sloped stone cap, standing against a wall."""
    if PHOTO:
        return
    depth = 0.55
    width = 0.48
    ox = normal[0] * (depth / 2 + 0.02)
    oz = normal[2] * (depth / 2 + 0.02)
    sx = depth if abs(normal[0]) > 0.5 else width
    sz = width if abs(normal[0]) > 0.5 else depth
    b.box("plinth", x + ox, 0.55, z + oz, sx, 1.1, sz)
    b.box("brick", x + ox, 0.55 + (height - 1.1) / 2, z + oz, sx * 0.92, height - 1.35, sz * 0.92)
    cap_y = height - 0.15
    b.box("stone", x + ox * 0.7, cap_y, z + oz * 0.7, sx * 1.05, 0.16, sz * 1.05)
    b.box("stone", x + normal[0] * 0.12, cap_y + 0.18, z + normal[2] * 0.12, sx * 0.55, 0.22, sz * 0.55)


def string_course(b: Builder, x0, x1, y, z0, z1, normal, thick=0.14):
    if PHOTO:
        return
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    sx, sz = abs(x1 - x0), abs(z1 - z0)
    if abs(normal[2]) > 0.5:
        b.box("stone", cx, y, cz + normal[2] * 0.08, sx, thick, 0.18)
    else:
        b.box("stone", cx + normal[0] * 0.08, y, cz, 0.18, thick, sz)


def gable_coping(b: Builder, x_base, z, y_eave, y_peak, x_peak, face_z_sign, reach):
    """Stone slope along a gable edge. face_z_sign is the gable's facing direction on Z, or None for X."""
    steps = 8
    for i in range(steps):
        t0 = i / steps
        t1 = (i + 1) / steps
        y = y_eave + (y_peak - y_eave) * (t0 + t1) / 2
        if face_z_sign is None:
            x = x_base + (x_peak - x_base) * (t0 + t1) / 2
            b.box("stone", x, y, z, reach / steps * 1.15, 0.12, 0.22)
        else:
            zc = x_base + (x_peak - x_base) * (t0 + t1) / 2
            b.box("stone", z, y, zc, 0.22, 0.12, reach / steps * 1.15)


def shed_roof(b: Builder, x_high, x_low, z0, z1, y_high, y_low, overhang=0.28):
    """A single slope. x_high is the inner (nave) side."""
    z0 -= overhang if z0 < z1 else -overhang
    z1 += overhang if z1 > z0 else -overhang
    sign = 1 if x_low > x_high else -1
    x_low = x_low + sign * overhang
    c = ((x_high + x_low) / 2, (y_high + y_low) / 2 - 2, (z0 + z1) / 2)
    length_z = abs(z1 - z0)
    run = abs(x_low - x_high)
    a = (x_high, y_high, z0)
    b1 = (x_low, y_low, z0)
    c1 = (x_low, y_low, z1)
    d = (x_high, y_high, z1)
    b.quad_out("slate", a, b1, c1, d, c, (0, 0), (run, 0), (run, length_z), (0, length_z))
    # soffit
    b.quad_out("brick", d, c1, b1, a, (c[0], c[1] + 4, c[2]), (0, 0), (1, 0), (1, 1), (0, 1))
    # fascia
    b.box("stone", x_low - sign * 0.02, y_low - 0.08, (z0 + z1) / 2, 0.16, 0.16, abs(z1 - z0))


def gable_roof(b: Builder, x0, x1, z0, z1, y_eave, y_ridge):
    mid = (x0 + x1) / 2
    c = (mid, y_eave - 1, (z0 + z1) / 2)
    run = abs(x1 - mid)
    length_z = abs(z1 - z0)
    south = [(x1, y_eave, z0), (mid, y_ridge, z0), (mid, y_ridge, z1), (x1, y_eave, z1)]
    north = [(mid, y_ridge, z0), (x0, y_eave, z0), (x0, y_eave, z1), (mid, y_ridge, z1)]
    b.quad_out("slate", *south, c, (0, 0), (run, 0), (run, length_z), (0, length_z))
    b.quad_out("slate", *north, c, (0, 0), (run, 0), (run, length_z), (0, length_z))
    # gable ends in brick
    for z, inward in ((z1, -1), (z0, 1)):
        tri_c = (mid, y_eave, z + inward)
        b.tri_out("brick", (x0, y_eave, z), (x1, y_eave, z), (mid, y_ridge, z), tri_c)
    # ridge roll
    b.box("slate", mid, y_ridge + 0.06, (z0 + z1) / 2, 0.22, 0.12, abs(z1 - z0) + 0.2)


def cross_gable_roof(b: Builder, x0, x1, z0, z1, y_eave, y_ridge):
    """Ridge runs along X so the gable faces south and north."""
    midz = (z0 + z1) / 2
    c = ((x0 + x1) / 2, y_eave - 1, midz)
    run = abs(z1 - midz)
    span = abs(x1 - x0)
    west = [(x0, y_eave, z1), (x0, y_ridge, midz), (x1, y_ridge, midz), (x1, y_eave, z1)]
    east = [(x0, y_ridge, midz), (x0, y_eave, z0), (x1, y_eave, z0), (x1, y_ridge, midz)]
    b.quad_out("slate", *west, c, (0, 0), (run, 0), (run, span), (0, span))
    b.quad_out("slate", *east, c, (0, 0), (run, 0), (run, span), (0, span))
    for x, inward in ((x1, -1), (x0, 1)):
        b.tri_out(
            "brick",
            (x, y_eave, z0), (x, y_eave, z1), (x, y_ridge, midz),
            (x + inward, y_eave, midz),
        )
    b.box("slate", (x0 + x1) / 2, y_ridge + 0.06, midz, abs(x1 - x0) + 0.15, 0.12, 0.22)


def spire(b: Builder, cx, cz, y0, height, radius):
    tip = (cx, y0 + height, cz)
    steps = 8
    base = []
    for i in range(steps):
        a = math.tau * (i + 0.5) / steps
        base.append((cx + math.cos(a) * radius, y0, cz + math.sin(a) * radius))
    center = (cx, y0 + height * 0.4, cz)
    for i in range(steps):
        a = base[i]
        c = base[(i + 1) % steps]
        b.tri_out("slate", a, c, tip, center, (0, 0), (1, 0), (0.5, 1))
    # cap the base so you don't see inside from below
    for i in range(1, steps - 1):
        b.tri_out("slate", base[0], base[i + 1], base[i], (cx, y0 - 2, cz))


def pinnacle(b: Builder, x, z, y, h=2.7):
    b.box("stone", x, y + 0.35, z, 0.62, 0.7, 0.62)
    b.box("brick", x, y + 0.35 + 0.85, z, 0.42, 1.0, 0.42)
    spire(b, x, z, y + 1.7, h - 1.5, 0.28)


def belfry(b: Builder, cx, cz, y, half):
    """Two louvered lancets on each face of the tower."""
    if PHOTO:
        return
    for normal, along in (
        ((0, 0, 1), (1, 0, 0)),
        ((0, 0, -1), (-1, 0, 0)),
        ((1, 0, 0), (0, 0, -1)),
        ((-1, 0, 0), (0, 0, 1)),
    ):
        for side in (-1.15, 1.15):
            sill = (
                cx + normal[0] * (half - 0.05) + along[0] * side,
                y,
                cz + normal[2] * (half - 0.05) + along[2] * side,
            )
            lancet(b, sill, normal, 0.72, 2.55, panes=1)
            # louvers across the opening
            right, up = basis(normal)
            for k in range(4):
                slat = add(sill, add(mul(normal, 0.16), mul(up, 0.45 + k * 0.38)))
                sx = 0.7 if abs(normal[2]) > 0.5 else 0.08
                sz = 0.08 if abs(normal[2]) > 0.5 else 0.7
                b.box("metal", slat[0], slat[1], slat[2], sx, 0.08, sz)


def blind_arcade(b: Builder, cx, cz, y, half):
    if PHOTO:
        return
    for normal, along in (
        ((0, 0, 1), (1, 0, 0)),
        ((0, 0, -1), (-1, 0, 0)),
        ((1, 0, 0), (0, 0, -1)),
        ((-1, 0, 0), (0, 0, 1)),
    ):
        right, up = basis(normal)
        for i in range(-3, 4):
            origin = (
                cx + normal[0] * (half + 0.02) + along[0] * i * 0.78,
                y,
                cz + normal[2] * (half + 0.02) + along[2] * i * 0.78,
            )
            pointed(b, "stone", origin, right, up, normal, 0.42, 0.7)
            pointed(b, "plinth", add(origin, mul(normal, 0.03)), right, up, normal, 0.26, 0.5)


def tower(b: Builder):
    half = TOWER_W / 2
    cx, cz = 0.0, TOWER_Z
    # shaft
    b.box("plinth", cx, 0.7, cz, TOWER_W, 1.4, TOWER_W)
    b.box("brick", cx, 10.6, cz, TOWER_W, 18.4, TOWER_W)
    if not PHOTO:
        for sx in (-1, 1):
            for sz in (-1, 1):
                b.box("stone", cx + sx * (half - 0.08), 10.4, cz + sz * (half - 0.08), 0.28, 18.6, 0.28)
        for y in (4.15, 8.4, 13.15, 17.55):
            b.box("stone", cx, y, cz, TOWER_W + 0.12, 0.16, TOWER_W + 0.12)
        b.box("stone", 0, 0.12, cz + half + 0.35, 2.1, 0.24, 0.7)
        b.box("stone", 0, 0.34, cz + half + 0.55, 1.7, 0.2, 0.45)
    door(b, (0, 0.15, cz + half), (0, 0, 1), 1.35, 3.15)
    rose(b, (0, 5.55, cz + half), (0, 0, 1), 0.62)
    # a tall recessed lancet above the rose, on the west face
    lancet(b, (0, 7.15, cz + half), (0, 0, 1), 1.15, 4.4, panes=1)
    # south oculus
    rose(b, (half, 6.3, cz), (1, 0, 0), 0.42)
    belfry(b, cx, cz, 14.15, half)
    blind_arcade(b, cx, cz, 13.35, half)
    # parapet stage and roundels just under the spire
    b.box("brick", cx, 19.55, cz, TOWER_W + 0.08, 1.5, TOWER_W + 0.08)
    if not PHOTO:
        b.box("stone", cx, 20.35, cz, TOWER_W + 0.28, 0.18, TOWER_W + 0.28)
    for normal in ((0, 0, 1), (0, 0, -1), (1, 0, 0), (-1, 0, 0)):
        rose(b, (cx + normal[0] * half, 19.55, cz + normal[2] * half), normal, 0.38)
    for sx in (-1, 1):
        for sz in (-1, 1):
            pinnacle(b, cx + sx * (half - 0.15), cz + sz * (half - 0.15), 20.4, 3.1)
    spire(b, cx, cz, 20.45, 16.0, 2.25)
    # cross and weathercock
    tip = 20.45 + 15.2
    b.box("metal", cx, tip + 0.85, cz, 0.08, 1.7, 0.08)
    b.box("metal", cx, tip + 1.45, cz, 0.7, 0.08, 0.08)
    b.box("metal", cx, tip + 1.85, cz, 0.06, 0.55, 0.06)
    b.box("metal", cx + 0.28, tip + 2.05, cz, 0.5, 0.05, 0.05)
    b.box("metal", cx + 0.5, tip + 2.18, cz, 0.16, 0.22, 0.08)
    # stair turret on the north-east corner, tucked against the nave
    tx, tz = cx - half + 0.15, cz - half + 0.2
    stair_turret(b, tx, tz)


def stair_turret(b: Builder, cx, cz):
    y0, y1 = 0.0, 16.4
    r = 1.35
    steps = 8
    rings = 10
    for i in range(rings):
        ya = y0 + (y1 - y0) * i / rings
        yb = y0 + (y1 - y0) * (i + 1) / rings
        inner = (cx, (ya + yb) / 2, cz)
        for s in range(steps):
            a0 = math.tau * s / steps
            a1 = math.tau * (s + 1) / steps
            p0 = (cx + math.cos(a0) * r, ya, cz + math.sin(a0) * r)
            p1 = (cx + math.cos(a1) * r, ya, cz + math.sin(a1) * r)
            p2 = (cx + math.cos(a1) * r, yb, cz + math.sin(a1) * r)
            p3 = (cx + math.cos(a0) * r, yb, cz + math.sin(a0) * r)
            mat = "plinth" if ya < 1.3 else "brick"
            b.quad_out(mat, p0, p1, p2, p3, inner, (0, 0), (0.8, 0), (0.8, 1.4), (0, 1.4))
    b.box("stone", cx, 4.2, cz, r * 2.15, 0.12, r * 2.15)
    b.box("stone", cx, 9.4, cz, r * 2.15, 0.12, r * 2.15)
    b.box("stone", cx, y1, cz, r * 2.2, 0.16, r * 2.2)
    # conical cap
    tip = (cx, y1 + 3.4, cz)
    base = []
    for s in range(steps):
        a = math.tau * (s + 0.5) / steps
        base.append((cx + math.cos(a) * (r + 0.08), y1, cz + math.sin(a) * (r + 0.08)))
    center = (cx, y1 + 1.2, cz)
    for s in range(steps):
        b.tri_out("slate", base[s], base[(s + 1) % steps], tip, center)
    # a slit window on the north face
    lancet(b, (cx - r, 6.2, cz), (-1, 0, 0), 0.38, 1.5, panes=1)
    lancet(b, (cx - r, 11.2, cz), (-1, 0, 0), 0.38, 1.5, panes=1)


def nave_body(b: Builder):
    z0, z1 = NAVE_EAST, NAVE_WEST
    x0, x1 = -NAVE_HALF, NAVE_HALF
    length = z1 - z0
    # walls. The south and north faces are partly covered by aisles; build the
    # volume solid so the roof and the west/east ends read correctly.
    b.box("brick", 0, EAVE / 2, (z0 + z1) / 2, (x1 - x0), EAVE, length)
    gable_roof(b, x0 - 0.25, x1 + 0.25, z0 - 0.15, z1 + 0.15, EAVE - 0.05, RIDGE)
    if not PHOTO:
        b.box("stone", 0, EAVE - 0.05, (z0 + z1) / 2, (x1 - x0) + 0.2, 0.16, length)


def aisle(b: Builder, side: int):
    """side = 1 south, -1 north. Shed roof against the nave."""
    x_inner = side * NAVE_HALF
    x_outer = side * AISLE_S
    z0, z1 = NAVE_EAST + 0.4, 15.15
    wall_h = 5.65
    cx = (x_inner + x_outer) / 2
    cz = (z0 + z1) / 2
    sx = abs(x_outer - x_inner)
    sz = z1 - z0
    b.box("plinth", cx, 0.6, cz, sx, 1.2, sz)
    b.box("brick", cx, 0.6 + (wall_h - 1.2) / 2, cz, sx, wall_h - 1.2, sz)
    y_inner, y_outer = 7.55, 5.85
    shed_roof(b, x_inner, x_outer, z0, z1, y_inner, y_outer)
    # west face oculus (the flanking wings in the frontal photograph)
    west_normal = (0, 0, 1)
    rose(b, (cx, 3.5, z1), west_normal, 0.48)
    # stone base course and sill course along the outer wall
    string_course(b, x_outer, x_outer, 1.22, z0, z1, (side, 0, 0), 0.18)
    string_course(b, x_outer, x_outer, 3.15, z0, z1, (side, 0, 0), 0.14)


def transept(b: Builder):
    """Tall south gable immediately east of the tower, with a traceried lancet."""
    x0, x1 = NAVE_HALF, 12.6
    z0, z1 = 6.15, 10.2
    wall_h = 10.6
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    b.box("plinth", cx, 0.6, cz, x1 - x0, 1.2, z1 - z0)
    b.box("brick", cx, 0.6 + (wall_h - 1.2) / 2, cz, x1 - x0, wall_h - 1.2, z1 - z0)
    cross_gable_roof(b, x0 - 0.1, x1 + 0.35, z0, z1, wall_h - 0.15, wall_h + 2.5)
    # coping along the south gable
    peak_y = wall_h + 2.5
    for i, (za, zb) in enumerate(((z0, cz), (z1, cz))):
        steps = 7
        for s in range(steps):
            t = (s + 0.5) / steps
            z = za + (zb - za) * t
            y = (wall_h - 0.15) + (peak_y - (wall_h - 0.15)) * t
            b.box("stone", x1 + 0.08, y, z, 0.2, 0.12, (z1 - z0) / steps * 0.7)
    lancet(b, (x1, 1.35, cz), (1, 0, 0), 1.7, 6.3, panes=2)
    b.box("stone", x1 + 0.15, peak_y + 0.35, cz, 0.08, 0.7, 0.08)
    b.box("stone", x1 + 0.15, peak_y + 0.55, cz, 0.08, 0.08, 0.36)


def rose_chapel(b: Builder):
    """Lower south chapel with a round window, east of the transept."""
    x0, x1 = NAVE_HALF, 11.2
    z0, z1 = 2.35, 5.75
    wall_h = 7.7
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    b.box("plinth", cx, 0.6, cz, x1 - x0, 1.2, z1 - z0)
    b.box("brick", cx, 0.6 + (wall_h - 1.2) / 2, cz, x1 - x0, wall_h - 1.2, z1 - z0)
    cross_gable_roof(b, x0 - 0.05, x1 + 0.3, z0, z1, wall_h - 0.1, wall_h + 1.7)
    rose(b, (x1, 4.55, cz), (1, 0, 0), 0.78)
    # stepped stone caps echoing the photographed gable
    for s, zz in enumerate((z0 + 0.25, z1 - 0.25)):
        b.box("stone", x1 + 0.05, wall_h - 0.2, zz, 0.28, 0.16, 0.7)
        b.box("stone", x1 + 0.05, wall_h + 0.55, cz + (0.4 if s else -0.4), 0.24, 0.14, 0.55)


def south_bays(b: Builder):
    """The long south wall: a door and the photographed lancet rhythm."""
    normal = (1, 0, 0)
    x = AISLE_S
    # from just east of the rose chapel to the apse
    bays = [
        # (z centre, kind) kind is 'door', 'single', 'wide', 'pair'
        (-1.15, "door"),
        (-3.55, "single"),
        (-6.35, "wide"),
        (-9.35, "pair"),
        (-12.15, "pair"),
    ]
    # buttresses between and at the ends
    zs = [1.05, -2.3, -4.9, -7.85, -10.7, -13.55]
    for z in zs:
        buttress(b, x, z, normal, 5.45)
    door(b, (x, 0.12, -1.15), normal, 0.95, 2.25)
    b.box("stone", x + 0.28, 0.1, -1.15, 0.4, 0.2, 1.4)
    lancet(b, (x, 3.55, -1.15), normal, 0.55, 2.15, panes=1)
    lancet(b, (x, 2.55, -3.55), normal, 0.62, 2.7, panes=1)
    lancet(b, (x, 2.45, -6.35), normal, 0.95, 3.15, panes=1)
    lancet(b, (x, 2.45, -9.05), normal, 0.62, 2.85, panes=1)
    lancet(b, (x, 2.45, -9.85), normal, 0.62, 2.85, panes=1)
    lancet(b, (x, 2.45, -11.85), normal, 0.62, 2.85, panes=1)
    lancet(b, (x, 2.45, -12.65), normal, 0.62, 2.85, panes=1)
    # downpipe between the door and the next bay, as in the photograph
    b.box("metal", x + 0.18, 3.3, -2.35, 0.08, 6.2, 0.08)


def north_bays(b: Builder):
    normal = (-1, 0, 0)
    x = -AISLE_S
    for z in (12.2, 8.4, 4.6, 0.8, -3.0, -6.8, -10.6, -14.0):
        buttress(b, x, z, normal, 5.45)
    for z in (10.3, 6.5, 2.7, -1.1, -4.9, -8.7, -12.3):
        lancet(b, (x, 2.5, z), normal, 0.7, 2.9, panes=1)


def apse(b: Builder):
    """Polygonal east end with side chapels, lower than the nave."""
    cz = NAVE_EAST - 0.2
    # three facets
    facets = [
        ((-2.2, cz - 0.3), (-4.3, cz + 1.8), (-1, 0, 0)),
        ((2.2, cz - 0.3), (-2.2, cz - 0.3), (0, 0, -1)),
        ((4.3, cz + 1.8), (2.2, cz - 0.3), (1, 0, 0)),
    ]
    # solid core
    b.box("plinth", 0, 0.55, cz + 0.4, 8.6, 1.1, 3.6)
    b.box("brick", 0, 4.15, cz + 0.5, 8.2, 6.1, 3.2)
    # roof: a hip toward the east
    y_e = 7.15
    y_r = 10.4
    ridge_z = cz + 1.6
    c = (0, y_e - 1, cz)
    # south, east, north slopes plus a short west connection up to the nave roof
    south = [(4.5, y_e, cz + 2.2), (0.15, y_r, ridge_z), (-0.15, y_r, ridge_z), (-4.5, y_e, cz + 2.2)]
    # build three roof quads from the ridge to each outer edge
    edges = [
        ((-4.4, y_e, cz + 2.0), (4.4, y_e, cz + 2.0)),
        ((4.4, y_e, cz + 2.0), (4.6, y_e, cz + 3.4)),
        ((-4.6, y_e, cz + 3.4), (-4.4, y_e, cz + 2.0)),
    ]
    # simpler hip roof box-and-wedges
    hip(b, -4.5, 4.5, cz + 0.2, cz + 3.5, y_e, y_r)
    for p, normal in (
        ((0, 1.2, cz - 0.55), (0, 0, -1)),
        ((3.55, 1.25, cz + 1.15), (1, 0, 0)),
        ((-3.55, 1.25, cz + 1.15), (-1, 0, 0)),
    ):
        lancet(b, p, normal, 0.7, 3.6, panes=1)
    # side chapels, low, with their own lancet
    for sign in (-1, 1):
        chapel(b, sign, cz + 2.4)


def hip(b: Builder, x0, x1, z_east, z_west, y_eave, y_ridge):
    rz = (z_east * 0.45 + z_west * 0.55)
    peak = (0, y_ridge, rz)
    inside = (0, y_eave - 3, rz)
    b.tri_out("slate", (x0, y_eave, z_east), (x1, y_eave, z_east), peak, inside)
    b.tri_out("slate", (x1, y_eave, z_east), (x1, y_eave, z_west), peak, inside)
    b.tri_out("slate", (x1, y_eave, z_west), (x0, y_eave, z_west), peak, inside)
    b.tri_out("slate", (x0, y_eave, z_west), (x0, y_eave, z_east), peak, inside)


def chapel(b: Builder, sign, z):
    x = sign * (NAVE_HALF + 1.55)
    b.box("plinth", x, 0.5, z, 3.1, 1.0, 3.4)
    b.box("brick", x, 3.15, z, 3.0, 4.3, 3.3)
    y_e, y_r = 5.2, 6.7
    cross_gable_roof(b, x - sign * 1.7, x + sign * 1.7, z - 1.7, z + 1.7, y_e, y_r)
    lancet(b, (x + sign * 1.55, 1.15, z), (sign, 0, 0), 0.55, 2.3, panes=1)


def court(b: Builder):
    # A tight paved court. It stays inside the church's own footprint so the
    # spire, not the pavement, decides the frame.
    b.box("ground", 0.6, -0.08, -1.5, 26.5, 0.16, 38.5)


def lamps(b: Builder):
    for x, z in ((-1.35, TOWER_Z + TOWER_W / 2 + 0.15), (1.35, TOWER_Z + TOWER_W / 2 + 0.15)):
        b.box("metal", x, 2.4, z, 0.08, 0.7, 0.08)
        b.box("winlamp", x, 2.85, z, 0.22, 0.28, 0.22)
    b.box("metal", AISLE_S + 0.1, 2.15, -1.15, 0.08, 0.55, 0.08)
    b.box("winlamp", AISLE_S + 0.1, 2.5, -1.15, 0.2, 0.26, 0.2)


def build() -> Builder:
    b = Builder()
    court(b)
    nave_body(b)
    aisle(b, 1)
    aisle(b, -1)
    transept(b)
    rose_chapel(b)
    south_bays(b)
    north_bays(b)
    apse(b)
    tower(b)
    if not PHOTO:
        lamps(b)
    return b


def frame_camera(builder: Builder, theta_deg=56, phi_deg=70, fov_deg=12):
    lo, hi = builder.bounds()
    target = (
        (lo[0] + hi[0]) / 2,
        lo[1] + (hi[1] - lo[1]) * 0.42,
        (lo[2] + hi[2]) / 2,
    )
    theta = math.radians(theta_deg)
    phi = math.radians(phi_deg)
    fov = math.radians(fov_deg)
    pts = [p for bag in builder.pos.values() for p in bag]

    def inside(radius):
        eye = (
            target[0] + radius * math.sin(phi) * math.sin(theta),
            target[1] + radius * math.cos(phi),
            target[2] + radius * math.sin(phi) * math.cos(theta),
        )
        back = norm(sub(eye, target))
        right = norm(cross((0, 1, 0), back))
        up = cross(back, right)
        limit = math.tan(fov / 2) * 0.9
        aspect = 760 / 520
        for p in pts:
            d = sub(p, eye)
            z = -dot(d, back)
            if z < 0.25:
                return False
            x = abs(dot(d, right) / z)
            y = abs(dot(d, up) / z)
            if y > limit or x > limit * aspect:
                return False
        return True

    lo_r, hi_r = 20, 900
    best = None
    for _ in range(28):
        mid = (lo_r + hi_r) / 2
        if inside(mid):
            best, hi_r = mid, mid
        else:
            lo_r = mid
    if best is None:
        best = 900
    return {
        "theta": theta_deg,
        "phi": phi_deg,
        "fov": fov_deg,
        "radius": best * 1.04,
        "target": target,
    }


def preview(builder: Builder, path: Path, cam: dict, night=False, textures=None):
    w, h = 760, 520
    theta = math.radians(cam["theta"])
    phi = math.radians(cam["phi"])
    radius = cam["radius"]
    target = cam["target"]
    eye = np.array([
        target[0] + radius * math.sin(phi) * math.sin(theta),
        target[1] + radius * math.cos(phi),
        target[2] + radius * math.sin(phi) * math.cos(theta),
    ])
    tgt = np.array(target)
    back = eye - tgt
    back = back / np.linalg.norm(back)
    right = np.cross(np.array([0.0, 1.0, 0.0]), back)
    right /= np.linalg.norm(right)
    up = np.cross(back, right)
    fov = math.radians(cam["fov"])
    scale = 1 / math.tan(fov / 2)
    colors = {
        "brick": (176, 96, 64),
        "plinth": (122, 64, 48),
        "slate": (96, 104, 114),
        "stone": (186, 181, 171),
        "frame": (232, 204, 168),
        "wood": (92, 52, 32),
        "ground": (168, 162, 152),
        "metal": (40, 42, 46),
        "win": (255, 186, 80) if night else (28, 36, 48),
        "winlamp": (255, 210, 120) if night else (120, 100, 70),
        "photo": (190, 120, 80),
        "ph-west": (190, 110, 74),
        "ph-south": (186, 108, 72),
        "ph-wall": (184, 100, 68),
        "ph-roof": (90, 98, 108),
        "ph-spire": (70, 76, 86),
        "ph-east": (176, 96, 64),
    }
    textures = textures or {}
    img = np.zeros((h, w, 3), np.uint8)
    img[:] = (18, 24, 48) if night else (176, 206, 232)
    zbuf = np.full((h, w), np.inf)
    for mat, positions in builder.pos.items():
        col = np.array(colors.get(mat, (180, 140, 110)), np.float32)
        pos = np.array(positions, np.float32)
        nrm = np.array(builder.nrm[mat], np.float32)
        uvs_all = np.array(builder.uv[mat], np.float32)
        tex = textures.get(mat)
        idx = np.array(builder.idx[mat], np.int32).reshape(-1, 3)
        for tri in idx:
            p = pos[tri]
            n = nrm[tri[0]]
            light = max(0.28, float(np.dot(n, np.array([0.35, 0.75, 0.45]))))
            if night and mat in ("win", "winlamp"):
                shade = col
            else:
                shade = col * (0.55 + 0.5 * light) * (0.45 if night and mat not in ("win", "winlamp") else 1)
            uv = uvs_all[tri]
            rel = p - eye
            z = -rel @ back
            if np.any(z < 0.2):
                continue
            x = (rel @ right) / z * scale
            y = (rel @ up) / z * scale
            sx = (x * 0.5 + 0.5) * w
            sy = (1 - (y * 0.5 * (h / (w * 0.5 / (h * 0.5))) + 0.5)) 
            # match the frame aspect: x limit is tan*aspect, y limit is tan
            sx = (x / (760 / 520) * 0.5 + 0.5) * w
            sy = (1 - (y * 0.5 + 0.5)) * h
            minx, maxx = int(max(0, np.floor(sx.min()))), int(min(w - 1, np.ceil(sx.max())))
            miny, maxy = int(max(0, np.floor(sy.min()))), int(min(h - 1, np.ceil(sy.max())))
            if maxx <= minx or maxy <= miny:
                continue
            # barycentric
            x0, y0 = sx[0], sy[0]
            x1, y1 = sx[1], sy[1]
            x2, y2 = sx[2], sy[2]
            den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
            if abs(den) < 1e-6:
                continue
            ys, xs = np.mgrid[miny:maxy + 1, minx:maxx + 1]
            w0 = ((y1 - y2) * (xs - x2) + (x2 - x1) * (ys - y2)) / den
            w1 = ((y2 - y0) * (xs - x2) + (x0 - x2) * (ys - y2)) / den
            w2 = 1 - w0 - w1
            mask = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
            if not np.any(mask):
                continue
            zz = w0 * z[0] + w1 * z[1] + w2 * z[2]
            region = zbuf[miny:maxy + 1, minx:maxx + 1]
            update = mask & (zz < region)
            region[update] = zz[update]
            block = img[miny:maxy + 1, minx:maxx + 1]
            if tex is not None and np.any(update):
                th, tw = tex.shape[:2]
                inv = 1.0 / np.maximum(z, 1e-3)
                w0z, w1z, w2z = w0 * inv[0], w1 * inv[1], w2 * inv[2]
                denom = w0z + w1z + w2z
                uu = (w0z * uv[0, 0] + w1z * uv[1, 0] + w2z * uv[2, 0]) / denom
                vv = (w0z * uv[0, 1] + w1z * uv[1, 1] + w2z * uv[2, 1]) / denom
                px = np.clip((uu * (tw - 1)).astype(np.int32), 0, tw - 1)
                py = np.clip((vv * (th - 1)).astype(np.int32), 0, th - 1)
                sampled = tex[py, px].astype(np.float32)
                if night and not str(mat).startswith("ph-"):
                    sampled *= 0.45
                elif night and str(mat).startswith("ph-"):
                    sampled *= 0.55
                sampled *= 0.72 + 0.35 * light
                block[update] = np.clip(sampled[update], 0, 255).astype(np.uint8)
            else:
                block[update] = np.clip(shade, 0, 255).astype(np.uint8)
    Image.fromarray(img, "RGB").save(path, quality=90)
    print("preview", path)



def _pil_jpeg(image: Image.Image, quality=88) -> bytes:
    import io
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def main():
    print("building mesh")
    builder = build()
    tris = sum(len(v) // 3 for v in builder.idx.values())
    lo, hi = builder.bounds()
    print(f"triangles {tris} bounds {lo} {hi}")
    brick, slate, pave = make_brick(), make_slate(), make_pave()
    brick.save("/tmp/church/tile-brick.jpg", quality=90)
    slate.save("/tmp/church/tile-slate.jpg", quality=90)
    pave.save("/tmp/church/tile-pave.jpg", quality=90)
    images = {
        "brick": _pil_jpeg(brick),
        "slate": _pil_jpeg(slate),
        "pave": _pil_jpeg(pave),
    }
    mimes = {name: "image/jpeg" for name in images}
    cam = frame_camera(builder, theta_deg=54, phi_deg=70, fov_deg=12)
    print(
        "camera",
        f"{cam['theta']}deg {cam['phi']}deg {cam['radius']:.2f}m",
        "target",
        " ".join(f"{v:.3f}m" for v in cam["target"]),
        f"fov {cam['fov']}deg",
    )
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    day = build_glb(builder, images, night=False, mimes=mimes)
    night = build_glb(builder, images, night=True, mimes=mimes)
    (MODEL_DIR / "church-day.glb").write_bytes(day)
    (MODEL_DIR / "church-night.glb").write_bytes(night)
    print("glb", len(day), len(night))
    rgb = {
        "brick": np.asarray(brick),
        "plinth": np.asarray(brick),
        "slate": np.asarray(slate),
        "ground": np.asarray(pave),
    }
    preview(builder, Path("/tmp/church/preview-day.jpg"), cam, night=False, textures=rgb)
    preview(builder, Path("/tmp/church/preview-night.jpg"), cam, night=True, textures=rgb)
    front = dict(cam)
    front["theta"] = 8
    preview(builder, Path("/tmp/church/preview-front.jpg"), front, night=False, textures=rgb)
    meta = {
        "cameraOrbit": f"{cam['theta']}deg {cam['phi']}deg {cam['radius']:.2f}m",
        "cameraTarget": " ".join(f"{v:.3f}m" for v in cam["target"]),
        "fieldOfView": f"{cam['fov']}deg",
    }
    Path("/tmp/church/camera.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
