import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRecurringEntries } from "../use-recurring-entries";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const entry = {
    id: "re1", description: "Monthly office rent",
    debitAccount: { id: "a1", name: "Rent Expense", code: "5100" },
    creditAccount: { id: "a2", name: "Bank Account", code: "1010" },
    amount: 150000, frequency: "MONTHLY" as const,
    fund: { id: "f1", name: "General Fund" },
    nextDueAt: "2026-07-01T00:00:00.000Z",
    isActive: true, createdAt: "", updatedAt: "",
};

beforeEach(() => jest.clearAllMocks());

describe("useRecurringEntries", () => {
    it("fetches entries on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [entry] } });
        const { result } = renderHook(() => useRecurringEntries());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/recurring-entries");
        expect(result.current.entries).toEqual([entry]);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Unauthorized" });
        const { result } = renderHook(() => useRecurringEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Unauthorized");
    });

    it("creates an entry and prepends to list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [entry] } });
        const created = { ...entry, id: "re2", description: "Quarterly audit fee" };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => useRecurringEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createEntry({
                description: "Quarterly audit fee",
                debitAccountId: "a1", creditAccountId: "a2",
                amount: 50000, frequency: "QUARTERLY",
                fundId: "f1", nextDueAt: "2026-09-01",
            });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/recurring-entries", expect.objectContaining({ description: "Quarterly audit fee" }));
        expect(result.current.entries[0].id).toBe("re2");
    });

    it("updates an entry in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [entry] } });
        const updated = { ...entry, amount: 200000 };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useRecurringEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updateEntry("re1", { amount: 200000 }); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/recurring-entries/re1", { amount: 200000 });
        expect(result.current.entries[0].amount).toBe(200000);
    });

    it("pauses an entry by setting isActive false", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [entry] } });
        const paused = { ...entry, isActive: false };
        mockPatch.mockResolvedValueOnce({ data: { data: paused } });

        const { result } = renderHook(() => useRecurringEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updateEntry("re1", { isActive: false }); });

        expect(result.current.entries[0].isActive).toBe(false);
    });
});
