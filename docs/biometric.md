# Nexora Smart Edu — Biometric Architecture

> **V1 ships a development-only adapter.** It is not production biometric
> verification and must be replaced before face/liveness features go live.

## Provider abstraction

`BiometricService` depends on a `BiometricProvider` interface, so any real
engine (InsightFace, ONNX, a cloud vendor) can be swapped in without touching
the attendance flow:

```ts
export interface BiometricProvider {
  enroll(imageData: string): Promise<string>;         // returns embedding hash
  verify(embeddingHash: string, imageData: string): Promise<boolean>;
  livenessCheck(challenge: string, response: string): Promise<boolean>;
  deleteEnrollment(embeddingHash: string): Promise<void>;
}
```

## Dev adapter (V1)

`DevBiometricProvider` hashes image data with SHA-256 and treats it as a
"pseudo-embedding". It **always passes** liveness. It exists only so the
enrollment/verification API surface can be exercised end-to-end in development.

```ts
class DevBiometricProvider implements BiometricProvider {
  async enroll(imageData: string) {
    return createHash('sha256').update(`dev-enroll:${imageData}`).digest('hex');
  }
  async verify(embeddingHash: string, imageData: string) {
    return createHash('sha256').update(`dev-enroll:${imageData}`).digest('hex') === embeddingHash;
  }
  async livenessCheck() { return true; }  // dev only
}
```

## Privacy by design

- The database stores **only a hashed/encrypted template reference**
  (`biometric_profiles.embedding_hash`), never a raw image.
- `embeddingHash` is never returned by ordinary API responses.
- Enrollment/deletion are audited (`BIOMETRIC_ENROLLED`, `BIOMETRIC_DELETED`).

## Enrollment & verification flow

1. **Enroll** (`POST /biometrics/enroll`) — a teacher's face template is hashed
   and stored, linked to `teacher_id`.
2. **Verify** (`POST /biometrics/verify/:teacherId`) — a fresh capture is
   compared against the stored hash; returns `{ verified, reason }`.
3. **Attendance integration** — verification status is recorded on the
   attendance event (`identity_verification_status`, `liveness_status`).

## Production path

Replace `DevBiometricProvider` with a real provider that:
- returns a cryptographically sound embedding;
- performs real liveness (blink/challenge-response);
- stores templates in encrypted object storage (not the DB), keeping only the
  reference hash in `biometric_profiles`.
