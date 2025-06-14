import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if we're in a Replit environment - only use OAuth if we're actually running on Replit
const isActuallyOnReplit = process.env.REPLIT_DOMAINS && process.env.REPLIT_DOMAINS.includes('.replit.dev');
const isProductionDeployment = process.env.NODE_ENV === 'production' && !isActuallyOnReplit;
const isReplitEnvironment = isActuallyOnReplit && process.env.REPL_ID;

console.log("[AUTH DEBUG] Environment check:");
console.log("- REPLIT_DOMAINS:", process.env.REPLIT_DOMAINS);
console.log("- REPL_ID:", process.env.REPL_ID ? "SET" : "NOT SET");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- isActuallyOnReplit:", isActuallyOnReplit);
console.log("- isProductionDeployment:", isProductionDeployment);
console.log("- isReplitEnvironment:", isReplitEnvironment);

// For production deployment outside Replit, disable OAuth and use simple session-based auth
if (!isReplitEnvironment) {
  console.log("[AUTH DEBUG] Running in production mode without Replit OAuth - using simple authentication");
} else {
  console.log("[AUTH DEBUG] Running with Replit OAuth enabled");
}

const getOidcConfig = memoize(
  async () => {
    if (!isReplitEnvironment) {
      throw new Error("OIDC config not available in production");
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use in-memory store for production if no database URL available
  let sessionStore;
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  }
  
  return session({
    secret: process.env.SESSION_SECRET || "fallback-secret-for-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  console.log("[AUTH DEBUG] Setting up authentication...");
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (isReplitEnvironment) {
    console.log("[AUTH DEBUG] Setting up Replit OAuth...");
    // Setup Replit OAuth for development
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res, next) => {
      const domain = process.env.REPLIT_DOMAINS!.split(",")[0];
      console.log("[AUTH DEBUG] Login attempt for domain:", domain);
      passport.authenticate(`replitauth:${domain}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  } else {
    console.log("[AUTH DEBUG] Setting up simple production authentication...");
    // Production mode - simplified authentication
    app.get("/api/login", (req, res) => {
      console.log("[AUTH DEBUG] Login request received");
      // Create a demo user for production
      const user = {
        claims: {
          sub: "demo-user-" + Date.now(),
          email: "demo@example.com",
          first_name: "Demo",
          last_name: "User",
          profile_image_url: null,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        }
      };
      
      console.log("[AUTH DEBUG] Creating user session:", user.claims.sub);
      req.login(user, async (err) => {
        if (err) {
          console.log("[AUTH DEBUG] Login error:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        
        console.log("[AUTH DEBUG] Session created, upserting user");
        // Create user in database
        await upsertUser({
          id: user.claims.sub,
          email: user.claims.email,
          firstName: user.claims.first_name,
          lastName: user.claims.last_name,
          profileImageUrl: user.claims.profile_image_url,
        });
        
        console.log("[AUTH DEBUG] Redirecting to home");
        res.redirect("/");
      });
    });

    app.get("/api/logout", (req, res) => {
      console.log("[AUTH DEBUG] Logout request received");
      req.logout(() => {
        res.redirect("/");
      });
    });

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log("[AUTH DEBUG] isAuthenticated check:");
  console.log("- req.isAuthenticated():", req.isAuthenticated());
  console.log("- req.user:", req.user ? "EXISTS" : "NULL");
  
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    console.log("[AUTH DEBUG] Not authenticated - returning 401");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For simple auth mode, just check if user exists
  if (!isReplitEnvironment) {
    console.log("[AUTH DEBUG] Simple auth mode - user authenticated");
    return next();
  }

  // For OAuth mode, check token expiration
  if (!user.expires_at) {
    console.log("[AUTH DEBUG] No expires_at - returning 401");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log("[AUTH DEBUG] Token valid - proceeding");
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("[AUTH DEBUG] No refresh token - returning 401");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    console.log("[AUTH DEBUG] Attempting token refresh");
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("[AUTH DEBUG] Token refreshed successfully");
    return next();
  } catch (error) {
    console.log("[AUTH DEBUG] Token refresh failed:", error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};