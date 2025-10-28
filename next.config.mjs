import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";

const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || "development";
const ROOT_DIR = process.cwd();
const ENV_FILE = path.join(ROOT_DIR, `.env.${APP_ENV}`);
const FALLBACK_ENV_FILE = path.join(ROOT_DIR, ".env");

if (fs.existsSync(ENV_FILE)) {
  loadEnv({ path: ENV_FILE });
} else if (fs.existsSync(FALLBACK_ENV_FILE)) {
  loadEnv({ path: FALLBACK_ENV_FILE });
}

const SECRETS_ENV_FILE = path.join(ROOT_DIR, "secrets", `${APP_ENV}.env`);
if (fs.existsSync(SECRETS_ENV_FILE)) {
  loadEnv({ path: SECRETS_ENV_FILE, override: true });
}

const SECRETS_JSON_FILE = path.join(ROOT_DIR, "secrets", `${APP_ENV}.json`);
if (fs.existsSync(SECRETS_JSON_FILE)) {
  try {
    const raw = fs.readFileSync(SECRETS_JSON_FILE, "utf-8");
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([key, value]) => {
      if (process.env[key] === undefined) {
        process.env[key] = String(value);
      }
    });
  } catch (error) {
    throw new Error(`Failed to parse secrets JSON: ${SECRETS_JSON_FILE}`);
  }
}

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'standalone',
};

export default config;
