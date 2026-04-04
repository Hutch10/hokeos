/**
 * Phase 35: Mock Email Provider
 * High-fidelity simulation of an external Transactional ESP (SendGrid/Postmark).
 */
export async function mockSendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId: string }> {
  const messageId = `sg-${Math.random().toString(36).slice(2, 10)}`;
  
  console.log(`
[EXTERNAL ALERT: EMAIL DISPATCH]
------------------------------------------------------------
PROVIDER: Mock SendGrid (v3/mail/send)
TO: ${to}
SUBJECT: ${subject}
MESSAGE ID: ${messageId}
------------------------------------------------------------
${body}
------------------------------------------------------------
[STATUS: 202 ACCEPTED]
  `);

  return { success: true, messageId };
}
