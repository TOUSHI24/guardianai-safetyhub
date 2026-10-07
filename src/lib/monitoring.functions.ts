import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { buildBaseline, scoreBehavior } from './behavior';

export const recordBehavior = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ activity: z.enum(['Walking','Running','Travelling','Stationary','Idle']), speed: z.number().min(0).max(150), duration_seconds: z.number().int().min(1).max(86400), latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(), accuracy: z.number().min(0).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: history, error } = await supabase.from('behavior_samples').select('*').eq('user_id', userId).eq('accepted', true).order('recorded_at', { ascending: false }).limit(2000);
    if (error) throw new Error('Could not read your behavioural baseline.');
    const baseline = buildBaseline(history ?? []);
    const sample = { ...data, recorded_at: new Date().toISOString() };
    const risk = scoreBehavior(sample, baseline);
    const { data: saved, error: saveError } = await supabase.from('behavior_samples').insert({ ...sample, accepted: risk.score < 35 }).select('id').single();
    if (saveError || !saved) throw new Error('Could not save activity.');
    const nextBaseline = risk.score < 35 ? buildBaseline([sample, ...(history ?? [])]) : baseline;
    const { error: baselineError } = await supabase.from('behavior_baselines').upsert({ user_id: userId, baseline: JSON.parse(JSON.stringify(nextBaseline)), sample_count: nextBaseline.count, updated_at: new Date().toISOString() });
    if (baselineError) throw new Error('Could not update your baseline.');
    const { data: pending } = await supabase.from('risk_alerts').select('*').eq('user_id', userId).in('status', ['pending', 'escalating']).maybeSingle();
    if (pending) return { risk, alert: pending };
    const high = risk.score >= 65;
    const { data: alert, error: alertError } = await supabase.from('risk_alerts').insert({ user_id: userId, sample_id: saved.id, score: risk.score, level: risk.level, confidence: risk.confidence, reasons: risk.reasons, latitude: data.latitude, longitude: data.longitude, status: high ? 'pending' : 'observed', deadline: high ? new Date(Date.now() + 30000).toISOString() : null }).select('*').single();
    if (alertError) throw new Error('Could not save the risk assessment.');
    return { risk, alert };
  });

export const respondToAlert = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ id: z.string().uuid(), response: z.enum(['safe','help','no_response']), latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: alert, error } = await supabase.from('risk_alerts').select('*').eq('id', data.id).eq('user_id', userId).single();
    if (error || !alert) throw new Error('Alert not found.');
    if (alert.status !== 'pending') return { status: alert.status, emergency: null };
    if (data.response === 'no_response' && (!alert.deadline || Date.parse(alert.deadline) > Date.now())) throw new Error('The response period has not ended.');
    const { data: claimed, error: claimError } = await supabase.from('risk_alerts').update({ status: data.response === 'safe' ? 'resolved' : 'escalating', user_response: data.response }).eq('id', alert.id).eq('status', 'pending').select('id').maybeSingle();
    if (claimError) throw new Error('Could not update alert.');
    if (!claimed) return { status: 'already_handled', emergency: null };
    if (data.response === 'safe') {
      if (alert.sample_id) await supabase.from('behavior_samples').update({ accepted: true }).eq('id', alert.sample_id);
      return { status: 'resolved', emergency: null };
    }
    try {
      const { dispatchSos } = await import('./sos.server');
      const emergency = await dispatchSos(supabase, userId, { latitude: data.latitude ?? alert.latitude, longitude: data.longitude ?? alert.longitude, message: data.response === 'help' ? 'I need help following a safety warning.' : 'No response to a safety warning. Please check on me immediately.', trigger: data.response === 'help' ? 'need_help' : 'auto_escalation', risk_score: alert.score, risk: alert.level, reasons: Array.isArray(alert.reasons) ? alert.reasons.filter((r): r is string => typeof r === 'string') : [], user_response: data.response });
      const { error: linkError } = await supabase.from('risk_alerts').update({ status: 'emergency', emergency_event_id: emergency.eventId }).eq('id', alert.id);
      if (linkError) throw new Error('Emergency saved, but alert status could not be linked.');
      return { status: 'emergency', emergency };
    } catch (e) {
      // Release only if no emergency has been linked; a delivery failure is returned, not thrown.
      await supabase.from('risk_alerts').update({ status: 'pending' }).eq('id', alert.id).is('emergency_event_id', null);
      throw e;
    }
  });
export const resolveEmergency = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('emergency_events').update({ status: 'resolved', user_response: 'safe' }).eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error('Could not resolve emergency.');
    await context.supabase.from('risk_alerts').update({ status: 'resolved' }).eq('emergency_event_id', data.id);
    return { status: 'resolved' };
  });
