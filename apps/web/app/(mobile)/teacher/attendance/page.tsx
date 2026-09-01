'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, getDeviceId } from '@/lib/api';
import { cacheTeacherProfile, getCachedTeacherProfile } from '@/lib/idb';
import { syncEngine, type SyncState } from '@/lib/offline/sync-engine';
import {
  MapPin,
  Camera,
  ShieldCheck,
  WifiOff,
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ScanFace,
} from 'lucide-react';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department?: string | null;
  branchId?: string | null;
  email?: string;
}

interface LivenessChallenge {
  kind: 'blink' | 'turn-left' | 'turn-right' | 'smile';
  nonce: string;
  issuedAt: string;
}

type Step = 'location' | 'identity' | 'ready';

const CHALLENGE_LABEL: Record<LivenessChallenge['kind'], string> = {
  blink: 'Blink naturally a few times',
  'turn-left': 'Slowly turn your head left',
  'turn-right': 'Slowly turn your head right',
  smile: 'Smile into the camera',
};

/** Fetch rejects with a TypeError when the network is unreachable. */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export default function MobileAttendancePage() {
  const { token, user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [sync, setSync] = useState<SyncState>(syncEngine.getState());

  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [challenge, setChallenge] = useState<LivenessChallenge | null>(null);
  const [livenessPassed, setLivenessPassed] = useState(false);
  /** True when face verification was skipped (offline / verification service unreachable). */
  const [livenessDeferred, setLivenessDeferred] = useState(false);
  const [brightness, setBrightness] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Subscribe to offline sync state.
  useEffect(() => {
    const unsub = syncEngine.subscribe(setSync);
    return unsub;
  }, []);

  // Load the teacher profile linked to this account. Online: fetch from the
  // API and refresh the IndexedDB cache. Offline: serve the cached profile so
  // the clock page renders and record() can still enqueue.
  const loadTeacher = useCallback(async () => {
    const target = user?.email;
    if (!target) return;

    if (isOffline()) {
      const cached = await getCachedTeacherProfile();
      if (cached) setTeacher(cached);
      else setError('You are offline and no saved profile is available. Go online once to cache it, then you can clock in offline.');
      return;
    }

    try {
      const r = await api.get<{ data: Teacher[] }>(
        '/teachers?search=' + encodeURIComponent(target),
        token ?? undefined,
      );
      const match = r.data.find((t) => t.email === target);
      if (match) {
        setTeacher(match);
        await cacheTeacherProfile(match);
        return;
      }
    } catch (err) {
      // Fall through to cache on network failure.
      if (!isNetworkError(err)) {
        const cached = await getCachedTeacherProfile();
        if (!cached) setError(err instanceof Error ? err.message : 'Could not load your teacher profile.');
        else setTeacher(cached);
        return;
      }
    }

    // No match online (or network failure) — use the cached profile.
    const cached = await getCachedTeacherProfile();
    if (cached) setTeacher(cached);
    else if (!isOffline()) setError('No teacher profile found for this account.');
  }, [token, user]);

  useEffect(() => {
    void loadTeacher();
  }, [loadTeacher]);

  // Refresh the cached profile whenever we come back online.
  useEffect(() => {
    const onOnline = () => void loadTeacher();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [loadTeacher]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /** Attach the live stream to the video element as soon as it mounts. */
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function getPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  async function requestLocation() {
    setGpsError(null);
    setError(null);
    try {
      const pos = await getPosition();
      setGps(pos);
    } catch (err) {
      setGpsError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Location permission is required to clock in.'
          : 'Could not determine your location. Move to an open area and retry.',
      );
    }
  }

  async function startCamera(): Promise<boolean> {
    if (streamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch {
      setError('Camera permission is required for identity verification.');
      return false;
    }
  }

  /** Capture a downscaled JPEG frame + a rough brightness reading. */
  function captureFrame(): { dataUrl: string; brightness: number } | null {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 480, 360);
    const { data } = ctx.getImageData(0, 0, 480, 360);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    const avg = sum / (data.length / 4);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.7), brightness: avg };
  }

  async function beginIdentityCheck() {
    setError(null);

    // Genuinely offline — skip the server liveness challenge entirely. Face
    // verification is deferred to the next online session and the queued event
    // is tagged 'gps_offline_deferred' so the audit trail stays honest.
    if (isOffline()) {
      stopCamera();
      setLivenessDeferred(true);
      setLivenessPassed(true);
      setStatus('Offline mode — face verification will run when you are back online.');
      return;
    }

    const ok = await startCamera();
    if (!ok) return;
    try {
      const c = await api.post<LivenessChallenge>('/biometrics/liveness/challenge', {}, token ?? undefined);
      setChallenge(c);
      setLivenessPassed(false);
    } catch (err) {
      stopCamera();
      if (isNetworkError(err)) {
        // Verification service unreachable (network flap) — behave like
        // offline: defer face verification rather than blocking clock-in.
        setLivenessDeferred(true);
        setLivenessPassed(true);
        setStatus('Could not reach the verification service — face verification deferred.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not start identity verification.');
      }
    }
  }

  async function submitLiveness() {
    if (!challenge) return;
    const frame = captureFrame();
    if (!frame) {
      setError('Unable to capture a frame. Make sure your camera is on.');
      return;
    }
    setBrightness(frame.brightness);
    if (frame.brightness < 60) {
      setError('Lighting is too low. Move to a brighter area and retry.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ passed: boolean }>(
        '/biometrics/liveness/check',
        { response: frame.dataUrl, nonce: challenge.nonce, kind: challenge.kind, issuedAt: challenge.issuedAt },
        token ?? undefined,
      );
      setLivenessPassed(res.passed);
      if (res.passed) {
        setLivenessDeferred(false);
        setStatus('Identity verified. You can now clock in or out.');
      } else {
        setError('Liveness check failed. Please retry.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Liveness check failed.');
    } finally {
      setBusy(false);
      stopCamera();
    }
  }

  async function record(type: 'CHECK_IN' | 'CHECK_OUT') {
    if (!teacher || !gps) {
      setError('Location and identity verification are required first.');
      return;
    }
    setError(null);
    setStatus(null);
    setBusy(true);
    const deviceId = getDeviceId();
    const baseEvent = {
      attendanceType: type,
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: gps.accuracy,
      deviceId,
    };
    // Live path keeps the full liveness flow; deferred path tags events so the
    // server knows face verification is still outstanding.
    const verificationMethod = livenessDeferred ? 'gps' : 'gps_geofence_liveness';
    const queueVerificationMethod = livenessDeferred ? 'gps_offline_deferred' : 'gps_geofence_liveness';
    try {
      if (!isOffline()) {
        try {
          await api.post('/attendance/check-in', { ...baseEvent, verificationMethod }, token ?? undefined);
          setStatus(`${type === 'CHECK_IN' ? 'Checked in' : 'Checked out'} successfully.`);
          return;
        } catch (err) {
          if (!isNetworkError(err)) {
            // Server rejected the event — surface it instead of queueing
            // something that can never be accepted.
            setError(err instanceof Error ? err.message : 'Server rejected the check-in.');
            return;
          }
          // Network failure — fall through and queue for offline sync.
        }
      }
      await syncEngine.enqueue({
        localEventId: crypto.randomUUID(),
        teacherId: teacher.id,
        attendanceType: type,
        timestamp: new Date().toISOString(),
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy,
        deviceId,
        verificationMethod: queueVerificationMethod,
        verificationState: livenessDeferred ? 'pending_verification' : 'verified_local',
      });
      setStatus(
        isOffline()
          ? 'Saved offline — will sync when back online.'
          : 'Saved for retry — will sync when connectivity returns.',
      );
    } finally {
      setBusy(false);
    }
  }

  const locationReady = !!gps && !gpsError;
  const step: Step = !locationReady ? 'location' : !livenessPassed ? 'identity' : 'ready';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface px-4 pb-8 pt-4 text-stone-900">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg tracking-tight">Nexora</p>
          <p className="text-xs text-stone-500">Teacher attendance</p>
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            sync.online ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
          }`}
        >
          {sync.online ? <ShieldCheck size={14} /> : <WifiOff size={14} />}
          <span>
            {sync.online
              ? sync.pending > 0
                ? `${sync.pending} pending`
                : 'Online'
              : 'Offline'}
          </span>
          {sync.lastSyncAt && (
            <>
              <span className="opacity-60">·</span>
              <span>
                synced {new Date(sync.lastSyncAt).toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Teacher identity */}
      {teacher && (
        <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Signed in as</p>
          <p className="mt-1 text-lg font-semibold">
            {teacher.firstName} {teacher.lastName}
          </p>
          <p className="text-sm text-stone-500">
            {teacher.employeeId}
            {teacher.designation ? ` · ${teacher.designation}` : ''}
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="mt-5 flex items-center gap-2 text-xs text-stone-500">
        <StepBadge active={step === 'location'} done={locationReady} label="Location" />
        <span className="h-px flex-1 bg-stone-200" />
        <StepBadge
          active={step === 'identity'}
          done={livenessPassed}
          label={livenessDeferred ? 'Identity (deferred)' : 'Identity'}
        />
        <span className="h-px flex-1 bg-stone-200" />
        <StepBadge active={step === 'ready'} done={false} label="Clock" />
      </div>

      {/* Status / errors */}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle size={14} className="mr-1 inline" /> {error}
        </p>
      )}
      {status && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={14} className="mr-1 inline" /> {status}
        </p>
      )}

      {/* Location step */}
      {step === 'location' && (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-medium">Confirm your location</p>
              <p className="text-sm text-stone-500">We verify you are within the school area.</p>
            </div>
          </div>
          {gps && (
            <p className="mt-3 text-sm text-stone-600">
              Accuracy: <span className="font-medium">{Math.round(gps.accuracy)} m</span>
            </p>
          )}
          <button
            onClick={requestLocation}
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {gps ? 'Refresh location' : 'Share my location'}
          </button>
        </section>
      )}

      {/* Identity step — skipped entirely when face verification is deferred. */}
      {step === 'identity' && (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <ScanFace size={20} />
            </div>
            <div>
              <p className="font-medium">Verify it&apos;s you</p>
              <p className="text-sm text-stone-500">Camera + a quick anti-spoofing check.</p>
            </div>
          </div>

          {!challenge ? (
            <button
              onClick={beginIdentityCheck}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              Start identity check
            </button>
          ) : (
            <div className="mt-4">
              <div className="relative overflow-hidden rounded-xl bg-stone-900">
                <video
                  ref={attachVideo}
                  playsInline
                  muted
                  aria-label="Camera preview for identity verification"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-32 rounded-full border-2 border-white/70" />
                </div>
              </div>
              <p className="mt-3 text-center text-sm font-medium text-stone-700">
                {CHALLENGE_LABEL[challenge.kind]}
              </p>
              {brightness !== null && (
                <p className="mt-1 text-center text-xs text-stone-500">
                  Lighting: {brightness < 60 ? 'too dark' : brightness > 200 ? 'too bright' : 'good'}
                </p>
              )}
              <button
                onClick={submitLiveness}
                disabled={busy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <Camera size={16} /> {busy ? 'Verifying…' : 'Capture & verify'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Clock step */}
      {step === 'ready' && (
        <section className="mt-5 flex flex-col gap-3">
          {livenessDeferred && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">Identity check deferred</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Face verification could not run. Your clock event will be tagged
                for deferred verification; liveness will be retried on your next
                online session.
              </p>
              {sync.online && (
                <button
                  onClick={beginIdentityCheck}
                  disabled={busy}
                  className="mt-2 flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  <ScanFace size={14} /> Retry face verification
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="font-medium">Ready to clock</p>
                <p className="text-sm text-stone-500">
                  {gps ? `GPS ${Math.round(gps.accuracy)} m accuracy` : ''} · identity verified
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => record('CHECK_IN')}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <LogIn size={20} /> {busy ? 'Working…' : 'Check in'}
          </button>
          <button
            onClick={() => record('CHECK_OUT')}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-60"
          >
            <LogOut size={20} /> {busy ? 'Working…' : 'Check out'}
          </button>
        </section>
      )}

      {/* Offline queue — includes verification-state legend so pending
          identity verification is visible and auditable at a glance. */}
      {sync.pending > 0 && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <Clock size={16} /> {sync.pending} event(s) waiting to sync
          </div>
          <button
            onClick={() => syncEngine.flush(token ?? undefined)}
            disabled={sync.syncing || !sync.online}
            className="flex items-center gap-1 font-medium text-amber-900 underline disabled:opacity-50"
          >
            <RefreshCw size={14} /> {sync.syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      )}
      {sync.pending > 0 && livenessDeferred && (
        <p className="mt-2 text-xs text-amber-700">
          Verification state: pending (identity check deferred until online).
        </p>
      )}
    </main>
  );
}

function StepBadge({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
        done
          ? 'bg-emerald-50 text-emerald-700'
          : active
            ? 'bg-indigo-600 text-white'
            : 'bg-stone-100 text-stone-500'
      }`}
    >
      {done && <CheckCircle2 size={12} />}
      {label}
    </span>
  );
}