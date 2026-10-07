import { describe, expect, it } from 'vitest';
import { buildBaseline, scoreBehavior, classify, type Sample } from '../lib/behavior';
const samples = (): Sample[] => Array.from({length:120}, (_,i) => ({ activity:'Walking', speed:1.2, duration_seconds:15, latitude:22.57, longitude:88.36, recorded_at:`2026-10-${String(1+Math.floor(i/20)).padStart(2,'0')}T08:00:00Z` }));
describe('deterministic safety scoring', () => {
 it('does not claim an assessment without sufficient time and history', () => { const b = buildBaseline(samples().slice(0,20)); expect(scoreBehavior(samples()[0],b).ready).toBe(false); });
 it('returns low risk for learned activity', () => { const b = buildBaseline(samples()); expect(scoreBehavior(samples()[0],b).score).toBe(0); expect(scoreBehavior(samples()[0],b).ready).toBe(true); });
 it('detects compound unusual behaviour without random scores', () => { const b = buildBaseline(samples()); const s = { ...samples()[0], recorded_at:'2026-10-07T02:00:00Z', activity:'Travelling', speed:10, duration_seconds:300, latitude:23, longitude:89 }; const a = scoreBehavior(s,b); expect(a.score).toBe(100); expect(a.level).toBe('CRITICAL'); expect(scoreBehavior(s,b)).toEqual(a); expect(a.reasons.length).toBe(5); });
 it('excludes unconfirmed anomalies from baseline', () => { expect(buildBaseline([...samples(),{ ...samples()[0], accepted:false, speed:100 }]).count).toBe(120); });
 it('classifies speed and idle duration', () => { expect(classify(0,301)).toBe('Idle'); expect(classify(0,10)).toBe('Stationary'); expect(classify(1,0)).toBe('Walking'); expect(classify(3,0)).toBe('Running'); expect(classify(8,0)).toBe('Travelling'); });
});
