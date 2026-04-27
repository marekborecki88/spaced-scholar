/**
 * Auth API client.
 *
 * Currently MOCKED — simulates network requests against a future backend.
 * Replace the bodies of `login`, `signup`, `logout`, `me`, `refresh` with real
 * `fetch` calls (e.g. Spring Boot) without changing call sites.
 *
 * Planned endpoints:
 *   POST /api/auth/login    { email, password }            -> { user, token }
 *   POST /api/auth/signup   { email, password, name }      -> { user, token }
 *   POST /api/auth/logout   (Bearer token)                 -> 204
 *   GET  /api/auth/me       (Bearer token)                 -> { user }
 *   POST /api/auth/refresh  { refreshToken }               -> { token }
 */
import type { User } from "@/types";

const STORE_USERS = "vn_auth_users";
const STORE_TOKENS = "vn_auth_tokens";

interface StoredUser extends User {
  passwordHash: string;
}
interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// Naive hash — purely to avoid storing plaintext in localStorage during mock phase.
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `h_${(h >>> 0).toString(36)}_${s.length}`;
}

function loadUsers(): StoredUser[] {
  const raw = localStorage.getItem(STORE_USERS);
  if (!raw) return [];
  try { return JSON.parse(raw) as StoredUser[]; } catch { return []; }
}
function saveUsers(list: StoredUser[]) {
  localStorage.setItem(STORE_USERS, JSON.stringify(list));
}

function loadTokens(): Record<string, string> {
  const raw = localStorage.getItem(STORE_TOKENS);
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, string>; } catch { return {}; }
}
function saveTokens(map: Record<string, string>) {
  localStorage.setItem(STORE_TOKENS, JSON.stringify(map));
}

function issueTokens(userId: string): { token: string; refreshToken: string } {
  const token = `tok_${userId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const refreshToken = `ref_${userId}_${Math.random().toString(36).slice(2, 10)}`;
  const map = loadTokens();
  map[token] = userId;
  map[refreshToken] = userId;
  saveTokens(map);
  return { token, refreshToken };
}

function publicUser(u: StoredUser): User {
  const { passwordHash: _p, ...rest } = u;
  return rest;
}

export class AuthApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthApiError";
  }
}

export const authApi = {
  /** POST /api/auth/login */
  async login(email: string, password: string): Promise<AuthResponse> {
    await wait();
    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new AuthApiError(404, "User not found");
    if (user.passwordHash !== hash(password)) throw new AuthApiError(401, "Invalid credentials");
    const tokens = issueTokens(user.id);
    return { user: publicUser(user), ...tokens };
  },

  /** POST /api/auth/signup */
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    await wait();
    if (!email || !password) throw new AuthApiError(400, "Email and password required");
    if (password.length < 4) throw new AuthApiError(400, "Password too short");
    const users = loadUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new AuthApiError(409, "Email already registered");
    }
    const user: StoredUser = {
      id: btoa(email).replace(/=+$/, "").slice(0, 12),
      email,
      name: name?.trim() || email.split("@")[0].toUpperCase(),
      passwordHash: hash(password),
    };
    saveUsers([...users, user]);
    const tokens = issueTokens(user.id);
    return { user: publicUser(user), ...tokens };
  },

  /** POST /api/auth/logout */
  async logout(token: string): Promise<void> {
    await wait(120);
    const map = loadTokens();
    delete map[token];
    saveTokens(map);
  },

  /** GET /api/auth/me */
  async me(token: string): Promise<User> {
    await wait(120);
    const map = loadTokens();
    const userId = map[token];
    if (!userId) throw new AuthApiError(401, "Invalid token");
    const user = loadUsers().find((u) => u.id === userId);
    if (!user) throw new AuthApiError(404, "User not found");
    return publicUser(user);
  },

  /** POST /api/auth/refresh */
  async refresh(refreshToken: string): Promise<{ token: string }> {
    await wait(120);
    const map = loadTokens();
    const userId = map[refreshToken];
    if (!userId) throw new AuthApiError(401, "Invalid refresh token");
    const token = `tok_${userId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    map[token] = userId;
    saveTokens(map);
    return { token };
  },
};

export type { AuthResponse };
