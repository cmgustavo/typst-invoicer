import path from "node:path";
import nodemailer from "nodemailer";

export interface InvoiceEmail {
  to: string | string[];
  subject: string;
  text: string;
  pdfPath: string;
}

/** Sends the PDF through Gmail SMTP using GMAIL_USER / GMAIL_APP_PASSWORD. */
export async function sendInvoiceEmail({ to, subject, text, pdfPath }: InvoiceEmail): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER / GMAIL_APP_PASSWORD (set them in the environment or .env)");
  }

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transporter.sendMail({
    from: user,
    to,
    subject,
    text,
    attachments: [{ filename: path.basename(pdfPath), path: pdfPath }],
  });
}
