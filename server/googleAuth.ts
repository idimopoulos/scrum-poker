import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";

export async function setupGoogleAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log("Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
    try {
      // Create or update user in database
      const user = await storage.upsertUser({
        id: `google_${profile.id}`,
        email: profile.emails?.[0]?.value || null,
        firstName: profile.name?.givenName || null,
        lastName: profile.name?.familyName || null,
        profileImageUrl: profile.photos?.[0]?.value || null,
      });

      return done(null, {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        }
      });
    } catch (error) {
      console.error("Google OAuth error:", error);
      return done(error as Error, undefined);
    }
  }));

  // Google OAuth routes
  app.get("/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/");
    }
  );
}