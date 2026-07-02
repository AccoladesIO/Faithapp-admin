import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useJournalEntries, JournalEntry } from "../use-journal-entries";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const entry = {
    id: "je1", reference: "REF-001", description: "Test entry",
    entryType: "STANDARD" as const, status: "PENDING_APPROVAL" as const,
    entryDate: "2026-06-01", idempotencyKey: null, lines: [],
    createdBy: null, approvedBy: null, approvedAt: null, createdAt: "", updatedAt: "",
};
const paged = { data: { data: { data: [entry], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } };

beforeEach(() => jest.clearAllMocks());

describe("useJournalEntries", () => {
    it("fetches entries on mount", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const { result } = renderHook(() => useJournalEntries());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/finance/journal-entries"));
        expect(result.current.entries).toHaveLength(1);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Not found" });
        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Not found");
    });

    it("creates an entry and refetches", async () => {
        mockGet.mockResolvedValue(paged);
        mockPost.mockResolvedValueOnce({ data: { data: entry } });

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createEntry({
                description: "Test", entryDate: "2026-06-01",
                lines: [{ accountId: "a1", type: "DEBIT", amount: 100 }, { accountId: "a2", type: "CREDIT", amount: 100 }],
            });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/journal-entries", expect.objectContaining({ description: "Test" }));
    });

    it("approves an entry and updates list in-place", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const posted = { ...entry, status: "POSTED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: posted } });

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.approveEntry("je1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/journal-entries/je1/approve");
        expect(result.current.entries[0].status).toBe("POSTED");
    });

    it("voids an entry and updates list in-place", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const voided = { ...entry, status: "VOIDED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: voided } });

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.voidEntry("je1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/journal-entries/je1/void");
        expect(result.current.entries[0].status).toBe("VOIDED");
    });

    it("fetchEntryById GETs a single entry by id", async () => {
        mockGet.mockResolvedValueOnce(paged)
               .mockResolvedValueOnce({ data: { data: entry } });

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let fetched: JournalEntry | undefined;
        await act(async () => { fetched = await result.current.fetchEntryById("je1"); });

        expect(mockGet).toHaveBeenCalledWith("/admin/finance/journal-entries/je1");
        expect(fetched?.id).toBe("je1");
    });

    it("fetchEntryById sets error and throws when entry not found", async () => {
        mockGet.mockResolvedValueOnce(paged)
               .mockRejectedValueOnce({ response: { data: { message: "Entry not found" } } });

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.fetchEntryById("bad-id"); } catch (e: any) { caught = e; }
        });

        expect(caught?.message).toBe("Entry not found");
        expect(result.current.error).toBe("Entry not found");
    });
});
