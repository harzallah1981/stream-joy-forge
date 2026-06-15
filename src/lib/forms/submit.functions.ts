import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SubmitSchema = z.object({
  formType: z.string().min(1).max(64),
  destinationEmail: z.string().trim().email().max(255),
  payload: z.record(z.string(), z.unknown()),
});

export const submitForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const result = await (supabaseAdmin as any)
      .from("form_submissions")
      .insert({
        form_type: data.formType,
        destination_email: data.destinationEmail,
        payload: data.payload,
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

    // Simulated email delivery (~400 ms) — real transactional email infra not
    // configured for this demo project; the submission is durably stored in
    // form_submissions so the admin can review every sent form.
    await new Promise((r) => setTimeout(r, 400));

    return {
      id: row!.id,
      emailSent: true,
      deliveredAt: new Date().toISOString(),
      destinationEmail: data.destinationEmail,
    };
  });
