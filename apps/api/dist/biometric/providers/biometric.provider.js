"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevBiometricProvider = exports.LIVENESS_CHALLENGE_KINDS = void 0;
exports.generateLivenessChallenge = generateLivenessChallenge;
const crypto_1 = require("crypto");
exports.LIVENESS_CHALLENGE_KINDS = [
    'blink',
    'turn-left',
    'turn-right',
    'smile',
];
function generateLivenessChallenge() {
    const kind = exports.LIVENESS_CHALLENGE_KINDS[Math.floor(Math.random() * exports.LIVENESS_CHALLENGE_KINDS.length)];
    return {
        kind,
        nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        issuedAt: new Date().toISOString(),
    };
}
class DevBiometricProvider {
    async enroll(imageData) {
        return (0, crypto_1.createHash)('sha256').update(`dev-enroll:${imageData}`).digest('hex');
    }
    async verify(embeddingHash, imageData) {
        const hash = (0, crypto_1.createHash)('sha256').update(`dev-enroll:${imageData}`).digest('hex');
        return hash === embeddingHash;
    }
    async livenessCheck(_challenge, _response) {
        return { passed: true, score: 1, reason: 'dev-adapter' };
    }
    async deleteEnrollment(_embeddingHash) { }
}
exports.DevBiometricProvider = DevBiometricProvider;
//# sourceMappingURL=biometric.provider.js.map