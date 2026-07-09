import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EntryForm from "@/app/components/EntryForm";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock fetch: /api/penn-majors returns fixture data per school
const MOCK_MAJORS: Record<string, string[]> = {
  SEAS: ["Artificial Intelligence, BSE", "Computer Science, BSE", "Bioengineering, BSE"],
  Wharton: ["Accounting, BS", "Finance, BS", "Marketing, BS"],
  CAS: ["Economics, BA", "History, BA", "Psychology, BA"],
  Nursing: ["Nursing, BSN", "Nutrition Science, BSN"],
};

function mockFetch(url: string) {
  const u = new URL(url, "http://localhost");
  const schools = u.searchParams.get("schools")?.split(",").map((s) => s.trim()) ?? [];
  const majors = schools.flatMap((s) => MOCK_MAJORS[s] ?? []).sort();
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ majors }),
  } as Response);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetch));
  localStorage.clear();
});

describe("EntryForm", () => {
  it("renders the form with all fields", () => {
    render(<EntryForm />);
    expect(screen.getByPlaceholderText("e.g. Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Select school(s)")).toBeInTheDocument();
    expect(screen.getByText("Select school first")).toBeInTheDocument();
    expect(screen.getByText("Select year")).toBeInTheDocument();
    expect(screen.getByText(/Enter Career@Penn/)).toBeInTheDocument();
  });

  it("opens the school dropdown when clicked", async () => {
    const user = userEvent.setup();
    render(<EntryForm />);
    await user.click(screen.getByText("Select school(s)"));
    expect(screen.getByText("SEAS")).toBeInTheDocument();
    expect(screen.getByText("Wharton")).toBeInTheDocument();
    expect(screen.getByText("CAS")).toBeInTheDocument();
    expect(screen.getByText("Nursing")).toBeInTheDocument();
  });

  it("shows one major dropdown after selecting one school", async () => {
    const user = userEvent.setup();
    render(<EntryForm />);
    await user.click(screen.getByText("Select school(s)"));
    await user.click(screen.getByLabelText("SEAS"));

    await waitFor(() => {
      expect(screen.getByText("Computer Science, BSE")).toBeInTheDocument();
    });
    // Should not show a second major dropdown yet
    expect(screen.queryByText("SEAS Major")).not.toBeInTheDocument();
  });

  it("shows two major dropdowns after selecting two schools", async () => {
    const user = userEvent.setup();
    render(<EntryForm />);
    await user.click(screen.getByText("Select school(s)"));
    await user.click(screen.getByLabelText("SEAS"));
    await user.click(screen.getByLabelText("Wharton"));

    await waitFor(() => {
      expect(screen.getByText("SEAS Major")).toBeInTheDocument();
      expect(screen.getByText("Wharton Major")).toBeInTheDocument();
    });
  });

  it("majors for each school are filtered correctly", async () => {
    const user = userEvent.setup();
    render(<EntryForm />);
    await user.click(screen.getByText("Select school(s)"));
    await user.click(screen.getByLabelText("SEAS"));
    await user.click(screen.getByLabelText("Wharton"));

    await waitFor(() => {
      // SEAS dropdown should have SEAS majors
      expect(screen.getByText("Computer Science, BSE")).toBeInTheDocument();
      // Wharton dropdown should have Wharton majors
      expect(screen.getByText("Finance, BS")).toBeInTheDocument();
      // Neither should have CAS majors
      expect(screen.queryByText("History, BA")).not.toBeInTheDocument();
    });
  });

  it("disables 3rd school checkbox when two are already selected", async () => {
    const user = userEvent.setup();
    render(<EntryForm />);
    await user.click(screen.getByText("Select school(s)"));
    await user.click(screen.getByLabelText("SEAS"));
    await user.click(screen.getByLabelText("Wharton"));

    const casCheckbox = screen.getByLabelText("CAS") as HTMLInputElement;
    expect(casCheckbox.disabled).toBe(true);
  });

  it("clears major when school is deselected", async () => {
    const user = userEvent.setup();
    render(<EntryForm />);
    await user.click(screen.getByText("Select school(s)"));
    await user.click(screen.getByLabelText("SEAS"));

    await waitFor(() => expect(screen.getByText("Computer Science, BSE")).toBeInTheDocument());

    // major select is the first combobox; year is the second
    const [majorSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(majorSelect, "Computer Science, BSE");

    // Re-open dropdown then deselect SEAS
    await user.click(screen.getByText("SEAS"));
    await user.click(screen.getByLabelText("SEAS"));

    await waitFor(() => {
      expect(screen.queryByText("Computer Science, BSE")).not.toBeInTheDocument();
    });
  });

  it("saves guestProfile to localStorage on submit", async () => {
    const user = userEvent.setup();
    render(<EntryForm />);

    await user.type(screen.getByPlaceholderText("e.g. Jane Smith"), "Test User");
    await user.click(screen.getByText("Select school(s)"));
    await user.click(screen.getByLabelText("SEAS"));

    await waitFor(() => expect(screen.getByText("Computer Science, BSE")).toBeInTheDocument());

    const [majorSelect, yearSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(majorSelect, "Computer Science, BSE");
    await user.selectOptions(yearSelect, "2027");

    await user.click(screen.getByText(/Enter Career@Penn/));

    const stored = JSON.parse(localStorage.getItem("guestProfile") ?? "{}");
    expect(stored.name).toBe("Test User");
    expect(stored.school).toBe("SEAS");
    expect(stored.major).toBe("Computer Science, BSE");
    expect(stored.class_year).toBe("2027");
  });

  it("shows sign in link", () => {
    render(<EntryForm />);
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
  });
});
