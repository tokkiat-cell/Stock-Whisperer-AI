import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import type { Express } from "express";
import { authStorage } from "../replit_integrations/auth/storage";

// Standalone Google OAuth login, independent of Replit's own auth.
// Session shape mirrors replitAuth.ts so existing routes reading
// req.user.claims.sub keep working regardless of which provider signed the user in.

function buildCallbackUrl(): string {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  const port = process.env.PORT || "5000";
  return `http://localhost:${port}/api/auth/google/callback`;
}

export function setupGoogleAuth(app: Express) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn(
      "[auth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set — Google login disabled."
    );
    app.get("/api/auth/google", (_req, res) => {
      res.status(501).json({ message: "Google login is not configured." });
    });
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: buildCallbackUrl(),
        scope: ["profile", "email"],
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const existing = email ? await authStorage.getUserByEmail(email) : undefined;
          const id = existing?.id ?? `google:${profile.id}`;

          const user = await authStorage.upsertUser({
            id,
            email: email ?? null,
            firstName: profile.name?.givenName ?? profile.displayName ?? null,
            lastName: profile.name?.familyName ?? null,
            profileImageUrl: profile.photos?.[0]?.value ?? null,
          });

          done(null, {
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              profile_image_url: user.profileImageUrl,
            },
            // Google sessions ride on the app's own session cookie (1 week TTL);
            // no token refresh flow is implemented, so just mark it long-lived.
            expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
          });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      successReturnToOrRedirect: "/",
      failureRedirect: "/",
    })
  );
}
