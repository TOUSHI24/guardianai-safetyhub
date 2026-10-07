import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const triggerSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(), message: z.string().trim().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { dispatchSos } = await import("./sos.server");
    return dispatchSos(context.supabase, context.userId, data);
  });
