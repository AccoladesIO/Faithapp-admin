import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useAttendanceAdmin } from "../use-attendance";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const atRiskMember = {
    id: "m1", firstname: "John", lastname: "Doe",
    email: "john@church.test", phoneNumber: null,
    absenceCount: 5, lastSeenAt: null, hasOpenFollowUpTask: false,
};

const pagedAtRisk = {
    data: { data: { data: [atRiskMember], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
};

const slotSummary = { PRESENT: 40, LATE: 5, ABSENT: 10, ON_LEAVE: 2, ATTENDED_ONLINE: 8 };

beforeEach(() => jest.clearAllMocks());

describe("useAttendanceAdmin — getAtRiskMembers", () => {
    it("fetches at-risk members with correct query params", async () => {
        mockGet.mockResolvedValueOnce(pagedAtRisk);

        const { result } = renderHook(() => useAttendanceAdmin());

        await act(async () => {
            await result.current.getAtRiskMembers({ minAbsences: 4, page: 1, limit: 20 });
        });

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/attendances/at-risk"));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("minAbsences=4"));
        expect(result.current.atRiskMembers).toEqual([atRiskMember]);
        expect(result.current.atRiskPagination?.totalCount).toBe(1);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Unauthorized" });

        const { result } = renderHook(() => useAttendanceAdmin());
        await act(async () => { await result.current.getAtRiskMembers(); });

        expect(result.current.error).toBe("Unauthorized");
    });

    it("accepts optional date range params", async () => {
        mockGet.mockResolvedValueOnce(pagedAtRisk);

        const { result } = renderHook(() => useAttendanceAdmin());
        await act(async () => {
            await result.current.getAtRiskMembers({ from: "2026-01-01", to: "2026-06-30" });
        });

        const url = (mockGet.mock.calls[0][0] as string);
        expect(url).toContain("from=2026-01-01");
        expect(url).toContain("to=2026-06-30");
    });
});

describe("useAttendanceAdmin — getSlotSummary", () => {
    it("fetches slot summary and returns the record", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: slotSummary } });

        const { result } = renderHook(() => useAttendanceAdmin());

        let summary: typeof slotSummary | undefined;
        await act(async () => { summary = await result.current.getSlotSummary("slot-uuid-1"); });

        expect(mockGet).toHaveBeenCalledWith("/attendances/summary/slot/slot-uuid-1");
        expect(summary?.PRESENT).toBe(40);
        expect(summary?.ABSENT).toBe(10);
    });

    it("sets error and throws when slot not found", async () => {
        mockGet.mockRejectedValueOnce({ response: { data: { message: "Slot not found" } } });

        const { result } = renderHook(() => useAttendanceAdmin());

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.getSlotSummary("bad-slot"); } catch (e: unknown) { caught = e as Error; }
        });

        expect(caught?.message).toBe("Slot not found");
        expect(result.current.error).toBe("Slot not found");
    });
});

describe("useAttendanceAdmin — correctAttendance", () => {
    it("PATCHes the correct endpoint with status body", async () => {
        mockPatch.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useAttendanceAdmin());

        await act(async () => { await result.current.correctAttendance("att-uuid-1", "PRESENT"); });

        expect(mockPatch).toHaveBeenCalledWith("/attendances/att-uuid-1/correct", { status: "PRESENT" });
    });

    it("sets error and throws on correction failure", async () => {
        mockPatch.mockRejectedValueOnce({ response: { data: { message: "Record not found" } } });

        const { result } = renderHook(() => useAttendanceAdmin());

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.correctAttendance("bad-id", "LATE"); } catch (e: unknown) { caught = e as Error; }
        });

        expect(caught?.message).toBe("Record not found");
        expect(result.current.error).toBe("Record not found");
    });
});
