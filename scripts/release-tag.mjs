#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const SHORT_SHA_LENGTH = 12;

function readGitSha() {
  return execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const sha = process.env.GITHUB_SHA || readGitSha();
const date = new Date().toISOString().slice(0, 10);

if (!/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error(`Expected a full commit SHA, got "${sha}"`);
}

process.stdout.write(`release-${date}-${sha.slice(0, SHORT_SHA_LENGTH)}\n`);
