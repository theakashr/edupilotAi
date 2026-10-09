#!/usr/bin/env node
/**
 * scripts/provision-teacher.mjs
 *
 * EduPilot AI — Controlled Server-Side Teacher Provisioning CLI
 *
 * Usage:
 *   node scripts/provision-teacher.mjs --list
 *   node scripts/provision-teacher.mjs --email prof@edu.org --name "Dr. Davis" --action grant
 *   node scripts/provision-teacher.mjs --email prof@edu.org --action revoke --mode deactivate
 *   node scripts/provision-teacher.mjs --email prof@edu.org --action revoke --mode demote
 *   node scripts/provision-teacher.mjs --email prof@edu.org --action status
 *   node scripts/provision-teacher.mjs --email prof@edu.org --name "Dr. Davis" --action invite
 *
 * Options:
 *   --secret <str>      Admin provisioning secret (defaults to ADMIN_PROVISIONING_SECRET in .env.local)
 *   --url <url>         API base URL (defaults to http://localhost:3000)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 1. Read .env.local for secrets
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

// 2. Parse CLI arguments
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return null;
}

const hasFlag = (flag) => args.includes(flag);

const action = getArg('--action') || (hasFlag('--list') ? 'list' : 'help');
const email = getArg('--email');
const name = getArg('--name');
const uid = getArg('--uid');
const password = getArg('--password');
const mode = getArg('--mode') || 'demote';
const secret = getArg('--secret') || process.env.ADMIN_PROVISIONING_SECRET || 'edupilot_admin_provisioning_key_2026';
const baseUrl = getArg('--url') || 'http://localhost:3000';

console.log('================================================================');
console.log('       EDUPILOT AI — TEACHER ACCOUNT PROVISIONING CLI');
console.log('================================================================\n');

if (action === 'help' || (!email && !uid && action !== 'list')) {
  console.log(`Commands:
  --list                                  List all active and inactive teachers
  --email <email> --action grant          Grant teacher role to user
  --email <email> --action revoke         Revoke teacher role (use --mode deactivate|demote)
  --email <email> --action status         Inspect role & account status
  --email <email> --action invite         Issue a secure teacher onboarding invitation
  --email <email> --password <pwd> --action create  Create brand new teacher account

Options:
  --name <displayName>   Teacher display name
  --secret <secret>      Administrative secret override
  --url <endpoint>       Server URL (default: http://localhost:3000)
  --mode <mode>          demote (default) or deactivate
`);
  process.exit(0);
}

async function run() {
  const apiUrl = `${baseUrl}/api/admin/provision-teacher`;

  try {
    if (action === 'list') {
      console.log(`📡 Querying teachers from ${apiUrl}...`);
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-admin-secret': secret,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        console.error(`❌ Request failed (${res.status}):`, json.error || json.message);
        process.exit(1);
      }

      console.log(`📋 Found ${json.count || 0} registered teachers:\n`);
      if (json.teachers && json.teachers.length > 0) {
        for (const t of json.teachers) {
          const statusIcon = t.isActive !== false ? '🟢 ACTIVE' : '🔴 DEACTIVATED';
          console.log(`  • [${statusIcon}] ${t.displayName || 'No Name'} <${t.email}>`);
          console.log(`    UID: ${t.uid} | Updated: ${new Date(t.updatedAt).toISOString()}`);
        }
      } else {
        console.log('  (No teachers currently provisioned)');
      }
      return;
    }

    if (action === 'status') {
      const res = await fetch(`${apiUrl}?email=${encodeURIComponent(email || '')}&uid=${encodeURIComponent(uid || '')}`, {
        method: 'GET',
        headers: { 'x-admin-secret': secret },
      });
      const json = await res.json();
      if (!res.ok) {
        console.error(`❌ Request failed:`, json.error || json.message);
        process.exit(1);
      }
      console.log('📋 User Status Details:');
      console.log(JSON.stringify(json.profile, null, 2));
      return;
    }

    if (action === 'grant' || action === 'create') {
      console.log(`⚙️  Provisioning teacher role for: ${email || uid}...`);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          action: 'provision',
          email,
          displayName: name,
          uid,
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error(`❌ Provisioning failed (${res.status}):`, json.error || json.message);
        process.exit(1);
      }

      console.log(`✅ SUCCESS: ${json.message}`);
      if (json.data) {
        console.log(`   User UID: ${json.data.uid}`);
        console.log(`   Role: ${json.data.role}`);
        console.log(`   Active: ${json.data.isActive}`);
      }
      return;
    }

    if (action === 'revoke') {
      console.log(`⚠️  Revoking teacher access for: ${email || uid} (Mode: ${mode})...`);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          action: 'revoke',
          email,
          uid,
          mode,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error(`❌ Revocation failed:`, json.error || json.message);
        process.exit(1);
      }

      console.log(`✅ SUCCESS: ${json.message}`);
      return;
    }

    if (action === 'invite') {
      console.log(`📨 Generating teacher onboarding invitation for: ${email}...`);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          action: 'create-invite',
          email,
          name,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error(`❌ Invitation creation failed:`, json.error || json.message);
        process.exit(1);
      }

      console.log(`✅ SUCCESS: ${json.message}`);
      if (json.data) {
        console.log(`   Invitation Token: ${json.data.token}`);
        console.log(`   Expires At: ${new Date(json.data.expiresAt).toISOString()}`);
      }
      return;
    }

    console.error(`Unknown action: ${action}`);
  } catch (err) {
    console.error('❌ Connection or Execution Error:', err.message);
    console.error('   Ensure the EduPilot dev server is running (npm run dev) on', baseUrl);
    process.exit(1);
  }
}

run();
