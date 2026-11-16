#!/usr/bin/env node
/**
 * One-time setup: creates the single authorized admin account (Supabase Auth
 * user + matching profiles row) so you can log in at /admin/login. Run after
 * applying migrations 0007-0009.
 *
 *   node scripts/create-admin-user.mjs you@example.com "Your Name"
 *
 * Prints a temporary password — log in with it once, then use "Forgot your
 * password?" on the login page to set your own.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const [email, displayName] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node scripts/create-admin-user.mjs you@example.com "Your Name"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  // ADMIN_PASSWORD lets you set your real password up front instead of a
  // generated temp one (e.g. ADMIN_PASSWORD=... node scripts/create-admin-user.mjs ...).
  const usedProvidedPassword = Boolean(process.env.ADMIN_PASSWORD);
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("Could not create the user:", error.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, display_name: displayName || email.split("@")[0] });

  if (profileError) {
    console.error("User created, but the profiles row failed:", profileError.message);
    process.exit(1);
  }

  console.log(`\nAdmin account created for ${email}.`);
  if (usedProvidedPassword) {
    console.log("Password set from ADMIN_PASSWORD.");
  } else {
    console.log(`Temporary password: ${password}`);
    console.log("Log in at /admin/login, then use \"Forgot your password?\" to set your own.");
  }
}

main();
