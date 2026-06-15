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
        email_sent: false,
      })
      .select("id")
      .single();

    const row = result.data as { id: string } | null;
    const error = result.error as { message: string } | null;

    if (error) {
      console.error("[submitForm] insert error:", error);
      throw new Error("Could not save submission");
    }

    // Email delivery: attempt via Lovable Emails infrastructure when configured.
    // If no email domain is set up yet, we still record the submission so the
    // backend log is the source of truth and nothing is lost.
    let emailSent = false;
    let emailError: string | null = null;
    try {
      // Best-effort: dynamically try built-in transactional send route.
      // Will silently fail when email infra is not yet provisioned.
      const baseUrl = process.env.LOVABLE_BASE_URL ?? "";
      if (baseUrl) {
        const resp = await fetch(`${baseUrl}/lovable/email/transactional/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: "form-submission",
            recipientEmail: data.destinationEmail,
            templateData: { formType: data.formType, payload: data.payload },
          }),
        });
        emailSent = resp.ok;
        if (!resp.ok) emailError = `HTTP ${resp.status}`;
      } else {
        emailError = "email_infra_not_configured";
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : "unknown";
    }

    if (emailSent || emailError) {
      await (supabaseAdmin as any)
        .from("form_submissions")
        .update({ email_sent: emailSent, email_error: emailError })
        .eq("id", row!.id);
    }

    return { id: row!.id, emailSent };
  });
