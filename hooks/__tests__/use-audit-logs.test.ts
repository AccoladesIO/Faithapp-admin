import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuditLogs, AuditLog, AuditLogFilters } from "../use-audit-logs";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn() },
}));

import { api } from "@/utils/auth/axios-client";
const mockGet = api.get as jest.Mock;

function makeLog(overrides: Partial<AuditLog> = {}): AuditLog {
    return {
        id: "log-1",
        action: "MEMBER_LOGIN",
        actor: { id: "actor-1", firstname: "Jane", lastname: "Doe" },
        targetId: null,
        targetEmail: null,
        targetName: null,
        metadata: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

function paginatedResponse(logs: AuditLog[], page = 1, totalPages = 1) {
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

describe("useAuditLogs", () => {
    it("does not fetch on mount (requires explicit fetchLogs call)", () => {
        mockGet.mockResolvedValue(paginatedResponse([]));
        renderHook(() => useAuditLogs());
        expect(mockGet).not.toHaveBeenCalled();
    });

    it("fetches logs and sets state on fetchLogs call", async () => {
        const log = makeLog();
        mockGet.mockResolvedValue(paginatedResponse([log], 1, 2));

        const { result } = renderHook(() => useAuditLogs(20));
        await act(async () => {
            await result.current.fetchLogs(1, {});
        });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0].id).toBe("log-1");
        expect(result.current.pagination?.totalPages).toBe(2);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValue({ message: "Network error" });

        const { result } = renderHook(() => useAuditLogs());
        await act(async () => {
            await result.current.fetchLogs(1, {});
        });

        expect(result.current.logs).toHaveLength(0);
        expect(result.current.error).toBe("Network error");
    });

    it("uses response data message when available", async () => {
        mockGet.mockRejectedValue({ response: { data: { message: "Forbidden" } } });

        const { result } = renderHook(() => useAuditLogs());
        await act(async () => {
            await result.current.fetchLogs(1, {});
        });

        expect(result.current.error).toBe("Forbidden");
    });

    it("applyFilters calls fetchLogs from page 1 with new filters", async () => {
        const log = makeLog({ action: "ADMIN_LOGIN" });
        mockGet.mockResolvedValue(paginatedResponse([log]));

        const { result } = renderHook(() => useAuditLogs());
        const filters: AuditLogFilters = { action: "ADMIN_LOGIN" };
        await act(async () => {
            result.current.applyFilters(filters);
        });

        await waitFor(() => expect(result.current.logs).toHaveLength(1));
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).toContain("action=ADMIN_LOGIN");
        expect(url).toContain("page=1");
    });

    it("applyFilters with empty object sends no filter params", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useAuditLogs());
        await act(async () => {
            result.current.applyFilters({});
        });

        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).not.toContain("action=");
        expect(url).not.toContain("actorId=");
    });

    it("goToPage passes page number and preserves active filters", async () => {
        const log = makeLog();
        mockGet.mockResolvedValue(paginatedResponse([log], 2, 3));

        const { result } = renderHook(() => useAuditLogs());

        // First apply a filter so filters state is set
        await act(async () => {
            result.current.applyFilters({ action: "MEMBER_LOGIN" });
        });
        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

        mockGet.mockResolvedValue(paginatedResponse([log], 2, 3));
        await act(async () => {
            result.current.goToPage(2);
        });
        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

        const url = mockGet.mock.calls[1][0] as string;
        expect(url).toContain("page=2");
        expect(url).toContain("action=MEMBER_LOGIN");
    });

    it("builds URL with all supported filter params", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useAuditLogs());
        const filters: AuditLogFilters = {
            action: "WORKER_PROMOTED",
            actorId: "actor-uuid",
            targetEmail: "jane@example.com",
            dateFrom: "2026-01-01",
            dateTo: "2026-01-31",
        };
        await act(async () => {
            result.current.applyFilters(filters);
        });

        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).toContain("action=WORKER_PROMOTED");
        expect(url).toContain("actorId=actor-uuid");
        expect(url).toContain("targetEmail=jane%40example.com");
        expect(url).toContain("dateFrom=2026-01-01");
        expect(url).toContain("dateTo=2026-01-31");
    });

    it("clears logs and error before each fetch (sets isLoading)", async () => {
        mockGet.mockResolvedValue(paginatedResponse([makeLog()]));

        const { result } = renderHook(() => useAuditLogs());
        await act(async () => {
            result.current.fetchLogs(1, {});
        });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBeNull();
    });

    it("handles missing outer.data gracefully (empty list + sensible defaults)", async () => {
        mockGet.mockResolvedValue({ data: {} });

        const { result } = renderHook(() => useAuditLogs());
        await act(async () => {
            await result.current.fetchLogs(1, {});
        });

        expect(result.current.logs).toHaveLength(0);
        expect(result.current.pagination?.totalPages).toBe(1);
        expect(result.current.error).toBeNull();
    });
});
