import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { db, schema } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

const disableSignUp = process.env.AUTH_DISABLE_SIGNUPS === "true";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      disableSignUp,
      async sendVerificationOTP({ email, otp }) {
        await sendOtpEmail(email, otp);
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
