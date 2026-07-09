import Navbar from "../components/Navbar";
import EntryForm from "../components/EntryForm";

export default function StartPage() {
  return (
    <main className="min-h-screen bg-[#edf0f9]">
      <Navbar />
      <EntryForm />
    </main>
  );
}
