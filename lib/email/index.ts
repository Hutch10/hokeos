export type EmailUser = {
  id: string;
  email: string;
  name: string | null;
};

export type ScheduledEmailReportType = "melt" | "settlement" | "assay" | "summary";

export type SendReportEmailMetadata = {
  reportType: ScheduledEmailReportType;
  scheduledFor: Date;
  customerEmail?: string | null;
  recipientOverride?: string[];
  publicReference?: string | null;
};

export type SendReportEmailResult = {
  delivered: boolean;
  recipients: string[];
};

function titleForReport(reportType: ScheduledEmailReportType): string {
  switch (reportType) {
    case "melt":
      return "Your scheduled melt sheet";
    case "settlement":
      return "Your scheduled settlement sheet";
    case "assay":
      return "Your scheduled assay report";
    case "summary":
      return "Your scheduled summary report";
  }
}

function buildRecipients(user: EmailUser, metadata: SendReportEmailMetadata): string[] {
  const recipients = metadata.recipientOverride?.filter(Boolean) ?? [];

  if (recipients.length > 0) {
    return Array.from(new Set(recipients));
  }

  const base = [user.email];
  if (metadata.customerEmail?.trim()) {
    base.push(metadata.customerEmail.trim());
  }

  return Array.from(new Set(base));
}

function buildBody(user: EmailUser, metadata: SendReportEmailMetadata): string {
  const parts: string[] = [
    `Hello ${user.name ?? "there"},`,
    "",
    `${titleForReport(metadata.reportType)} is attached as a PDF.`,
    `Scheduled run time: ${metadata.scheduledFor.toISOString()}`,
  ];

  if (metadata.publicReference?.trim()) {
    parts.push(`Reference: ${metadata.publicReference.trim()}`);
  }

  parts.push("", "Metals V1");
  return parts.join("\n");
}

function attachmentFileName(reportType: ScheduledEmailReportType, scheduledFor: Date): string {
  const stamp = scheduledFor.toISOString().replace(/[:]/g, "-").replace(/\..+$/, "");
  return `${reportType}-report-${stamp}.pdf`;
}

function isLikelyEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

export async function sendReportEmail(
  user: EmailUser,
  pdfBuffer: Buffer,
  metadata: SendReportEmailMetadata,
): Promise<SendReportEmailResult> {
  const recipients = buildRecipients(user, metadata).filter(isLikelyEmail);

  if (recipients.length === 0) {
    return { delivered: false, recipients: [] };
  }

  const subject = titleForReport(metadata.reportType);
  const body = buildBody(user, metadata);
  const attachmentName = attachmentFileName(metadata.reportType, metadata.scheduledFor);

  const webhookUrl = process.env.REPORT_EMAIL_WEBHOOK_URL;
  const webhookToken = process.env.REPORT_EMAIL_WEBHOOK_TOKEN;

  // If no outbound provider is configured, log-only mode keeps scheduler deterministic.
  if (!webhookUrl) {
    console.log("[email] REPORT_EMAIL_WEBHOOK_URL missing; skipping external delivery", {
      to: recipients,
      subject,
      bytes: pdfBuffer.byteLength,
      attachmentName,
    });

    return { delivered: false, recipients };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
    },
    body: JSON.stringify({
      to: recipients,
      subject,
      text: body,
      attachments: [
        {
          filename: attachmentName,
          contentType: "application/pdf",
          contentBase64: pdfBuffer.toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "unknown email provider error");
    throw new Error(`Email delivery failed: ${message}`);
  }

  return { delivered: true, recipients };
}
