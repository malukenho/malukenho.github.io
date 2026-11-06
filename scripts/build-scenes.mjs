/**
 * Builds the sample dioramas: a .glb per place and a matching poster PNG.
 * Geometry is shared so the poster camera matches the viewer.
 *
 *   node scripts/build-scenes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelDir = path.join(root, "assets/models");
const posterDir = path.join(root, "assets/posters");

const hex = (h) => {
  const n = h.replace("#", "");
  return [parseInt(n.slice(0, 2), 16) / 255, parseInt(n.slice(2, 4), 16) / 255, parseInt(n.slice(4, 6), 16) / 255];
};

function createBuilder() {
  const materials = new Map();
  const tris = [];
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  function mat(name, color, opts = {}) {
    if (!materials.has(name)) {
      materials.set(name, {
        name,
        color: hex(color),
        roughness: opts.roughness ?? 0.78,
        metal: opts.metal ?? 0,
        glow: !!opts.glow,
        positions: [],
        normals: [],
      });
    }
    return name;
  }

  function pushTri(name, p, n) {
    const m = materials.get(name);
    for (let i = 0; i < 3; i++) {
      m.positions.push(p[i][0], p[i][1], p[i][2]);
      m.normals.push(n[i][0], n[i][1], n[i][2]);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[i][k]);
        max[k] = Math.max(max[k], p[i][k]);
      }
    }
    tris.push({ name, p, n, color: m.color, glow: m.glow });
  }

  function tri(name, a, b, c, na, nb, nc) {
    if (!na) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      na = nb = nc = [nx, ny, nz];
    }
    pushTri(name, [a, b, c], [na, nb, nc]);
  }

  function box(name, cx, cy, cz, w, h, d) {
    const x = w / 2, y = h / 2, z = d / 2;
    const faces = [
      [[cx - x, cy - y, cz + z], [cx + x, cy - y, cz + z], [cx + x, cy + y, cz + z], [cx - x, cy + y, cz + z], [0, 0, 1]],
      [[cx + x, cy - y, cz - z], [cx - x, cy - y, cz - z], [cx - x, cy + y, cz - z], [cx + x, cy + y, cz - z], [0, 0, -1]],
      [[cx + x, cy - y, cz + z], [cx + x, cy - y, cz - z], [cx + x, cy + y, cz - z], [cx + x, cy + y, cz + z], [1, 0, 0]],
      [[cx - x, cy - y, cz - z], [cx - x, cy - y, cz + z], [cx - x, cy + y, cz + z], [cx - x, cy + y, cz - z], [-1, 0, 0]],
      [[cx - x, cy + y, cz + z], [cx + x, cy + y, cz + z], [cx + x, cy + y, cz - z], [cx - x, cy + y, cz - z], [0, 1, 0]],
      [[cx - x, cy - y, cz - z], [cx + x, cy - y, cz - z], [cx + x, cy - y, cz + z], [cx - x, cy - y, cz + z], [0, -1, 0]],
    ];
    for (const f of faces) {
      const n = f[4];
      tri(name, f[0], f[1], f[2], n, n, n);
      tri(name, f[0], f[2], f[3], n, n, n);
    }
  }

  function cylinder(name, cx, cy, cz, r, h, seg = 18, axis = "y") {
    const hh = h / 2;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);
      let p0, p1, p2, p3, n0, n1;
      if (axis === "y") {
        p0 = [cx + c0 * r, cy - hh, cz + s0 * r];
        p1 = [cx + c1 * r, cy - hh, cz + s1 * r];
        p2 = [cx + c1 * r, cy + hh, cz + s1 * r];
        p3 = [cx + c0 * r, cy + hh, cz + s0 * r];
        n0 = [c0, 0, s0]; n1 = [c1, 0, s1];
      } else if (axis === "z") {
        p0 = [cx + c0 * r, cy + s0 * r, cz - hh];
        p1 = [cx + c1 * r, cy + s1 * r, cz - hh];
        p2 = [cx + c1 * r, cy + s1 * r, cz + hh];
        p3 = [cx + c0 * r, cy + s0 * r, cz + hh];
        n0 = [c0, s0, 0]; n1 = [c1, s1, 0];
      } else {
        p0 = [cx - hh, cy + c0 * r, cz + s0 * r];
        p1 = [cx - hh, cy + c1 * r, cz + s1 * r];
        p2 = [cx + hh, cy + c1 * r, cz + s1 * r];
        p3 = [cx + hh, cy + c0 * r, cz + s0 * r];
        n0 = [0, c0, s0]; n1 = [0, c1, s1];
      }
      tri(name, p0, p1, p2, n0, n1, n1);
      tri(name, p0, p2, p3, n0, n1, n0);
      const top = axis === "y" ? [0, 1, 0] : axis === "z" ? [0, 0, 1] : [1, 0, 0];
      const bot = top.map((v) => -v);
      const c = [cx, cy, cz];
      const cTop = c.slice(); const cBot = c.slice();
      const idx = axis === "y" ? 1 : axis === "z" ? 2 : 0;
      cTop[idx] += hh; cBot[idx] -= hh;
      tri(name, cTop, p3, p2, top, top, top);
      tri(name, cBot, p1, p0, bot, bot, bot);
    }
  }

  function sphere(name, cx, cy, cz, r, lat = 10, lon = 14) {
    const grid = [];
    for (let i = 0; i <= lat; i++) {
      const v = i / lat;
      const phi = v * Math.PI;
      const row = [];
      for (let j = 0; j <= lon; j++) {
        const u = j / lon;
        const theta = u * Math.PI * 2;
        const n = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
        row.push({ p: [cx + n[0] * r, cy + n[1] * r, cz + n[2] * r], n });
      }
      grid.push(row);
    }
    for (let i = 0; i < lat; i++) {
      for (let j = 0; j < lon; j++) {
        const a = grid[i][j], b = grid[i + 1][j], c = grid[i + 1][j + 1], d = grid[i][j + 1];
        tri(name, a.p, b.p, c.p, a.n, b.n, c.n);
        tri(name, a.p, c.p, d.p, a.n, c.n, d.n);
      }
    }
  }

  function cone(name, cx, cy, cz, r, h, seg = 16) {
    const tip = [cx, cy + h / 2, cz];
    const yb = cy - h / 2;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * r, yb, cz + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, yb, cz + Math.sin(a1) * r];
      tri(name, p0, p1, tip);
      tri(name, [cx, yb, cz], p1, p0, [0, -1, 0], [0, -1, 0], [0, -1, 0]);
    }
  }

  return { mat, box, cylinder, sphere, cone, materials, tris, bounds: () => ({ min, max }) };
}

function plinth(b, w = 3.55, d = 2.45) {
  const stone = b.mat("plinth", "#e4dcd0", { roughness: 0.9 });
  const lip = b.mat("plinth-lip", "#d4cbc0", { roughness: 0.92 });
  b.box(lip, 0, 0.035, 0, w + 0.08, 0.07, d + 0.08);
  b.box(stone, 0, 0.09, 0, w, 0.07, d);
  return 0.125;
}

function windowFace(b, x, y, z, w, h, depth, face = "z") {
  const frame = b.mat("frame", "#f4efe6", { roughness: 0.55 });
  const glass = b.mat("win", "#8eafbe", { roughness: 0.18, glow: true });
  const t = 0.045;
  if (face === "z") {
    b.box(frame, x, y, z, w, h, depth);
    b.box(glass, x, y, z + depth * 0.35, w - t * 2, h - t * 2, depth * 0.45);
  } else {
    b.box(frame, x, y, z, depth, h, w);
    b.box(glass, x + depth * 0.35, y, z, depth * 0.45, h - t * 2, w - t * 2);
  }
}

function lamp(b, x, y, z) {
  const metal = b.mat("metal", "#5c656e", { roughness: 0.35, metal: 0.6 });
  const glow = b.mat("win-lamp", "#f0d7a4", { roughness: 0.4, glow: true });
  b.cylinder(metal, x, y, z, 0.025, 0.72, 8);
  b.sphere(glow, x, y + 0.4, z, 0.055, 8, 10);
}

function tree(b, x, z, scale = 1) {
  const trunk = b.mat("trunk", "#6d4c32", { roughness: 0.9 });
  const leaf = b.mat("leaf", "#6e9a58", { roughness: 0.85 });
  const leaf2 = b.mat("leaf-deep", "#5d874c", { roughness: 0.88 });
  const y0 = 0.125;
  b.cylinder(trunk, x, y0 + 0.28 * scale, z, 0.055 * scale, 0.56 * scale, 8);
  b.sphere(leaf, x, y0 + 0.72 * scale, z, 0.34 * scale, 8, 10);
  b.sphere(leaf2, x + 0.12 * scale, y0 + 0.6 * scale, z + 0.06, 0.22 * scale, 7, 9);
}

function bench(b, x, z, rotZ = false) {
  const wood = b.mat("bench", "#8d5b3c", { roughness: 0.8 });
  const metal = b.mat("metal", "#5c656e", { roughness: 0.35, metal: 0.6 });
  const y = 0.125;
  if (!rotZ) {
    b.box(wood, x, y + 0.22, z, 0.7, 0.04, 0.28);
    b.box(wood, x, y + 0.38, z - 0.12, 0.7, 0.22, 0.04);
    for (const dx of [-0.28, 0.28]) b.box(metal, x + dx, y + 0.11, z, 0.04, 0.22, 0.24);
  }
}

function boat(b, x, z) {
  const hull = b.mat("hull", "#f2efe8", { roughness: 0.55 });
  const trim = b.mat("hull-trim", "#2f4a55", { roughness: 0.5 });
  const cabin = b.mat("cabin", "#d98a4a", { roughness: 0.6 });
  b.box(hull, x, 0.2, z, 0.62, 0.1, 0.22);
  b.box(trim, x, 0.26, z, 0.66, 0.03, 0.26);
  b.box(cabin, x + 0.08, 0.34, z, 0.22, 0.14, 0.16);
}

const scenes = [
  {
    id: "2026-08-16-jardim",
    file: "jardim",
    date: "2026-08-16",
    lat: 51.4736,
    lng: 5.6518,
    category: "verde",
    theta: 28,
    phi: 64,
    fov: 13,
    name: { pt: "Jardim", en: "Garden" },
    seen: { pt: "no Jardim", en: "the Garden" },
    where: { pt: "Helmond", en: "Helmond" },
    build(b) {
      const y = plinth(b, 3.7, 2.6);
      const grass = b.mat("grass", "#7ea15f", { roughness: 0.95 });
      const grass2 = b.mat("grass-dark", "#6b8d52", { roughness: 0.95 });
      const path = b.mat("path", "#d9d0c2", { roughness: 0.9 });
      const water = b.mat("water", "#8eb7bf", { roughness: 0.25 });
      b.box(grass, 0, y + 0.03, 0, 3.35, 0.06, 2.25);
      b.box(grass2, -0.9, y + 0.035, -0.45, 1.1, 0.05, 0.9);
      b.box(path, 0.15, y + 0.07, 0.15, 0.42, 0.03, 2.05);
      b.box(water, -1.35, y + 0.02, 0.15, 0.55, 0.04, 2.1);
      tree(b, -0.85, -0.55, 1.15);
      tree(b, 1.15, -0.35, 0.85);
      tree(b, 1.25, 0.75, 0.62);
      bench(b, 0.55, 0.35);
      lamp(b, -0.15, y + 0.36, -0.85);
      const flower = b.mat("flower", "#d36b58", { roughness: 0.7 });
      b.sphere(flower, -0.35, y + 0.1, 0.7, 0.07, 6, 8);
      b.sphere(flower, -0.5, y + 0.09, 0.55, 0.05, 6, 8);
    },
  },
  {
    id: "2026-09-04-canal",
    file: "canal",
    date: "2026-09-04",
    lat: 51.4796,
    lng: 5.6502,
    category: "rua",
    theta: 36,
    phi: 82,
    fov: 10,
    name: { pt: "Casa do canal", en: "Canal house" },
    seen: { pt: "na Casa do canal", en: "the Canal house" },
    where: { pt: "Helmond", en: "Helmond" },
    build(b) {
      const y = plinth(b, 3.6, 2.55);
      const water = b.mat("water", "#7eacb6", { roughness: 0.22 });
      const brick = b.mat("brick", "#b55245", { roughness: 0.86 });
      const brickDark = b.mat("brick-dark", "#8a4038", { roughness: 0.88 });
      const roof = b.mat("roof", "#3c434e", { roughness: 0.7 });
      const door = b.mat("door", "#1e3d34", { roughness: 0.55 });
      const stone = b.mat("step", "#cfc6ba", { roughness: 0.8 });
      b.box(water, 0, y + 0.015, 0.95, 3.35, 0.03, 0.62);
      boat(b, 0.85, 0.95);
      b.box(brick, -0.15, y + 0.95, -0.15, 1.35, 1.7, 1.05);
      b.box(brickDark, -0.15, y + 1.84, -0.15, 1.42, 0.08, 1.12);
      b.box(roof, -0.15, y + 1.98, -0.15, 1.15, 0.22, 0.7);
      b.box(roof, -0.15, y + 2.16, -0.15, 0.78, 0.16, 0.5);
      b.box(roof, -0.15, y + 2.3, -0.15, 0.42, 0.12, 0.32);
      b.box(door, -0.15, y + 0.48, 0.39, 0.34, 0.72, 0.04);
      b.box(stone, -0.15, y + 0.08, 0.48, 0.46, 0.06, 0.18);
      windowFace(b, -0.5, y + 1.25, 0.38, 0.32, 0.46, 0.06);
      windowFace(b, 0.18, y + 1.25, 0.38, 0.32, 0.46, 0.06);
      windowFace(b, -0.5, y + 0.55, 0.38, 0.32, 0.4, 0.06);
      windowFace(b, 0.55, y + 0.85, 0.1, 0.32, 0.46, 0.06, "x");
      windowFace(b, 0.55, y + 1.4, 0.1, 0.32, 0.4, 0.06, "x");
      const pot = b.mat("pot", "#d27a45", { roughness: 0.7 });
      b.cylinder(pot, 0.35, y + 0.1, 0.55, 0.07, 0.1, 8);
      lamp(b, -1.35, y + 0.36, 0.35);
    },
  },
  {
    id: "2026-09-20-castelo",
    file: "castelo",
    date: "2026-09-20",
    lat: 51.4758,
    lng: 5.6554,
    category: "marco",
    theta: 32,
    phi: 81,
    fov: 11,
    name: { pt: "Castelo", en: "Castle" },
    seen: { pt: "no Castelo", en: "the Castle" },
    where: { pt: "Helmond", en: "Helmond" },
    build(b) {
      const y = plinth(b, 4.05, 2.7);
      const moat = b.mat("water", "#7fa8ae", { roughness: 0.22 });
      const wall = b.mat("wall", "#a3988c", { roughness: 0.9 });
      const wallDark = b.mat("wall-dark", "#847b72", { roughness: 0.9 });
      const roof = b.mat("tower-roof", "#7a4038", { roughness: 0.75 });
      const gate = b.mat("gate", "#2a2724", { roughness: 0.8 });
      const bridge = b.mat("bridge", "#8d6244", { roughness: 0.8 });
      b.box(moat, 0, y + 0.02, 0.15, 3.7, 0.04, 2.15);
      b.box(wall, 0, y + 0.55, -0.25, 2.15, 0.85, 0.95);
      b.box(wallDark, 0, y + 1.02, -0.25, 2.25, 0.1, 1.02);
      b.box(gate, 0, y + 0.42, 0.24, 0.46, 0.62, 0.08);
      b.box(bridge, 0, y + 0.1, 0.72, 0.48, 0.08, 0.7);
      for (const x of [-0.95, 0.95]) {
        b.cylinder(wall, x, y + 0.7, -0.15, 0.38, 1.35, 12);
        b.cylinder(wallDark, x, y + 1.42, -0.15, 0.44, 0.1, 12);
        b.cone(roof, x, y + 1.78, -0.15, 0.46, 0.62, 12);
        windowFace(b, x, y + 0.85, 0.22, 0.2, 0.32, 0.05);
      }
      windowFace(b, -0.45, y + 0.72, 0.24, 0.22, 0.32, 0.05);
      windowFace(b, 0.45, y + 0.72, 0.24, 0.22, 0.32, 0.05);
      const flag = b.mat("flag", "#d4654a", { roughness: 0.6 });
      b.cylinder(wallDark, 0, y + 1.25, -0.25, 0.02, 0.55, 6);
      b.box(flag, 0.12, y + 1.46, -0.25, 0.22, 0.12, 0.02);
    },
  },
  {
    id: "2026-10-06-estacao",
    file: "estacao",
    date: "2026-10-06",
    lat: 51.4746,
    lng: 5.6642,
    category: "rua",
    theta: 26,
    phi: 80,
    fov: 11,
    name: { pt: "Estação", en: "Station" },
    seen: { pt: "na Estação", en: "the Station" },
    where: { pt: "Helmond", en: "Helmond" },
    build(b) {
      const y = plinth(b, 4.1, 2.5);
      const platform = b.mat("platform", "#d5d2cc", { roughness: 0.85 });
      const line = b.mat("line", "#e2c15a", { roughness: 0.6 });
      const glass = b.mat("glass-wall", "#b7cdd6", { roughness: 0.15 });
      const frame = b.mat("steel", "#5e686f", { roughness: 0.3, metal: 0.7 });
      const roof = b.mat("canopy", "#e8e4dc", { roughness: 0.55 });
      const clock = b.mat("clock", "#f7f4ee", { roughness: 0.4 });
      const hand = b.mat("hand", "#2c3136", { roughness: 0.4 });
      b.box(platform, 0, y + 0.06, 0.15, 3.7, 0.08, 1.55);
      b.box(line, 0, y + 0.11, 0.72, 3.4, 0.015, 0.04);
      b.box(glass, -0.15, y + 0.72, -0.45, 1.7, 1.05, 0.7);
      b.box(frame, -0.15, y + 0.72, -0.45, 1.78, 0.05, 0.78);
      b.box(frame, -0.15, y + 1.27, -0.45, 1.78, 0.05, 0.78);
      windowFace(b, -0.55, y + 0.7, -0.05, 0.4, 0.55, 0.05);
      windowFace(b, 0.25, y + 0.7, -0.05, 0.4, 0.55, 0.05);
      b.cylinder(clock, 0.85, y + 0.95, -0.08, 0.16, 0.04, 14, "z");
      b.box(hand, 0.85, y + 0.98, -0.05, 0.012, 0.1, 0.02);
      for (const x of [-1.35, -0.15, 1.05]) {
        b.cylinder(frame, x, y + 0.85, 0.35, 0.035, 1.15, 8);
      }
      b.box(roof, 0.05, y + 1.48, 0.15, 3.15, 0.05, 1.15);
      bench(b, 1.15, 0.4);
    },
  },
  {
    id: "2026-10-19-cafe",
    file: "cafe",
    date: "2026-10-19",
    lat: 51.4824,
    lng: 5.6566,
    category: "rua",
    theta: 38,
    phi: 82,
    fov: 10.5,
    name: { pt: "Café do mercado", en: "Market café" },
    seen: { pt: "no Café do mercado", en: "the Market café" },
    where: { pt: "Helmond", en: "Helmond" },
    build(b) {
      const y = plinth(b, 3.7, 2.55);
      const wall = b.mat("plaster", "#f3ecdf", { roughness: 0.82 });
      const trim = b.mat("trim", "#2f4a40", { roughness: 0.6 });
      const awning = b.mat("awning", "#c4553d", { roughness: 0.7 });
      const awning2 = b.mat("awning-stripe", "#f2e4d4", { roughness: 0.7 });
      const door = b.mat("door-wood", "#6b412c", { roughness: 0.62 });
      const table = b.mat("table", "#f7f3ea", { roughness: 0.5 });
      const leg = b.mat("metal", "#5c656e", { roughness: 0.35, metal: 0.55 });
      b.box(wall, -0.05, y + 0.7, -0.25, 2.05, 1.15, 1.05);
      b.box(trim, -0.05, y + 1.3, -0.25, 2.15, 0.08, 1.12);
      b.box(awning, -0.15, y + 0.95, 0.42, 1.35, 0.05, 0.42);
      b.box(awning2, -0.55, y + 0.955, 0.42, 0.1, 0.055, 0.42);
      b.box(awning2, 0.15, y + 0.955, 0.42, 0.1, 0.055, 0.42);
      b.box(door, 0.55, y + 0.48, 0.29, 0.36, 0.74, 0.04);
      windowFace(b, -0.45, y + 0.62, 0.29, 0.7, 0.5, 0.05);
      windowFace(b, 1.0, y + 0.62, -0.1, 0.4, 0.48, 0.05, "x");
      const placeTable = (x, z) => {
        b.cylinder(leg, x, y + 0.22, z, 0.02, 0.28, 6);
        b.cylinder(table, x, y + 0.38, z, 0.16, 0.035, 12);
      };
      placeTable(0.85, 0.72);
      placeTable(1.25, 0.58);
      const cup = b.mat("cup", "#f7f7f5", { roughness: 0.35 });
      b.cylinder(cup, 0.85, y + 0.43, 0.72, 0.035, 0.05, 8);
      const plant = b.mat("leaf", "#6e9a58", { roughness: 0.8 });
      const pot = b.mat("pot", "#d27a45", { roughness: 0.7 });
      b.cylinder(pot, -1.15, y + 0.1, 0.4, 0.09, 0.12, 8);
      b.sphere(plant, -1.15, y + 0.24, 0.4, 0.11, 7, 9);
    },
  },
  {
    id: "2026-10-30-escritorio",
    file: "escritorio",
    date: "2026-10-30",
    lat: 51.4804,
    lng: 5.6614,
    category: "interior",
    theta: 16,
    phi: 74,
    fov: 12.5,
    name: { pt: "Escritório", en: "Study" },
    seen: { pt: "no Escritório", en: "the Study" },
    where: { pt: "Helmond", en: "Helmond" },
    build(b) {
      const y = plinth(b, 3.4, 2.5);
      const floor = b.mat("floor", "#c4a574", { roughness: 0.75 });
      const wall = b.mat("room", "#f6f1e8", { roughness: 0.9 });
      const desk = b.mat("desk", "#8d5a38", { roughness: 0.65 });
      const shelf = b.mat("shelf", "#f3eee6", { roughness: 0.7 });
      const screen = b.mat("win-screen", "#b9d4c8", { roughness: 0.25, glow: true });
      const chair = b.mat("chair", "#3d4c57", { roughness: 0.55 });
      const rug = b.mat("rug", "#b45448", { roughness: 0.9 });
      b.box(floor, 0, y + 0.04, 0, 2.4, 0.06, 1.7);
      b.box(wall, 0, y + 0.78, -0.82, 2.4, 1.4, 0.08);
      b.box(wall, -1.16, y + 0.78, 0, 0.08, 1.4, 1.7);
      b.box(rug, 0.15, y + 0.08, 0.15, 1.15, 0.02, 0.7);
      b.box(desk, -0.35, y + 0.4, -0.45, 1.05, 0.06, 0.52);
      b.box(desk, -0.75, y + 0.22, -0.45, 0.05, 0.36, 0.48);
      b.box(desk, 0.05, y + 0.22, -0.45, 0.05, 0.36, 0.48);
      b.box(screen, -0.25, y + 0.68, -0.62, 0.46, 0.3, 0.03);
      b.box(chair, 0.15, y + 0.28, 0.05, 0.32, 0.06, 0.32);
      b.box(chair, 0.15, y + 0.48, -0.08, 0.32, 0.32, 0.05);
      b.cylinder(chair, 0.15, y + 0.16, 0.05, 0.03, 0.22, 6);
      b.box(shelf, -1.02, y + 0.7, -0.15, 0.16, 0.7, 0.7);
      const books = ["#b45448", "#3d5c73", "#d7b15a", "#6e8a52", "#8d5a38"];
      books.forEach((c, i) => {
        const m = b.mat("book-" + i, c, { roughness: 0.7 });
        b.box(m, -1.02, y + 0.48 + (i % 2) * 0.28, -0.4 + i * 0.12, 0.08, 0.2, 0.1);
      });
      windowFace(b, 0.45, y + 0.9, -0.76, 0.46, 0.5, 0.06);
      lamp(b, 0.85, y + 0.36, -0.55);
      const paper = b.mat("paper", "#fbfaf6", { roughness: 0.8 });
      b.box(paper, -0.55, y + 0.445, -0.4, 0.22, 0.01, 0.28);
    },
  },
  {
    id: "2026-11-05-cozinha",
    file: "cozinha",
    date: "2026-11-05",
    lat: 51.4812,
    lng: 5.6634,
    category: "interior",
    theta: 18,
    phi: 74,
    fov: 12.5,
    name: { pt: "Cozinha", en: "Kitchen" },
    seen: { pt: "na Cozinha", en: "the Kitchen" },
    where: { pt: "Helmond", en: "Helmond" },
    build(b) {
      const y = plinth(b, 3.45, 2.55);
      const floor = b.mat("tile", "#e6e1d8", { roughness: 0.55 });
      const wall = b.mat("room", "#f7f3ec", { roughness: 0.88 });
      const cab = b.mat("cabinet", "#f3eee4", { roughness: 0.6 });
      const oak = b.mat("oak", "#b5814e", { roughness: 0.62 });
      const counter = b.mat("counter", "#fbfaf7", { roughness: 0.35 });
      const stove = b.mat("stove", "#2e3438", { roughness: 0.4, metal: 0.3 });
      const stool = b.mat("stool", "#3e4a44", { roughness: 0.55 });
      const fruit = b.mat("fruit", "#d86a45", { roughness: 0.55 });
      const leaf = b.mat("herb", "#6e9a58", { roughness: 0.8 });
      b.box(floor, 0, y + 0.04, 0, 2.45, 0.06, 1.75);
      b.box(wall, 0, y + 0.8, -0.84, 2.45, 1.45, 0.08);
      b.box(wall, -1.18, y + 0.8, 0, 0.08, 1.45, 1.75);
      b.box(oak, -0.25, y + 0.32, -0.5, 1.7, 0.48, 0.5);
      b.box(counter, -0.25, y + 0.58, -0.48, 1.78, 0.05, 0.56);
      b.box(cab, -0.55, y + 1.15, -0.68, 0.9, 0.42, 0.28);
      b.box(stove, 0.45, y + 0.4, -0.55, 0.42, 0.12, 0.4);
      windowFace(b, -0.15, y + 0.95, -0.78, 0.55, 0.42, 0.06);
      const pendant = b.mat("win-pendant", "#f3ddb0", { roughness: 0.35, glow: true });
      b.cylinder(b.mat("cord", "#c8c2b8", { roughness: 0.5 }), 0.45, y + 1.25, 0.25, 0.008, 0.35, 5);
      b.sphere(pendant, 0.45, y + 1.02, 0.25, 0.07, 8, 10);
      b.box(oak, 0.35, y + 0.46, 0.42, 0.78, 0.045, 0.46);
      for (const x of [0.12, 0.58]) {
        b.cylinder(stool, x, y + 0.24, 0.72, 0.03, 0.36, 8);
        b.cylinder(stool, x, y + 0.44, 0.72, 0.1, 0.04, 10);
      }
      b.sphere(fruit, -0.7, y + 0.66, -0.4, 0.05, 6, 8);
      b.sphere(fruit, -0.6, y + 0.65, -0.48, 0.045, 6, 8);
      b.cylinder(cab, 0.95, y + 0.16, -0.45, 0.1, 0.18, 8);
      b.sphere(leaf, 0.95, y + 0.34, -0.45, 0.12, 7, 9);
    },
  },
];

function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, sum]);
}
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

function shade(color, normal, glow) {
  const light = norm([-0.35, 0.9, 0.42]);
  const fill = norm([0.4, 0.2, 0.7]);
  const nd = Math.max(0, dot(normal, light));
  const fd = Math.max(0, dot(normal, fill));
  const wrap = 0.46 + nd * 0.48 + fd * 0.14;
  const out = color.map((c) => Math.min(1, c * wrap + (glow ? 0.18 : 0)));
  return out;
}

function renderPoster(builder, camera) {
  const W = 760, H = 520, SS = 2;
  const w = W * SS, h = H * SS;
  const { theta, phi, fov, radius, target } = camera;
  const eye = [
    target[0] + radius * Math.sin(phi) * Math.sin(theta),
    target[1] + radius * Math.cos(phi),
    target[2] + radius * Math.sin(phi) * Math.cos(theta),
  ];
  const back = norm(sub(eye, target));
  const right = norm(cross([0, 1, 0], back));
  const up = cross(back, right);
  const fy = 1 / Math.tan(fov / 2);
  const fx = fy * (h / w);
  const color = Buffer.alloc(w * h * 4);
  const zb = new Float32Array(w * h);
  zb.fill(Infinity);

  const project = (p) => {
    const d = sub(p, eye);
    const x = dot(d, right);
    const y = dot(d, up);
    const z = -dot(d, back);
    if (z < 0.05) return null;
    return {
      x: (x / z) * fx * 0.5 * w + w / 2,
      y: h / 2 - (y / z) * fy * 0.5 * h,
      z,
    };
  };

  const drawTri = (p0, p1, p2, rgb) => {
    const a = project(p0), b = project(p1), c = project(p2);
    if (!a || !b || !c) return;
    const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    if (area >= 0) return;
    let minX = Math.floor(Math.max(0, Math.min(a.x, b.x, c.x)));
    let maxX = Math.ceil(Math.min(w - 1, Math.max(a.x, b.x, c.x)));
    let minY = Math.floor(Math.max(0, Math.min(a.y, b.y, c.y)));
    let maxY = Math.ceil(Math.min(h - 1, Math.max(a.y, b.y, c.y)));
    const inv = 1 / area;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((b.x - px) * (c.y - py) - (c.x - px) * (b.y - py)) * inv;
        const w1 = ((c.x - px) * (a.y - py) - (a.x - px) * (c.y - py)) * inv;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
          const z = w0 * a.z + w1 * b.z + w2 * c.z;
          const i = y * w + x;
          if (z < zb[i]) {
            zb[i] = z;
            const o = i * 4;
            color[o] = rgb[0]; color[o + 1] = rgb[1]; color[o + 2] = rgb[2]; color[o + 3] = 255;
          }
        }
      }
    }
  };

  const anchor = project([target[0], 0.02, target[2]]);
  const edge = project([target[0] + 1.15, 0.02, target[2]]);
  if (anchor && edge) {
    const rad = Math.abs(edge.x - anchor.x);
    const ry = rad * 0.28;
    for (let y = Math.max(0, Math.floor(anchor.y - ry)); y <= Math.min(h - 1, Math.ceil(anchor.y + ry)); y++) {
      for (let x = Math.max(0, Math.floor(anchor.x - rad)); x <= Math.min(w - 1, Math.ceil(anchor.x + rad)); x++) {
        const dx = (x - anchor.x) / rad;
        const dy = (y - anchor.y) / ry;
        const k = dx * dx + dy * dy;
        if (k < 1) {
          const a = Math.floor((1 - k) * (1 - k) * 70);
          const o = (y * w + x) * 4;
          color[o] = 40; color[o + 1] = 48; color[o + 2] = 58; color[o + 3] = a;
        }
      }
    }
  }

  for (const t of builder.tris) {
    const n = t.n[0];
    const rgb = shade(t.color, n, t.glow).map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
    drawTri(t.p[0], t.p[1], t.p[2], rgb);
  }

  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0, c = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((y * SS + sy) * w + (x * SS + sx)) * 4;
          const pa = color[o + 3] / 255;
          r += color[o] * pa; g += color[o + 1] * pa; b += color[o + 2] * pa; a += pa; c++;
        }
      }
      const o = (y * W + x) * 4;
      const alpha = a / c;
      out[o + 3] = Math.round(alpha * 255);
      if (alpha > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
    }
  }
  return encodePNG(W, H, out);
}

function buildGLB(builder) {
  const mats = [...builder.materials.values()].filter((m) => m.positions.length);
  const parts = [];
  let byte = 0;
  const bufferViews = [];
  const accessors = [];
  const primitives = [];
  const materials = mats.map((m) => ({
    name: m.name,
    pbrMetallicRoughness: {
      baseColorFactor: [...m.color, 1],
      metallicFactor: m.metal,
      roughnessFactor: m.roughness,
    },
    emissiveFactor: [0, 0, 0],
    doubleSided: false,
  }));

  function pushArray(floats) {
    const buf = Buffer.alloc(floats.length * 4);
    for (let i = 0; i < floats.length; i++) buf.writeFloatLE(floats[i], i * 4);
    const view = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: byte, byteLength: buf.length, target: 34962 });
    byte += buf.length;
    parts.push(buf);
    return { buf, view };
  }

  mats.forEach((m, mi) => {
    const pos = pushArray(m.positions);
    const nor = pushArray(m.normals);
    let pmin = [Infinity, Infinity, Infinity], pmax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < m.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        pmin[k] = Math.min(pmin[k], m.positions[i + k]);
        pmax[k] = Math.max(pmax[k], m.positions[i + k]);
      }
    }
    const pa = accessors.length;
    accessors.push({ bufferView: pos.view, componentType: 5126, count: m.positions.length / 3, type: "VEC3", min: pmin, max: pmax });
    accessors.push({ bufferView: nor.view, componentType: 5126, count: m.normals.length / 3, type: "VEC3" });
    primitives.push({ attributes: { POSITION: pa, NORMAL: pa + 1 }, material: mi, mode: 4 });
  });

  const bin = Buffer.concat(parts);
  const json = {
    asset: { version: "2.0", generator: "malukenho-dioramas" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives }],
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };
  const jsonBuf = Buffer.from(JSON.stringify(json));
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0)]);
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  let o = 12;
  out.writeUInt32LE(jsonChunk.length, o);
  out.writeUInt32LE(0x4e4f534a, o + 4);
  jsonChunk.copy(out, o + 8);
  o += 8 + jsonChunk.length;
  out.writeUInt32LE(binChunk.length, o);
  out.writeUInt32LE(0x004e4942, o + 4);
  binChunk.copy(out, o + 8);
  return out;
}

function frameCamera(builder, scene) {
  const { min, max } = builder.bounds();
  const target = [
    (min[0] + max[0]) / 2,
    min[1] + (max[1] - min[1]) * 0.46,
    (min[2] + max[2]) / 2,
  ];
  const theta = scene.theta * Math.PI / 180;
  const phi = scene.phi * Math.PI / 180;
  const fov = scene.fov * Math.PI / 180;
  const verts = [];
  for (const t of builder.tris) verts.push(...t.p);
  let lo = 3, hi = 48, best = 16;
  const inside = (radius) => {
    const eye = [
      target[0] + radius * Math.sin(phi) * Math.sin(theta),
      target[1] + radius * Math.cos(phi),
      target[2] + radius * Math.sin(phi) * Math.cos(theta),
    ];
    const back = norm(sub(eye, target));
    const right = norm(cross([0, 1, 0], back));
    const up = cross(back, right);
    const limit = Math.tan(fov / 2) * 0.86;
    for (const p of verts) {
      const d = sub(p, eye);
      const z = -dot(d, back);
      if (z < 0.2) return false;
      const x = Math.abs(dot(d, right) / z);
      const y = Math.abs(dot(d, up) / z);
      if (y > limit || x > limit * (760 / 520)) return false;
    }
    return true;
  };
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (inside(mid)) { best = mid; hi = mid; } else lo = mid;
  }
  return { theta, phi, fov, radius: best * 1.06, target };
}

fs.mkdirSync(modelDir, { recursive: true });
fs.mkdirSync(posterDir, { recursive: true });

const manifest = [];
for (const scene of scenes) {
  const b = createBuilder();
  scene.build(b);
  const cam = frameCamera(b, scene);
  const glb = buildGLB(b);
  const png = renderPoster(b, cam);
  fs.writeFileSync(path.join(modelDir, scene.file + ".glb"), glb);
  fs.writeFileSync(path.join(posterDir, scene.file + ".png"), png);
  const orbit = `${scene.theta}deg ${scene.phi}deg ${cam.radius.toFixed(2)}m`;
  const tgt = cam.target.map((v) => `${v.toFixed(3)}m`).join(" ");
  manifest.push({
    id: scene.id,
    date: scene.date,
    model: `assets/models/${scene.file}.glb`,
    poster: `assets/posters/${scene.file}.png`,
    cameraOrbit: orbit,
    cameraTarget: tgt,
    fieldOfView: `${scene.fov}deg`,
    lat: scene.lat,
    lng: scene.lng,
    category: scene.category,
    sample: true,
    name: scene.name,
    seen: scene.seen,
    where: scene.where,
  });
  console.log(scene.file, "glb", glb.length, "png", png.length, orbit);
}

const dataDir = path.join(root, "assets/data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "scenes.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("wrote", manifest.length, "scenes");
