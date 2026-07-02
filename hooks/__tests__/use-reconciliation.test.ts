import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReconciliation } from "../use-reconciliation";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const job = {
    id: "job1", filename: "june-statement.csv", status: "COMPLETED" as const,
    totalRows: 10, confirmedRows: 7, skippedRows: 2, postedRows: 0,
    profile: null, uploadedBy: null, createdAt: "", updatedAt: "",
};
const row = {
    id: "row1", rowIndex: 1, date: "2026-06-01", narration: "Transfer",
    amount: 50000, creditDebit: "CREDIT" as const, status: "PENDING" as const,
    confirmedAccount: null, fingerprint: "abc123", createdAt: "",
};

beforeEach(() => jest.clearAllMocks());

describe("useReconciliation", () => {
    it("fetches jobs on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: { data: [job], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } });
        const { result } = renderHook(() => useReconciliation());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/reconciliation/jobs");
        expect(result.current.jobs).toEqual([job]);
    });

    it("fetches rows when a job is selected", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: { data: [job], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } })
            .mockResolvedValueOnce({ data: { data: [row] } });

        const { result } = renderHook(() => useReconciliation());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.selectJob("job1"); });
        await waitFor(() => expect(result.current.isRowsLoading).toBe(false));

        expect(result.current.rows).toHaveLength(1);
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/reconciliation/jobs/job1/rows");
    });

    it("confirms a row and updates in-place", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: { data: [job], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } })
            .mockResolvedValueOnce({ data: { data: [row] } });
        const confirmed = { ...row, status: "CONFIRMED" as const, confirmedAccount: { id: "a1", name: "Cash", code: "1001" } };
        mockPatch.mockResolvedValueOnce({ data: { data: confirmed } });

        const { result } = renderHook(() => useReconciliation());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { result.current.selectJob("job1"); });
        await waitFor(() => expect(result.current.isRowsLoading).toBe(false));

        await act(async () => { await result.current.confirmRow("job1", "row1", "a1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/reconciliation/jobs/job1/rows/row1/confirm", { accountId: "a1" });
        expect(result.current.rows[0].status).toBe("CONFIRMED");
    });

    it("skips a row and updates in-place", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: { data: [job], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } })
            .mockResolvedValueOnce({ data: { data: [row] } });
        const skipped = { ...row, status: "SKIPPED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: skipped } });

        const { result } = renderHook(() => useReconciliation());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { result.current.selectJob("job1"); });
        await waitFor(() => expect(result.current.isRowsLoading).toBe(false));

        await act(async () => { await result.current.skipRow("job1", "row1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/reconciliation/jobs/job1/rows/row1/skip");
        expect(result.current.rows[0].status).toBe("SKIPPED");
    });

    it("bulk confirms rows and refetches", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: { data: [job], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } })
            .mockResolvedValueOnce({ data: { data: [row] } })
            .mockResolvedValueOnce({ data: { data: [row] } }); // refetch after bulk confirm
        mockPost.mockResolvedValueOnce({ data: { data: {} } });

        const { result } = renderHook(() => useReconciliation());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { result.current.selectJob("job1"); });
        await waitFor(() => expect(result.current.isRowsLoading).toBe(false));

        await act(async () => { await result.current.bulkConfirm("job1", ["row1"], "a1"); });

        expect(mockPost).toHaveBeenCalledWith(
            "/admin/finance/reconciliation/jobs/job1/bulk-confirm",
            { rowIds: ["row1"], accountId: "a1" }
        );
    });
});
