import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitForm } from "@/lib/forms/submit.functions";
import { useI18n } from "@/lib/i18n";

export function SubmitEmailDialog({
  open,
  onOpenChange,
  formType,
  payload,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  formType: string;
  payload: Record<string, unknown>;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = useServerFn(submitForm);

  const handleSend = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await submit({
        data: { formType, destinationEmail: email.trim(), payload },
      });
      toast.success(t("sent_ok"), { description: email.trim() });
      setEmail("");
      onOpenChange(false);
      onSent();
    } catch (e) {
      console.error(e);
      toast.error(t("sent_err"), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("email_modal_title")}</DialogTitle>
          <DialogDescription>{t("email_modal_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="dest-email">{t("email_to")}</Label>
          <Input
            id="dest-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ops@example.com"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSend} disabled={busy || !email.includes("@")}>
            {busy ? "…" : t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
