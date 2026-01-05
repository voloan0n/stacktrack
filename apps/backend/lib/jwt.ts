import jwt from "jsonwebtoken";

/**
 * Sign a user session token
 * @param data - payload inside the JWT
 * @param rememberMe - optional boolean to extend session duration
 */
export function signToken(data: any, rememberMe: boolean = false) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  // Default: short-lived sessions; optionally extend when requested
  const expiresIn = rememberMe ? "30d" : "8h";

  return jwt.sign(
    { data },
    secret,
    {
      expiresIn,
      algorithm: "HS256",
    }
  );
}

/**
 * Verifies the token and returns decoded payload
 */
export function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.verify(token, secret);
}

/**
 * Optional wrapper: same naming, simple return value
 */
export function checkToken(token: string) {
  try {
    return verifyToken(token);
  } catch (err) {
    return null;
  }
}
