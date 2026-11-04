import React from 'react';
import type {RoleDef} from '../config';
import {UI} from '../config';
import {C, TYPE} from '../theme';
import {FEED, ROLE_CARD} from '../layout';
import {Glass, Chip, CheckIcon, StarGlyph} from './UI';

/** A VolunTrack listing: title, chips (age filled blue; category + format outlined), status, Apply. 920×176. */
export const RoleCard: React.FC<{
  role: RoleDef;
  /** 0..1: "Open · until filled" lights up. */
  openLit?: number;
  /** 0..1: Apply pill fills with blue (left to right). */
  applyFill?: number;
  /** Hide the pill's own star glyph (the big star has landed in it). */
  hideGlyph?: boolean;
  blur?: boolean;
}> = ({role, openLit = 0, applyFill = 1, hideGlyph = false, blur = true}) => {
  const a = ROLE_CARD.apply;
  const lit = Math.max(0, Math.min(1, openLit));
  const fill = Math.max(0, Math.min(1, applyFill));
  const statusColor = `rgba(${Math.round(141 + (245 - 141) * lit)}, ${Math.round(154 + (247 - 154) * lit)}, ${Math.round(192 + (255 - 192) * lit)}, 1)`;
  return (
    <Glass style={{width: FEED.cardW, height: FEED.cardH}} blur={blur}>
      <div style={{position: 'absolute', left: ROLE_CARD.title.x, top: ROLE_CARD.title.y, ...TYPE.roleTitle, color: C.white, lineHeight: 1.2, whiteSpace: 'nowrap'}}>{role.title}</div>
      <div style={{position: 'absolute', left: ROLE_CARD.chips.x, top: ROLE_CARD.chips.y, display: 'flex', gap: ROLE_CARD.chips.gap}}>
        <Chip label={role.age} filled tabular height={ROLE_CARD.chips.h} />
        <Chip label={role.category} height={ROLE_CARD.chips.h} />
        <Chip label={role.format} height={ROLE_CARD.chips.h} />
      </div>
      <div style={{position: 'absolute', left: ROLE_CARD.status.x, top: ROLE_CARD.status.y, display: 'flex', alignItems: 'center', gap: 8, ...TYPE.chip, fontWeight: 500, color: C.muted, whiteSpace: 'nowrap'}}>
        <span style={{width: 10, height: 10, borderRadius: 5, background: C.blue, opacity: lit, boxShadow: `0 0 ${10 * lit}px ${C.glow}`}} />
        <span style={{color: statusColor}}>{UI.statusOpen}</span>
        <span>·</span>
        <span>{UI.statusChecked}</span>
        <CheckIcon size={26} color={C.blue} stroke={3.2} />
      </div>
      {/* Apply pill — goes to the organizer's own form */}
      <div style={{position: 'absolute', left: a.x, top: a.y, width: a.w, height: a.h, borderRadius: a.h / 2, boxShadow: `inset 0 0 0 2px ${C.blue}`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: C.blue}} />
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, ...TYPE.chip, fontWeight: 700, color: '#FFFFFF'}}>
          <span style={{opacity: hideGlyph ? 0 : 1, display: 'flex'}}>
            <StarGlyph size={22} />
          </span>
          {UI.apply}
        </div>
      </div>
    </Glass>
  );
};
