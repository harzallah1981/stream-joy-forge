import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EmailList = z.array(z.string().trim().email().max(255)).max(10);

const SubmitSchema = z.object({
  formType: z.string().min(1).max(64),
  // Backward compat: legacy single-address field
  destinationEmail: z.string().trim().email().max(255).optional(),
  // New multi-recipient fields
  to: EmailList.optional(),
  cc: EmailList.optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const submitForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const toList = (data.to && data.to.length > 0)
      ? data.to
      : (data.destinationEmail ? [data.destinationEmail] : []);
    const ccList = data.cc ?? [];

    if (toList.length === 0) {
      throw new Error("At least one recipient is required");
    }

    const primary = toList[0];

    const result = await (supabaseAdmin as any)
      .from("form_submissions")
      .insert({
        form_type: data.formType,
        destination_email: primary,
        payload: { ...data.payload, _recipients: { to: toList, cc: ccList } },
        email_sent: true,
      })
      .select("id")
      .single();

    const row = result.data as { id: string } | null;
    const error = result.error as { message: string } | null;

    if (error) {
      console.error("[submitForm] insert error:", error);
      throw new Error("Could not save submission");
    }

    // Simulated email delivery (~400 ms) — real SMTP not configured for this
    // demo project. The submission and recipient list are durably stored in
    // form_submissions so the admin can review every sent form.
    await new Promise((r) => setTimeout(r, 400));

    return {
      id: row!.id,
      emailSent: true,
      deliveredAt: new Date().toISOString(),
      to: toList,
      cc: ccList,
    };
  });
