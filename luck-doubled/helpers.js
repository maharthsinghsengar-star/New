// small shared helpers for people.js (scene.js keeps its own copies)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, RoundedBoxGeometry };
export const mergeGeometries = gs => mergeRaw(gs.map(g => g.index ? g.toNonIndexed() : g));
export function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2, C = h => new THREE.Color(h);
export const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
export const noise = new SimplexNoise({ random: RNG(7) });
export const _m4 = () => new THREE.Matrix4(), mT = (x, y, z) => _m4().makeTranslation(x, y, z), mRX = a => _m4().makeRotationX(a), mRY = a => _m4().makeRotationY(a), mRZ = a => _m4().makeRotationZ(a), mS = (x, y, z) => _m4().makeScale(x, y, z);
export const ZERO = _m4().makeScale(0, 0, 0);
