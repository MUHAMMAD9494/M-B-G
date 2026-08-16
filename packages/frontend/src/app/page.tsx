export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-blue-900">NEXORA SMART EDU</h1>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-200 hover:dark:border-neutral-700 hover:dark:bg-neutral-800">
          <h2 className="mb-3 text-2xl font-semibold">Teacher Attendance</h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Secure check-in/out with GPS & Face Verification. (Phase 1 Foundation)
          </p>
        </div>
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-200 opacity-50">
          <h2 className="mb-3 text-2xl font-semibold">Student Attendance</h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">Coming Soon</p>
        </div>
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-200 opacity-50">
          <h2 className="mb-3 text-2xl font-semibold">Parent Portal</h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">Coming Soon</p>
        </div>
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-200 opacity-50">
          <h2 className="mb-3 text-2xl font-semibold">School Fees</h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">Coming Soon</p>
        </div>
      </div>
      
      <div className="text-blue-600 font-semibold mt-10">
        Phase 1 Foundation Ready • Multi-Tenant SaaS Architecture
      </div>
    </main>
  );
}
