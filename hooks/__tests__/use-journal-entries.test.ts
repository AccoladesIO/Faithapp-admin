import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useJournalEntries, JournalEntry } from "../use-journal-entries";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;
const mockDelete = api.delete as jest.MockedFunction<typeof api.delete>;

const entry = {
    id: "je1", reference: "REF-001", description: "Test entry",
    entryType: "STANDARD" as const, status: "PENDING_APPROVAL" as const,
    date: "2026-06-01", idempotencyKey: null, lines: [],
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
                date: "2026-06-01", description: "Test",
                source: "MANUAL", entryType: "STANDARD",
                accountingPeriodId: "period-1", idempotencyKey: "key-1",
                lines: [{ accountId: "a1", entryType: "DEBIT", amount: 100 }, { accountId: "a2", entryType: "CREDIT", amount: 100 }],
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

    it("rejects an entry and moves it to DRAFT in the list", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const draft = { ...entry, status: "DRAFT" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: draft } });

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.rejectEntry("je1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/journal-entries/je1/reject");
        expect(result.current.entries[0].status).toBe("DRAFT");
    });

    it("resubmits a draft entry back to PENDING_APPROVAL", async () => {
        const draftEntry = { ...entry, status: "DRAFT" as const };
        const draftPaged = { data: { data: { data: [draftEntry], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } };
        mockGet.mockResolvedValueOnce(draftPaged);
        const pending = { ...draftEntry, status: "PENDING_APPROVAL" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: pending } });

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.resubmitEntry("je1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/journal-entries/je1/resubmit");
        expect(result.current.entries[0].status).toBe("PENDING_APPROVAL");
    });

    it("deletes a draft entry and removes it from the list", async () => {
        mockGet.mockResolvedValueOnce(paged);
        mockDelete.mockResolvedValueOnce({});

        const { result } = renderHook(() => useJournalEntries());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.entries).toHaveLength(1);

        await act(async () => { await result.current.deleteEntry("je1"); });

        expect(mockDelete).toHaveBeenCalledWith("/admin/finance/journal-entries/je1");
        expect(result.current.entries).toHaveLength(0);
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
