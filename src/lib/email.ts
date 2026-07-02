import "server-only";

const FROM = process.env.EMAIL_FROM ?? "Fit Coach <onboarding@resend.dev>";

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[fit-coach] OTP for ${email}: ${otp}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: `Your Fit Coach code: ${otp}`,
      text: `Your sign-in code is ${otp}. It expires in 10 minutes.`,
    }),
  });
  if (!res.ok) {
    throw new Error(`resend ${res.status}`);
  }
}
