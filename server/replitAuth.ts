import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if we're in a Replit environment vs production deployment
const isActuallyOnReplit = process.env.REPLIT_DOMAINS && process.env.REPLIT_DOMAINS.includes('.replit.dev');
const isProductionDeployment = process.env.NODE_ENV === 'production';
const isReplitEnvironment = isActuallyOnReplit && process.env.REPL_ID;
const isCustomDomain = process.env.REPLIT_DOMAINS && !process.env.REPLIT_DOMAINS.includes('.replit.dev');

console.log("[AUTH DEBUG] Environment check:");
console.log("- REPLIT_DOMAINS:", process.env.REPLIT_DOMAINS);
console.log("- REPL_ID:", process.env.REPL_ID ? "SET" : "NOT SET");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- isActuallyOnReplit:", isActuallyOnReplit);
console.log("- isProductionDeployment:", isProductionDeployment);
console.log("- isReplitEnvironment:", isReplitEnvironment);
console.log("- isCustomDomain:", isCustomDomain);

// For production deployment outside Replit, disable OAuth and use simple session-based auth
if (!isReplitEnvironment || isCustomDomain) {
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
  
  // Use PostgreSQL for session storage
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
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

  // Use simple auth for custom domains or production deployments
  if (!isReplitEnvironment || isCustomDomain) {
    console.log("[AUTH DEBUG] Setting up simple production authentication...");
    // Production mode - simplified authentication
    app.get("/api/login", (req, res) => {
      console.log("[AUTH DEBUG] Login request received for domain:", req.hostname);
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
        await upsertUser(user.claims);
        
        console.log("[AUTH DEBUG] Redirecting to home");
        res.redirect("/");
      });
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });

    // Guest authentication endpoint with password protection
    app.post("/api/guest-login", (req, res) => {
      const { password } = req.body;
      const GUEST_PASSWORD = "FOoM30Ws68PSpickSxrnGmStuD1OsaM";
      
      console.log("[AUTH DEBUG] Guest login attempt");
      
      if (password !== GUEST_PASSWORD) {
        console.log("[AUTH DEBUG] Invalid guest password");
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Create a guest user session with unique email
      const guestId = "guest-user-" + Date.now();
      const user = {
        claims: {
          sub: guestId,
          email: `${guestId}@scrumpoker.local`,
          first_name: "Guest",
          last_name: "User",
          profile_image_url: null,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        }
      };
      
      console.log("[AUTH DEBUG] Creating guest session:", user.claims.sub);
      req.login(user, async (err) => {
        if (err) {
          console.log("[AUTH DEBUG] Guest login error:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        
        console.log("[AUTH DEBUG] Guest session created, upserting user");
        // Create user in database
        await upsertUser(user.claims);
        
        console.log("[AUTH DEBUG] Guest authenticated successfully");
        res.json({ success: true, message: "Guest authentication successful" });
      });
    });
  } else if (isReplitEnvironment && !isCustomDomain) {
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
      console.log("[AUTH DEBUG] Login attempt for domain:", req.hostname);
      // Check if this is a registered Replit domain
      const replitDomains = process.env.REPLIT_DOMAINS!.split(",");
      const isReplitDomain = replitDomains.includes(req.hostname);
      
      if (!isReplitDomain) {
        console.log("[AUTH DEBUG] Non-Replit domain detected, redirecting to simple auth");
        return res.redirect("/api/simple-login");
      }
      
      passport.authenticate(`replitauth:${req.hostname}`, {
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

    app.get("/api/simple-login", (req, res) => {
      console.log("[AUTH DEBUG] Simple login for production domain");
      // Create a simple user session for production
      const userId = `demo-user-${Date.now()}`;
      console.log("[AUTH DEBUG] Creating user session:", userId);
      
      (req as any).login({ claims: { sub: userId } }, async (err: any) => {
        if (err) {
          console.error("[AUTH DEBUG] Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log("[AUTH DEBUG] Session created, upserting user");
        try {
          await storage.upsertUser({
            id: userId,
            email: null,
            firstName: "Demo",
            lastName: "User",
            profileImageUrl: null,
          });
          console.log("[AUTH DEBUG] User upserted successfully, redirecting to /");
          res.redirect("/");
        } catch (error) {
          console.error("[AUTH DEBUG] User upsert failed:", error);
          res.status(500).json({ message: "User creation failed" });
        }
      });
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

    // Guest authentication endpoint with password protection (also available in Replit mode)
    app.post("/api/guest-login", (req, res) => {
      const { password } = req.body;
      const GUEST_PASSWORD = "FOoM30Ws68PSpickSxrnGmStuD1OsaM";
      
      console.log("[AUTH DEBUG] Guest login attempt");
      
      if (password !== GUEST_PASSWORD) {
        console.log("[AUTH DEBUG] Invalid guest password");
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Create a guest user session with unique email
      const guestId = "guest-user-" + Date.now();
      const user = {
        claims: {
          sub: guestId,
          email: `${guestId}@scrumpoker.local`,
          first_name: "Guest",
          last_name: "User",
          profile_image_url: null,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        }
      };
      
      console.log("[AUTH DEBUG] Creating guest session:", user.claims.sub);
      req.login(user, async (err) => {
        if (err) {
          console.log("[AUTH DEBUG] Guest login error:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        
        console.log("[AUTH DEBUG] Guest session created, upserting user");
        // Create user in database
        await upsertUser(user.claims);
        
        console.log("[AUTH DEBUG] Guest authenticated successfully");
        res.json({ success: true, message: "Guest authentication successful" });
      });
    });
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