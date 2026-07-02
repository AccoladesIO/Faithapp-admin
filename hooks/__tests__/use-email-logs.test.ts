import { renderHook, waitFor, act } from "@testing-library/react";
import { useEmailLogs, EmailLog, EmailLogFilters } from "../use-email-logs";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn() },
}));

import { api } from "@/utils/auth/axios-client";
const mockGet = api.get as jest.Mock;

function makeLog(overrides: Partial<EmailLog> = {}): EmailLog {
    return {
        id: "log-1",
        recipient: "member@example.com",
        subject: "Welcome to the congregation",
        status: "sent",
        jobId: "job-1",
        errorMessage: null,
        attemptsMade: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

function paginatedResponse(logs: EmailLog[], page = 1, totalPages = 1) {
    return {
        data: {
            data: {
                data: logs,
                page,
                limit: 20,
                totalCount: logs.length,
                totalPages,
            },
        },
    };
}

beforeEach(() => jest.clearAllMocks());

describe("useEmailLogs", () => {
    it("does not fetch on mount (requires explicit fetchLogs call)", () => {
        mockGet.mockResolvedValue(paginatedResponse([]));
        renderHook(() => useEmailLogs());
        expect(mockGet).not.toHaveBeenCalled();
    });

    it("fetches logs and populates state", async () => {
        const log = makeLog();
        mockGet.mockResolvedValue(paginatedResponse([log], 1, 3));

        const { result } = renderHook(() => useEmailLogs(20));
        await act(async () => { await result.current.fetchLogs(1, {}); });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0].recipient).toBe("member@example.com");
        expect(result.current.pagination?.totalPages).toBe(3);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("sets error state on fetch failure", async () => {
        mockGet.mockRejectedValue({ message: "Network error" });

        const { result } = renderHook(() => useEmailLogs());
        await act(async () => { await result.current.fetchLogs(1, {}); });

        expect(result.current.logs).toHaveLength(0);
        expect(result.current.error).toBe("Network error");
    });

    it("prefers response data message over generic message", async () => {
        mockGet.mockRejectedValue({ response: { data: { message: "Forbidden" } } });

        const { result } = renderHook(() => useEmailLogs());
        await act(async () => { await result.current.fetchLogs(1, {}); });

        expect(result.current.error).toBe("Forbidden");
    });

    it("applyFilters fetches from page 1 with new filters", async () => {
        mockGet.mockResolvedValue(paginatedResponse([makeLog({ status: "failed" })]));

        const { result } = renderHook(() => useEmailLogs());
        const filters: EmailLogFilters = { status: "failed" };
        await act(async () => { result.current.applyFilters(filters); });

        await waitFor(() => expect(result.current.logs).toHaveLength(1));
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).toContain("status=failed");
        expect(url).toContain("page=1");
    });

    it("applyFilters with empty object sends no filter params", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useEmailLogs());
        await act(async () => { result.current.applyFilters({}); });

        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).not.toContain("status=");
        expect(url).not.toContain("recipient=");
    });

    it("builds URL with all filter params", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useEmailLogs());
        const filters: EmailLogFilters = {
            recipient: "jane@example.com",
            status: "sent",
            dateFrom: "2026-01-01",
            dateTo: "2026-01-31",
        };
        await act(async () => { result.current.applyFilters(filters); });

        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).toContain("recipient=jane%40example.com");
        expect(url).toContain("status=sent");
        expect(url).toContain("dateFrom=2026-01-01");
        expect(url).toContain("dateTo=2026-01-31");
    });

    it("goToPage passes correct page number and preserves active filters", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useEmailLogs());
        await act(async () => { result.current.applyFilters({ status: "failed" }); });
        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

        mockGet.mockResolvedValue(paginatedResponse([], 2, 3));
        await act(async () => { result.current.goToPage(2); });
        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

        const url = mockGet.mock.calls[1][0] as string;
        expect(url).toContain("page=2");
        expect(url).toContain("status=failed");
    });

    it("handles missing outer.data gracefully", async () => {
        mockGet.mockResolvedValue({ data: {} });

        const { result } = renderHook(() => useEmailLogs());
        await act(async () => { await result.current.fetchLogs(1, {}); });

        expect(result.current.logs).toHaveLength(0);
        expect(result.current.pagination?.totalPages).toBe(1);
        expect(result.current.error).toBeNull();
    });

    it("exposes failed log with errorMessage", async () => {
        const log = makeLog({ status: "failed", errorMessage: "ECONNREFUSED", attemptsMade: 3 });
        mockGet.mockResolvedValue(paginatedResponse([log]));

        const { result } = renderHook(() => useEmailLogs());
        await act(async () => { await result.current.fetchLogs(1, {}); });

        const fetched = result.current.logs[0];
        expect(fetched.status).toBe("failed");
        expect(fetched.errorMessage).toBe("ECONNREFUSED");
        expect(fetched.attemptsMade).toBe(3);
    });
});
