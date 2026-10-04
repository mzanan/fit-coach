import "server-only";

import { after } from "next/server";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { AUTH_COOKIE_PREFIX } from "@/lib/authCookies";
import { db, schema } from "@/lib/db";
import { captureServerEvent, hasAnalyticsConsent } from "@/lib/analytics";
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
    cookiePrefix: AUTH_COOKIE_PREFIX,
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser, ctx) => {
          const distinctId = hasAnalyticsConsent(ctx?.headers) ? createdUser.id : null;
          after(() => captureServerEvent("signed_up", distinctId));
        },
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      disableSignUp,
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
