import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactFormSchema } from "@/lib/validations/contact";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request data." }, { status: 400 }); }
  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid form data.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL;

  if (!apiKey || !contactEmail) {
    return NextResponse.json(
      { error: "Email delivery is not configured yet." },
      { status: 503 },
    );
  }

  const { name, email, company, subject, timeline, message } = parsed.data;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || "The Katalyst Contact Form <onboarding@resend.dev>",
      to: contactEmail,
      replyTo: email,
      subject: `[The Katalyst] ${subject}`,
      text: `From: ${name} <${email}>${company ? `\nCompany: ${company}` : ""}${timeline ? `\nIdeal Timeline: ${timeline}` : ""}\n\n${message}`,
    });

    if (error || !data?.id) {
      console.error(`Contact email was rejected: ${JSON.stringify(error ? { name: error.name, message: error.message } : { message: "Provider returned no message ID." })}`);
      return NextResponse.json({ error: `Your message was not sent. Please try again or email ${contactEmail} directly.` }, { status: 502 });
    }
    return NextResponse.json({ success: true, messageId: data.id });
  } catch {
    console.error("Contact email delivery request failed.");
    return NextResponse.json(
      { error: "Something went wrong sending your message. Please try again." },
      { status: 500 },
    );
  }
}
