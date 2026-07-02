import { renderHook, waitFor, act } from "@testing-library/react";
import {
    useIncidentReports,
    IncidentReport,
    IncidentReportFilters,
} from "../use-incident-reports";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), patch: jest.fn() },
}));

import { api } from "@/utils/auth/axios-client";
const mockGet = api.get as jest.Mock;
const mockPatch = api.patch as jest.Mock;

function makeReport(overrides: Partial<IncidentReport> = {}): IncidentReport {
    return {
        id: "rep-1",
        title: "Broken window",
        description: "Window in hall B is broken",
        images: null,
        location: "Hall B",
        status: "OPEN",
        isAnonymous: false,
        adminNotes: null,
        resolvedAt: null,
        reporter: { id: "m-1", firstname: "Jane", lastname: "Doe", email: "jane@example.com" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

function paginatedResponse(reports: IncidentReport[], page = 1, totalPages = 1) {
    return {
        data: {
            data: {
                data: reports,
                page,
                limit: 20,
                totalCount: reports.length,
                totalPages,
            },
        },
    };
}

beforeEach(() => jest.clearAllMocks());

describe("useIncidentReports", () => {
    it("does not fetch on mount (requires explicit fetchReports call)", () => {
        mockGet.mockResolvedValue(paginatedResponse([]));
        renderHook(() => useIncidentReports());
        expect(mockGet).not.toHaveBeenCalled();
    });

    it("fetches reports and populates state", async () => {
        const report = makeReport();
        mockGet.mockResolvedValue(paginatedResponse([report], 1, 3));

        const { result } = renderHook(() => useIncidentReports(20));
        await act(async () => { await result.current.fetchReports(1, {}); });

        expect(result.current.reports).toHaveLength(1);
        expect(result.current.reports[0].title).toBe("Broken window");
        expect(result.current.pagination?.totalPages).toBe(3);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("sets error state on fetch failure", async () => {
        mockGet.mockRejectedValue({ message: "Network error" });

        const { result } = renderHook(() => useIncidentReports());
        await act(async () => { await result.current.fetchReports(1, {}); });

        expect(result.current.reports).toHaveLength(0);
        expect(result.current.error).toBe("Network error");
    });

    it("prefers response data message over generic message", async () => {
        mockGet.mockRejectedValue({ response: { data: { message: "Forbidden" } } });

        const { result } = renderHook(() => useIncidentReports());
        await act(async () => { await result.current.fetchReports(1, {}); });

        expect(result.current.error).toBe("Forbidden");
    });

    it("applyFilters fetches from page 1 with new filters", async () => {
        mockGet.mockResolvedValue(paginatedResponse([makeReport({ status: "RESOLVED" })]));

        const { result } = renderHook(() => useIncidentReports());
        const filters: IncidentReportFilters = { status: "RESOLVED" };
        await act(async () => { result.current.applyFilters(filters); });

        await waitFor(() => expect(result.current.reports).toHaveLength(1));
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).toContain("status=RESOLVED");
        expect(url).toContain("page=1");
    });

    it("applyFilters with empty object sends no filter params", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useIncidentReports());
        await act(async () => { result.current.applyFilters({}); });

        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).not.toContain("status=");
        expect(url).not.toContain("dateFrom=");
        expect(url).not.toContain("dateTo=");
    });

    it("builds URL with all filter params including date range", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useIncidentReports());
        const filters: IncidentReportFilters = {
            status: "OPEN",
            dateFrom: "2026-01-01",
            dateTo: "2026-01-31",
        };
        await act(async () => { result.current.applyFilters(filters); });

        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        const url = mockGet.mock.calls[0][0] as string;
        expect(url).toContain("status=OPEN");
        expect(url).toContain("dateFrom=2026-01-01");
        expect(url).toContain("dateTo=2026-01-31");
    });

    it("goToPage passes correct page number and preserves active filters", async () => {
        mockGet.mockResolvedValue(paginatedResponse([]));

        const { result } = renderHook(() => useIncidentReports());
        await act(async () => { result.current.applyFilters({ status: "OPEN" }); });
        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

        mockGet.mockResolvedValue(paginatedResponse([], 2, 3));
        await act(async () => { result.current.goToPage(2); });
        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

        const url = mockGet.mock.calls[1][0] as string;
        expect(url).toContain("page=2");
        expect(url).toContain("status=OPEN");
    });

    it("handles missing outer.data gracefully", async () => {
        mockGet.mockResolvedValue({ data: {} });

        const { result } = renderHook(() => useIncidentReports());
        await act(async () => { await result.current.fetchReports(1, {}); });

        expect(result.current.reports).toHaveLength(0);
        expect(result.current.pagination?.totalPages).toBe(1);
        expect(result.current.error).toBeNull();
    });

    describe("updateStatus", () => {
        it("patches the endpoint and updates the report in state", async () => {
            const original = makeReport();
            mockGet.mockResolvedValue(paginatedResponse([original]));

            const { result } = renderHook(() => useIncidentReports());
            await act(async () => { await result.current.fetchReports(1, {}); });

            const updated = makeReport({ status: "IN_PROGRESS", adminNotes: "Under review" });
            mockPatch.mockResolvedValue({ data: { data: updated } });

            let success: boolean;
            await act(async () => {
                success = await result.current.updateStatus("rep-1", { status: "IN_PROGRESS", adminNotes: "Under review" });
            });

            expect(success!).toBe(true);
            expect(mockPatch).toHaveBeenCalledWith(
                "/admin/incidents/rep-1/status",
                { status: "IN_PROGRESS", adminNotes: "Under review" },
            );
            expect(result.current.reports[0].status).toBe("IN_PROGRESS");
            expect(result.current.reports[0].adminNotes).toBe("Under review");
        });

        it("sets error and returns false on patch failure", async () => {
            const original = makeReport();
            mockGet.mockResolvedValue(paginatedResponse([original]));

            const { result } = renderHook(() => useIncidentReports());
            await act(async () => { await result.current.fetchReports(1, {}); });

            mockPatch.mockRejectedValue({ response: { data: { message: "Forbidden" } } });

            let success: boolean;
            await act(async () => {
                success = await result.current.updateStatus("rep-1", { status: "RESOLVED" });
            });

            expect(success!).toBe(false);
            expect(result.current.error).toBe("Forbidden");
            expect(result.current.reports[0].status).toBe("OPEN");
        });

        it("falls back to res.data when res.data.data is absent", async () => {
            const original = makeReport();
            mockGet.mockResolvedValue(paginatedResponse([original]));

            const { result } = renderHook(() => useIncidentReports());
            await act(async () => { await result.current.fetchReports(1, {}); });

            const updated = makeReport({ status: "RESOLVED" });
            mockPatch.mockResolvedValue({ data: updated });

            await act(async () => {
                await result.current.updateStatus("rep-1", { status: "RESOLVED" });
            });

            expect(result.current.reports[0].status).toBe("RESOLVED");
        });

        it("exposes isUpdating during patch", async () => {
            mockGet.mockResolvedValue(paginatedResponse([makeReport()]));
            const { result } = renderHook(() => useIncidentReports());
            await act(async () => { await result.current.fetchReports(1, {}); });

            let resolveRef!: (v: any) => void;
            mockPatch.mockReturnValue(new Promise((res) => { resolveRef = res; }));

            act(() => { result.current.updateStatus("rep-1", { status: "IN_PROGRESS" }); });
            expect(result.current.isUpdating).toBe(true);

            await act(async () => {
                resolveRef({ data: { data: makeReport({ status: "IN_PROGRESS" }) } });
            });
            expect(result.current.isUpdating).toBe(false);
        });
    });
});
