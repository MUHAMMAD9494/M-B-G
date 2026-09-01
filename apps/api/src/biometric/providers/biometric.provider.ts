// Nexora Smart Edu — biometric provider abstraction.
//
// V1 ships a DEV-ONLY adapter that derives a SHA-256 "pseudo-embedding" from
// image data. This is NOT production facial recognition and does NOT perform
// real liveness detection. The interface exists so a real engine (InsightFace,
// ONNX Runtime, NVIDIA edge, browser/device-based verification, etc.) can be
// swapped in behind the same contract without touching the attendance flow.
//
// Never present the dev adapter as production-grade identity verification.

import { createHash } from 'crypto';

/** Randomized anti-spoofing micro-challenge issued to the client. */
export interface LivenessChallenge {
  kind: 'blink' | 'turn-left' | 'turn-right' | 'smile';
  nonce: string;
  issuedAt: string;
}

export interface LivenessResult {
  passed: boolean;
  /** Confidence 0..1. */
  score: number;
  reason?: string;
}

export interface BiometricProvider {
  /** Extract an embedding/hash from captured image data. */
  enroll(imageData: string): Promise<string>;
  /** Compare a captured image against a stored embedding hash. */
  verify(embeddingHash: string, imageData: string): Promise<boolean>;
  /** Perform a liveness check against a challenge + client response. */
  livenessCheck(challenge: LivenessChallenge, response: string): Promise<LivenessResult>;
  deleteEnrollment(embeddingHash: string): Promise<void>;
}

export const LIVENESS_CHALLENGE_KINDS: LivenessChallenge['kind'][] = [
  'blink',
  'turn-left',
  'turn-right',
  'smile',
];

/** Issue a random, nonce-bound liveness challenge (anti-replay). */
export function generateLivenessChallenge(): LivenessChallenge {
  const kind =
    LIVENESS_CHALLENGE_KINDS[Math.floor(Math.random() * LIVENESS_CHALLENGE_KINDS.length)];
  return {
    kind,
    nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    issuedAt: new Date().toISOString(),
  };
}

/**
 * DevBiometricProvider — clearly labeled as development-only.
 * Uses SHA-256 of the image data as a "pseudo-embedding". Never use in
 * production for actual identity verification or anti-spoofing.
 */
export class DevBiometricProvider implements BiometricProvider {
  async enroll(imageData: string): Promise<string> {
    return createHash('sha256').update(`dev-enroll:${imageData}`).digest('hex');
  }

  async verify(embeddingHash: string, imageData: string): Promise<boolean> {
    const hash = createHash('sha256').update(`dev-enroll:${imageData}`).digest('hex');
    return hash === embeddingHash;
  }

  async livenessCheck(_challenge: LivenessChallenge, _response: string): Promise<LivenessResult> {
    // Dev adapter always passes. A real engine performs blink / head-movement
    // detection here and returns a genuine confidence score.
    return { passed: true, score: 1, reason: 'dev-adapter' };
  }

  async deleteEnrollment(_embeddingHash: string): Promise<void> {}
}
