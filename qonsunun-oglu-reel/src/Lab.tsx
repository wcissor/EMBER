// Rig test sheet (not in the film).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {ANA, SON, QONSU, CHILD, RUNNER, makeKid, BASE, Figure, type Pose} from './chars/rig';
import {Phone, TeaGlass, Cat, Cup, Sapling, Modem} from './chars/props';

const KID = makeKid(() => true);
const KID2 = makeKid(() => false);
const rim = {color: C.amber, dx: 1, dy: -0.6};
const Cell: React.FC<{x: number; y: number; s?: number; children: React.ReactNode}> = ({x, y, s = 3, children}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>{children}</g>
);
export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const P = (o: Partial<Pose>): Pose => ({...BASE, ...o});
  return (
    <AbsoluteFill style={{background: '#2A3350'}}>
      <svg width={1080} height={1920}>
        <Cell x={130} y={420}><Figure b={ANA} p={P({armR: [120, -10], headTurn: 0.6, lookX: 1})} rim={rim} unitPx={3} /></Cell>
        <Cell x={400} y={420}><Figure b={ANA} p={P({armL: [40, -110], armR: [40, -110], eyes: 'squint'})} rim={rim} unitPx={3} /></Cell>
        <Cell x={680} y={420}><Figure b={ANA} p={P({armL: [130, 10], armR: [130, 10], lean: -4, eyes: 'wide'})} rim={rim} unitPx={3} /></Cell>
        <Cell x={940} y={420}><Figure b={QONSU} p={P({armL: [100, -5], armR: [40, -110], headTurn: 0.5})} rim={rim} unitPx={3} /></Cell>
        <Cell x={130} y={860}><Figure b={KID} p={P({lean: 8, armR: [20, 110], headTilt: 10})} rim={{color: C.phoneWhite, dx: 1, dy: -1}} unitPx={3} holdR={<Phone screen={C.phoneWhite} />} /></Cell>
        <Cell x={400} y={860}><Figure b={KID2} p={P({armR: [30, 100], eyes: 'smug'})} rim={rim} unitPx={3} holdR={<TeaGlass t={t} />} /></Cell>
        <Cell x={680} y={860}><Figure b={SON} p={P({armL: [10, 5], armR: [10, 5], eyes: 'smile'})} rim={{color: '#7FA6FF', dx: -1, dy: -1}} unitPx={3} /></Cell>
        <Cell x={940} y={860}><Figure b={SON} p={P({profile: 1, facing: -1, legL: [-20, 10], legR: [25, 30], armL: [-25, -20], armR: [30, -40], headTurn: -0.8})} rim={{color: '#7FA6FF', dx: -1, dy: -1}} unitPx={3} /></Cell>
        <Cell x={160} y={1300}><Figure b={KID} p={P({rot: 180, y: -94, legL: [-6, 0], legR: [6, 0], armR: [150, 30]})} rim={rim} unitPx={3} /></Cell>
        <Cell x={430} y={1300}><Figure b={CHILD} p={P({armR: [170, 0]})} rim={rim} unitPx={3} /></Cell>
        <Cell x={600} y={1300}><Figure b={RUNNER} p={P({profile: 1, facing: 1, lean: 12, legL: [-35, 60], legR: [40, 20], armL: [40, -80], armR: [-40, -80]})} rim={rim} unitPx={3} holdR={<Cup />} /></Cell>
        <Cell x={850} y={1300}><Cat state={0} leap={0} t={t} /></Cell>
        <Cell x={850} y={1500}><Cat state={1} leap={0.3} t={t} /></Cell>
        <g transform="translate(200 1800)"><Sapling g={0.2} /></g>
        <g transform="translate(400 1800)"><Sapling g={1} /></g>
        <g transform="translate(700 1800)"><Modem t={t} rate={2} s={2} /></g>
      </svg>
    </AbsoluteFill>
  );
};
