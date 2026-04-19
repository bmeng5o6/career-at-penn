import Navbar from "../components/Navbar";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-black">Sign In</h1>
      </div>
    </main>
  );
}