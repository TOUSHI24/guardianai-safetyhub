export type Activity = 'Walking' | 'Running' | 'Travelling' | 'Stationary' | 'Idle';
export type Sample = { activity: string; speed: number; duration_seconds: number; latitude: number | null; longitude: number | null; recorded_at: string; accuracy?: number | null; accepted?: boolean };
export type Baseline = { count: number; hours: number[]; activities: Record<string, number>; meanSpeed: number; speedDeviation: number; meanMovement: number; movementDeviation: number; locations: { latitude: number; longitude: number; count: number }[]; movingPercent: number; spanHours: number };
export type Risk = { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; confidence: number; reasons: string[]; ready: boolean };
export const learningTarget = 40;
export function distance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function classify(speed: number, idleSeconds: number): Activity {
  return speed >= 5 ? 'Travelling' : speed >= 2.2 ? 'Running' : speed >= 0.5 ? 'Walking' : idleSeconds >= 300 ? 'Idle' : 'Stationary';
}
export function buildBaseline(input: Sample[]): Baseline {
  const samples = input.filter(s => s.accepted !== false);
  const hours = Array.from({ length: 24 }, () => 0), activities: Record<string, number> = {};
  const locations: Baseline['locations'] = [];
  for (const s of samples) {
    hours[new Date(s.recorded_at).getUTCHours()]++;
    activities[s.activity] = (activities[s.activity] ?? 0) + 1;
    if (s.latitude != null && s.longitude != null && (s.accuracy ?? 0) <= 100) {
      const p = { latitude: s.latitude, longitude: s.longitude };
      const group = locations.find(l => distance(l, p) < 500);
      if (group) group.count++; else locations.push({ ...p, count: 1 });
    }
  }
  const speeds = samples.map(s => s.speed), moving = samples.filter(s => s.speed >= 0.5);
  const avg = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  const dev = (v: number[], mean: number) => Math.sqrt(avg(v.map(x => (x - mean) ** 2)));
  const meanSpeed = avg(speeds), durations = moving.map(s => s.duration_seconds), meanMovement = avg(durations);
  const times = samples.map(s => Date.parse(s.recorded_at));
  return { count: samples.length, hours, activities, meanSpeed, speedDeviation: dev(speeds, meanSpeed), meanMovement, movementDeviation: dev(durations, meanMovement), locations: locations.sort((a, b) => b.count - a.count).slice(0, 12), movingPercent: samples.length ? Math.round(moving.length / samples.length * 100) : 0, spanHours: times.length ? (Math.max(...times) - Math.min(...times)) / 3600000 : 0 };
}
export function scoreBehavior(sample: Sample, baseline: Baseline): Risk {
  const confidence = Math.min(95, Math.round(baseline.count / 120 * 100));
  if (baseline.count < learningTarget || baseline.spanHours < 24) return { score: 0, level: 'LOW', confidence, reasons: ['Learning your routine — not enough history for an assessment.'], ready: false };
  let score = 0; const reasons: string[] = [];
  const hour = new Date(sample.recorded_at).getUTCHours();
  const nearbyHours = [hour, (hour + 23) % 24, (hour + 1) % 24];
  if (nearbyHours.every(h => (baseline.hours[h] ?? 0) === 0)) { score += 25; reasons.push('Activity outside your learned active hours.'); }
  if ((baseline.activities[sample.activity] ?? 0) / baseline.count < 0.05) { score += 20; reasons.push(`${sample.activity} is uncommon in your routine.`); }
  const z = Math.abs(sample.speed - baseline.meanSpeed) / Math.max(baseline.speedDeviation, 0.8);
  if (z > 2) { score += Math.min(30, Math.round((z - 1) * 10)); reasons.push('Movement speed differs significantly from your baseline.'); }
  if (sample.latitude != null && sample.longitude != null && (sample.accuracy ?? 0) <= 100 && baseline.locations.length && baseline.locations.every(l => distance(l, { latitude: sample.latitude ?? 0, longitude: sample.longitude ?? 0 }) > 1500)) { score += 25; reasons.push('More than 1.5 km from your usual locations.'); }
  if (baseline.meanMovement > 0 && sample.speed >= 0.5 && sample.duration_seconds > baseline.meanMovement + Math.max(60, 2 * baseline.movementDeviation)) { score += 15; reasons.push('Movement duration is longer than your usual pattern.'); }
  score = Math.min(100, score);
  return { score, level: score >= 85 ? 'CRITICAL' : score >= 65 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW', confidence, reasons: reasons.length ? reasons : ['Activity matches your learned behavioural baseline.'], ready: true };
}
