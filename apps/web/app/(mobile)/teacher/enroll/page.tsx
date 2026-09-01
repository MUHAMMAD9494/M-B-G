'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  UserCheck,
  IdCard,
  ScanFace,
  Smartphone,
  PartyPopper,
  Check,
  CheckCircle2,
  Camera,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department?: string | null;
  branchId?: string | null;
  branchName?: string | null;
}

const STEPS = ['Account', 'Profile', 'Face ID', 'Device', 'Done'];

export default function MobileEnrollPage() {
  const { token, user } = useAuth();
  const [step, setStep] = useState(0);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [captured, setCaptured] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  const [consent, setConsent] = useState(false);
  const [deviceBound, setDeviceBound] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load teacher profile.
  useEffect(() => {
    if (!user?.email) return;
    api
      .get<{ data: Teacher[] }>('/teachers?search=' + encodeURIComponent(user.email), token ?? undefined)
      .then((r) => {
        const match = r.data.find((t) => (t as unknown as { email?: string }).email === user?.email);
        if (match) setTeacher(match);
      })
      .catch(() => setError('Could not load your teacher profile.'))
      .finally(() => setLoading(false));
  }, [token, user]);

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
      setError('Camera permission is required for face enrollment.');
      return false;
    }
  }

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

  async function openCamera() {
    setError(null);
    const ok = await startCamera();
    if (!ok) return;
  }

  async function capture() {
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
    setCaptured(frame.dataUrl);
    stopCamera();
  }

  async function enroll() {
    if (!teacher || !captured) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/biometrics/enroll', { teacherId: teacher.id, imageData: captured }, token ?? undefined);
      setEnrolled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed.');
    } finally {
      setBusy(false);
    }
  }

  async function bindDevice() {
    if (!consent) {
      setError('Please accept the geofence consent to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let deviceId = localStorage.getItem('nexora-device-id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('nexora-device-id', deviceId);
      }
      await api.post(
        '/devices/register',
        {
          deviceIdentifier: deviceId,
          deviceType: navigator.userAgent,
          platform: 'web',
        },
        token ?? undefined,
      );
      setDeviceBound(true);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Device binding failed.');
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (step === 2 && !enrolled) {
      setError('Complete face enrollment first.');
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center text-stone-400">
        Loading enrollment…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface px-4 pb-10 pt-4 text-stone-900">
      {/* Header */}
      <header className="flex items-center justify-between">
        <p className="font-display text-lg tracking-tight">Nexora</p>
        <p className="text-xs text-stone-500">Enrollment · {step + 1} of {STEPS.length}</p>
      </header>

      {/* Progress */}
      <div className="mt-4 flex items-center gap-1">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-indigo-600' : 'bg-stone-200'}`}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle size={14} className="mr-1 inline" /> {error}
        </p>
      )}

      {/* STEP 0 — account */}
      {step === 0 && (
        <section className="mt-6">
          <StepIcon icon={<UserCheck size={22} />} />
          <h1 className="mt-4 text-xl font-semibold">Verify your account</h1>
          <p className="mt-1 text-sm text-stone-500">
            You&apos;ve been invited to join Nexora. Confirm this is you.
          </p>
          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-400">Email</p>
            <p className="mt-1 font-medium">{user?.email}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-stone-400">Name</p>
            <p className="mt-1 font-medium">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <PrimaryButton onClick={next} label="This is me" />
        </section>
      )}

      {/* STEP 1 — profile review */}
      {step === 1 && (
        <section className="mt-6">
          <StepIcon icon={<IdCard size={22} />} />
          <h1 className="mt-4 text-xl font-semibold">Review your profile</h1>
          <p className="mt-1 text-sm text-stone-500">Confirm your employment details are correct.</p>
          <dl className="mt-5 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            <Row label="Employee ID" value={teacher?.employeeId ?? '—'} />
            <Row label="Department" value={teacher?.department ?? '—'} />
            <Row label="Designation" value={teacher?.designation ?? 'Teacher'} />
            <Row label="Branch" value={teacher?.branchName ?? 'Main Campus'} />
          </dl>
          <div className="mt-5 flex gap-3">
            <GhostButton onClick={back} label="Back" />
            <PrimaryButton onClick={next} label="Looks correct" />
          </div>
        </section>
      )}

      {/* STEP 2 — biometric enrollment */}
      {step === 2 && (
        <section className="mt-6">
          <StepIcon icon={<ScanFace size={22} />} />
          <h1 className="mt-4 text-xl font-semibold">Enroll your face</h1>
          <p className="mt-1 text-sm text-stone-500">
            We store a secure template (not your photo) for clock-in verification.
          </p>

          {!captured ? (
            <div className="mt-5">
              {streamRef.current ? (
                <>
                  <div className="relative overflow-hidden rounded-2xl bg-stone-900">
                    <video ref={attachVideo} playsInline muted className="aspect-[4/3] w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-44 w-36 rounded-full border-2 border-white/70" />
                    </div>
                  </div>
                  <p className="mt-2 text-center text-sm text-stone-500">
                    Center your face in the oval, facing a light source.
                  </p>
                  {brightness !== null && (
                    <p className="mt-1 text-center text-xs text-stone-400">
                      Lighting: {brightness < 60 ? 'too dark' : brightness > 200 ? 'too bright' : 'good'}
                    </p>
                  )}
                  <div className="mt-3 flex gap-3">
                    <GhostButton onClick={stopCamera} label="Cancel" />
                    <PrimaryButton onClick={capture} label="Capture" icon={<Camera size={16} />} />
                  </div>
                </>
              ) : (
                <button
                  onClick={openCamera}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  <Camera size={18} /> Open camera
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={captured} alt="Captured face" className="aspect-[4/3] w-full object-cover" />
              </div>
              <div className="mt-3 flex gap-3">
                <GhostButton
                  onClick={() => {
                    setCaptured(null);
                    setBrightness(null);
                  }}
                  label="Retake"
                />
                <PrimaryButton
                  onClick={enroll}
                  label={busy ? 'Enrolling…' : 'Enroll'}
                  disabled={busy}
                  icon={<ShieldCheck size={16} />}
                />
              </div>
              {enrolled && (
                <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 size={14} className="mr-1 inline" /> Face enrolled successfully.
                </p>
              )}
            </div>
          )}

          {enrolled && (
            <div className="mt-4 flex gap-3">
              <GhostButton onClick={back} label="Back" />
              <PrimaryButton onClick={next} label="Continue" />
            </div>
          )}
        </section>
      )}

      {/* STEP 3 — device binding + geofence consent */}
      {step === 3 && (
        <section className="mt-6">
          <StepIcon icon={<Smartphone size={22} />} />
          <h1 className="mt-4 text-xl font-semibold">Bind this device</h1>
          <p className="mt-1 text-sm text-stone-500">
            Your device is linked to your clock-ins for accountability.
          </p>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-stone-600">
              I consent to location verification via geofence during clock-in and clock-out.
              My location is only checked at the moment of attendance.
            </span>
          </label>

          <div className="mt-5 flex gap-3">
            <GhostButton onClick={back} label="Back" />
            <PrimaryButton
              onClick={bindDevice}
              label={busy ? 'Binding…' : 'Bind & finish'}
              disabled={busy || !consent}
            />
          </div>
        </section>
      )}

      {/* STEP 4 — confirmation */}
      {step === 4 && (
        <section className="mt-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <PartyPopper size={28} />
          </div>
          <h1 className="mt-4 text-xl font-semibold">You&apos;re all set, {teacher?.firstName ?? 'teacher'}</h1>
          <p className="mt-1 text-sm text-stone-500">
            Your account is enrolled and your device is bound. You can now clock in and out
            from the attendance screen.
          </p>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {teacher?.firstName?.[0] ?? 'T'}
                {teacher?.lastName?.[0] ?? ''}
              </div>
              <div>
                <p className="font-medium">
                  {teacher?.firstName} {teacher?.lastName}
                </p>
                <p className="text-sm text-stone-500">{teacher?.employeeId}</p>
              </div>
              <Check className="ml-auto text-emerald-500" size={20} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>Identity verified</Badge>
              <Badge>Face enrolled</Badge>
              <Badge>Device bound</Badge>
            </div>
          </div>

          <a
            href="/teacher/attendance"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Go to attendance <ArrowRight size={16} />
          </a>
        </section>
      )}
    </main>
  );
}

function StepIcon({ icon }: { icon: React.ReactNode }) {
  return <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">{icon}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      {children}
    </span>
  );
}

function PrimaryButton({
  onClick,
  label,
  icon,
  disabled,
}: {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {label}
      {!icon && <ArrowRight size={16} />}
    </button>
  );
}

function GhostButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
    >
      <ArrowLeft size={15} /> {label}
    </button>
  );
}
