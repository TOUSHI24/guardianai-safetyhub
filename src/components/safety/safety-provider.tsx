import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { triggerSos } from '@/lib/sos.functions';
import { recordBehavior, respondToAlert, resolveEmergency } from '@/lib/monitoring.functions';
import { classify, distance, type Activity, type Baseline, type Risk } from '@/lib/behavior';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, ShieldCheck, Siren } from 'lucide-react';
type Alert = Database['public']['Tables']['risk_alerts']['Row'];
export type Position = { latitude: number; longitude: number; accuracy: number };
export type SosResult = Awaited<ReturnType<typeof triggerSos>>;
function useSafetyEngine(user: User | null) {
  const qc = useQueryClient(); const send = useServerFn(triggerSos), record = useServerFn(recordBehavior), respond = useServerFn(respondToAlert), resolve = useServerFn(resolveEmergency);
  const [monitoring, setMonitoring] = useState(false), [location, setLocation] = useState<Position | null>(null), [locationError, setLocationError] = useState(''), [activity, setActivity] = useState<Activity>('Stationary'), [risk, setRisk] = useState<Risk | null>(null), [busy, setBusy] = useState(false), [result, setResult] = useState<SosResult | null>(null), [now, setNow] = useState(0);
  const previous = useRef<{ point: Position; time: number } | null>(null), lastSaved = useRef(0), inFlight = useRef(false), stationarySince = useRef(0), movementSince = useRef(0);
  const keys = ['safety', user?.id];
  const contacts = useQuery({ queryKey: [...keys, 'contacts'], enabled: !!user, queryFn: async () => { const r = await supabase.from('trusted_contacts').select('*').order('is_primary', { ascending: false }).order('created_at'); if (r.error) throw r.error; return r.data; } });
  const profile = useQuery({ queryKey: [...keys, 'profile'], enabled: !!user, queryFn: async () => (await supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').maybeSingle()).data });
  const baselineQuery = useQuery({ queryKey: [...keys, 'baseline'], enabled: !!user, queryFn: async () => { const r = await supabase.from('behavior_baselines').select('*').maybeSingle(); if (r.error) throw r.error; return r.data; } });
  const samples = useQuery({ queryKey: [...keys, 'samples'], enabled: !!user, queryFn: async () => { const r = await supabase.from('behavior_samples').select('*').order('recorded_at', { ascending: false }).limit(200); if (r.error) throw r.error; return r.data; } });
  const alerts = useQuery({ queryKey: [...keys, 'alerts'], enabled: !!user, queryFn: async () => { const r = await supabase.from('risk_alerts').select('*').order('created_at', { ascending: false }).limit(100); if (r.error) throw r.error; return r.data; } });
  const events = useQuery({ queryKey: [...keys, 'events'], enabled: !!user, queryFn: async () => { const r = await supabase.from('emergency_events').select('*').order('created_at', { ascending: false }).limit(100); if (r.error) throw r.error; return r.data; } });
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  useEffect(() => { const pending = alerts.data?.find(a => a.status === 'pending'); if (pending) setActiveAlert(pending); }, [alerts.data]);
  useEffect(() => { if (!user) { setMonitoring(false); setLocation(null); setRisk(null); setActiveAlert(null); setResult(null); previous.current = null; } }, [user]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  function refresh() { void qc.invalidateQueries({ queryKey: keys }); }
  async function locate(): Promise<Position | null> {
    setLocationError('');
    return new Promise(resolveLoc => {
      if (!navigator.geolocation) { setLocationError('Geolocation is not available.'); resolveLoc(null); return; }
      navigator.geolocation.getCurrentPosition(p => { const point = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }; setLocation(point); resolveLoc(point); }, () => { setLocationError('Location unavailable. Allow location access to show your position.'); resolveLoc(null); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
  }
  async function pressSos() {
    if (busy) return; setBusy(true); setResult(null);
    try { const p = await locate(); const r = await send({ data: { latitude: p?.latitude ?? null, longitude: p?.longitude ?? null, message: `${profile.data?.full_name || 'GuardianAI user'} pressed SOS and needs help immediately.` } }); setResult(r); toast[r.status === 'sent' ? 'success' : 'warning'](r.status === 'sent' ? `Email accepted for ${r.sent} contact(s).` : r.status === 'no_contacts' ? 'Emergency saved. No enabled contacts.' : 'Emergency saved. Email delivery failed or was partial.'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'SOS failed'); } finally { setBusy(false); }
  }
  async function answer(response: 'safe' | 'help' | 'no_response') {
    if (!activeAlert || busy) return; setBusy(true);
    try { const p = response === 'safe' ? location : await locate(); const r = await respond({ data: { id: activeAlert.id, response, latitude: p?.latitude ?? null, longitude: p?.longitude ?? null } }); if (r.emergency) setResult(r.emergency); setActiveAlert(null); refresh(); toast.success(response === 'safe' ? 'Safety alert resolved.' : 'Emergency created. Check email status below.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not respond'); } finally { setBusy(false); }
  }
  const countdown = activeAlert?.deadline ? Math.max(0, Math.ceil((Date.parse(activeAlert.deadline) - now) / 1000)) : 30;
  useEffect(() => { if (activeAlert && now > 0 && countdown === 0 && !busy) void answer('no_response'); }, [activeAlert, countdown, busy, now]);
  useEffect(() => {
    if (!monitoring || !user) return;
    if (!navigator.geolocation) { setLocationError('Geolocation is not available.'); setMonitoring(false); return; }
    const watch = navigator.geolocation.watchPosition(async p => {
      const point = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }; setLocation(point); setLocationError(''); const time = Date.now();
      const prev = previous.current; const elapsed = prev ? (time - prev.time) / 1000 : 0;
      const derived = prev && elapsed > 0 && point.accuracy <= 100 && prev.point.accuracy <= 100 ? Math.max(0, distance(prev.point, point) - Math.max(point.accuracy, prev.point.accuracy)) / elapsed : 0;
      const speed = Math.min(150, Math.max(0, p.coords.speed ?? derived)); previous.current = { point, time };
      if (speed >= 0.5) { stationarySince.current = time; if (!movementSince.current) movementSince.current = time; } else { movementSince.current = 0; if (!stationarySince.current) stationarySince.current = time; }
      const a = classify(speed, (time - stationarySince.current) / 1000); setActivity(a);
      if (time - lastSaved.current < 15000 || inFlight.current) return;
      const duration = Math.max(1, Math.min(86400, Math.round(movementSince.current ? (time - movementSince.current) / 1000 : (time - (lastSaved.current || time - 15000)) / 1000)));
      lastSaved.current = time; inFlight.current = true;
      try { const r = await record({ data: { ...point, activity: a, speed, duration_seconds: duration } }); setRisk(r.risk); if (r.alert?.status === 'pending') setActiveAlert(r.alert); refresh(); }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Monitoring failed'); setMonitoring(false); }
      finally { inFlight.current = false; }
    }, () => { setLocationError('Location permission denied or signal unavailable. Monitoring stopped.'); setMonitoring(false); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [monitoring, user?.id]);
  const baseline = baselineQuery.data?.baseline as unknown as Baseline | undefined;
  const latest = alerts.data?.[0];
  return { user, profile, contacts, samples, alerts, events, baseline, monitoring, setMonitoring, location, locationError, locate, activity, risk: risk ?? (latest ? { score: latest.score, level: latest.level, confidence: latest.confidence, reasons: Array.isArray(latest.reasons) ? latest.reasons.filter((r): r is string => typeof r === 'string') : [], ready: (baseline?.count ?? 0) >= 40 && (baseline?.spanHours ?? 0) >= 24 } : null), busy, result, pressSos, refresh, activeAlert, countdown, answer, resolve };
}
const SafetyContext = createContext<ReturnType<typeof useSafetyEngine> | null>(null);
export function SafetyProvider({ user, children }: { user: User | null; children: ReactNode }) {
  const safety = useSafetyEngine(user);
  return <SafetyContext.Provider value={safety}>{children}<Dialog open={!!safety.activeAlert}><DialogContent onEscapeKeyDown={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()} className="safety-warning"><DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-warning" /> Safety check required</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Unusual behaviour detected. This is not a confirmation of danger.</p><div className="flex items-center justify-between py-4"><div><p className="text-4xl font-bold">{safety.activeAlert?.score}<span className="text-sm text-muted-foreground"> /100</span></p><p className="text-destructive">{safety.activeAlert?.level} RISK</p></div><div className="countdown">{safety.countdown}<span>seconds</span></div></div><ul className="space-y-2 text-sm">{Array.isArray(safety.activeAlert?.reasons) && safety.activeAlert.reasons.map((r, i) => <li key={i}>• {String(r)}</li>)}</ul><p className="text-sm text-muted-foreground">No response will alert your enabled trusted contacts.</p><div className="grid grid-cols-2 gap-3"><Button variant="outline" disabled={safety.busy} onClick={() => safety.answer('safe')}><ShieldCheck /> I'M SAFE</Button><Button disabled={safety.busy} onClick={() => safety.answer('help')}><Siren /> NEED HELP</Button></div></DialogContent></Dialog></SafetyContext.Provider>;
}
export function useSafety() { const value = useContext(SafetyContext); if (!value) throw new Error('Safety provider missing'); return value; }
