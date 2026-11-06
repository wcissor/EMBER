// Locomotion cycles in profile (section 4, acting). Conventions of the rig: a limb angle is measured from straight
// down, positive = forward (the facing side). Knees flex BACKWARD (shin angle = thigh − flexion); elbows flex FORWARD
// (forearm angle = upper arm + flexion). φ is the cycle phase in radians; the right leg runs half a cycle behind.
import type {Build, Pose} from './rig';
import {joints, BASE} from './rig';

const D = Math.PI / 180;
const pos = (x: number) => Math.max(0, x);

/** Plant the lower foot on the ground (y = 0 at the figure's feet line). */
const grounded = (b: Build, p: Partial<Pose>): Partial<Pose> => {
  const j = joints(b, {...BASE, ...p, y: 0, x: 0} as Pose);
  const drop = Math.max(j.aL.y, j.aR.y); // feet are at ≤ 0 in figure units; 0 = on the ground
  return {...p, y: (p.y ?? 0) - drop};
};

/** Running: high heel recovery, a slight knee bend at contact, deeper at mid-stance; arms bent ~90°, opposite the legs. */
export const runCycle = (b: Build, phi: number, facing: 1 | -1, opts: {lean?: number; reach?: number} = {}): Partial<Pose> => {
  const lean = opts.lean ?? 13;
  const reach = opts.reach ?? 1;
  const leg = (q: number): [number, number] => {
    const thigh = 8 + 38 * reach * Math.sin(q);
    const flex = 16 + 92 * Math.pow(pos(Math.cos(q + 0.5)), 1.3) + 24 * pos(Math.sin(q - Math.PI / 2));
    return [thigh, -flex];
  };
  const arm = (q: number): [number, number] => [4 - 32 * reach * Math.sin(q), 82 + 12 * Math.sin(q)];
  const p: Partial<Pose> = {
    profile: 1,
    facing,
    lean: facing * lean,
    legL: leg(phi),
    legR: leg(phi + Math.PI),
    armL: arm(phi),
    armR: arm(phi + Math.PI),
    headTilt: -facing * 4,
    lookX: facing * 0.6,
  };
  return grounded(b, p);
};

/** Walking: a modest stride, the knee bends in the swing; arms swing loosely, opposite the legs. */
export const walkCycle = (b: Build, phi: number, facing: 1 | -1, opts: {lean?: number} = {}): Partial<Pose> => {
  const leg = (q: number): [number, number] => {
    const thigh = 3 + 22 * Math.sin(q);
    const flex = 4 + 58 * Math.pow(pos(Math.cos(q + 0.6)), 1.4) + 9 * pos(Math.sin(q - Math.PI / 2));
    return [thigh, -flex];
  };
  const arm = (q: number): [number, number] => [2 - 17 * Math.sin(q), 14 + 10 * pos(-Math.sin(q))];
  return grounded(b, {
    profile: 1,
    facing,
    lean: facing * (opts.lean ?? 3),
    legL: leg(phi),
    legR: leg(phi + Math.PI),
    armL: arm(phi),
    armR: arm(phi + Math.PI),
  });
};

/** The cartoon sneak: hunched, knees lifted high, on tiptoe, hands up in front like paws. */
export const tiptoeCycle = (b: Build, phi: number, facing: 1 | -1): Partial<Pose> => {
  const leg = (q: number): [number, number] => {
    const thigh = 14 + 42 * Math.sin(q);
    const flex = 28 + 74 * Math.pow(pos(Math.cos(q + 0.35)), 1.2);
    return [thigh, -flex];
  };
  return grounded(b, {
    profile: 1,
    facing,
    lean: facing * 17,
    legL: leg(phi),
    legR: leg(phi + Math.PI),
    armL: [66 + 10 * Math.sin(phi), 74],
    armR: [58 + 10 * Math.sin(phi + Math.PI), 82],
    headTilt: facing * 6,
    sy: 1 + 0.025 * Math.sin(2 * phi),
  });
};

/** Feet height of a stepped path down stairs: the root drops one step per half cycle, easing at each step. */
export const stairDrop = (phi: number, stepH: number) => {
  const steps = phi / Math.PI;
  const k = Math.floor(steps);
  const f = steps - k;
  const ease = f < 0.55 ? 0 : (f - 0.55) / 0.45;
  return (k + ease * ease * (3 - 2 * ease)) * stepH;
};

export {D};
