const { loadEnvConfig } = require("@next/env");
const { Resend } = require("resend");
loadEnvConfig(process.cwd());

async function main() {
  const recipient = process.env.CONTACT_EMAIL;
  if (!recipient) throw new Error("CONTACT_EMAIL is missing.");
  const response = await fetch("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "The Katalyst delivery check",
      email: recipient,
      subject: "Contact form delivery test",
      timeline: "Delivery check — no project deadline",
      message: "This is the requested test email from The Katalyst contact form after fixing its delivery error handling. It also verifies that Ideal Timeline appears in the email. No reply is needed.",
    }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  console.log(JSON.stringify({ httpStatus: response.status, recipient, ...result }));
  if (!response.ok || !result.messageId) { process.exitCode = 1; return; }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const delivery = await resend.emails.get(result.messageId);
  console.log(JSON.stringify(delivery.error ? { statusCheckError: delivery.error.message } : { messageId: delivery.data?.id, deliveryStatus: delivery.data?.last_event }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
