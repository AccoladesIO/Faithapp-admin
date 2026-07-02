import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useFollowUp, FirstTimerVisit } from "../use-follow-up";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const ft = {
    id: "ft1", firstname: "Grace", lastname: "Hopper",
    phone: "08012345678", email: null, source: "WALK_IN" as const,
    wantsToJoinChurch: true, wantsToJoinWorkforce: false,
    notes: null, convertedAt: null, inviteSentAt: null,
    createdAt: "2026-06-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z",
};

const task = {
    id: "t1", type: "FIRST_TIMER" as const, status: "PENDING" as const,
    outcome: null, dueDate: null, lastActivityAt: "2026-06-01T00:00:00Z",
    firstTimer: ft, workerProfile: null, assignedTo: null,
    createdAt: "2026-06-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z",
};

const pagedFt = { data: { data: { data: [ft], page: 1, limit: 10, totalCount: 1, totalPages: 1 } } };
const pagedTask = { data: { data: { data: [task], page: 1, limit: 10, totalCount: 1, totalPages: 1 } } };
const pagedStale = { data: { data: { data: [task], page: 1, limit: 10, totalCount: 1, totalPages: 1 } } };

beforeEach(() => jest.clearAllMocks());

describe("useFollowUp — fetchStaleTasks", () => {
    it("GETs stale tasks with daysInactive param", async () => {
        mockGet.mockResolvedValueOnce(pagedStale);

        const { result } = renderHook(() => useFollowUp());

        await act(async () => { await result.current.fetchStaleTasks({ daysInactive: 14 }); });

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/follow-up/tasks/stale"));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("daysInactive=14"));
        expect(result.current.staleTasks).toEqual([task]);
    });
});

describe("useFollowUp — getFirstTimerPipeline", () => {
    it("GETs pipeline with optional date range", async () => {
        const pipeline = { total: 100, untouched: 40, contacted: 30, returned: 15, invited: 10, converted: 5 };
        mockGet.mockResolvedValueOnce({ data: { data: pipeline } });

        const { result } = renderHook(() => useFollowUp());

        let res: typeof pipeline | undefined;
        await act(async () => {
            res = await result.current.getFirstTimerPipeline("2026-01-01", "2026-06-30");
        });

        const url = (mockGet.mock.calls[0][0] as string);
        expect(url).toContain("/admin/follow-up/first-timers/pipeline");
        expect(url).toContain("from=2026-01-01");
        expect(url).toContain("to=2026-06-30");
        expect(res?.converted).toBe(5);
    });

    it("GETs pipeline without date range", async () => {
        const pipeline = { total: 50, untouched: 20, contacted: 15, returned: 8, invited: 5, converted: 2 };
        mockGet.mockResolvedValueOnce({ data: { data: pipeline } });

        const { result } = renderHook(() => useFollowUp());

        await act(async () => { await result.current.getFirstTimerPipeline(); });

        expect(mockGet).toHaveBeenCalledWith("/admin/follow-up/first-timers/pipeline");
    });
});

describe("useFollowUp — logReturnVisit", () => {
    it("POSTs a visit and returns the record", async () => {
        const visit = { id: "v1", visitedAt: "2026-06-25T10:00:00Z", notes: "Came back", createdAt: "" };
        mockGet.mockResolvedValueOnce(pagedFt);
        mockPost.mockResolvedValueOnce({ data: { data: visit } });

        const { result } = renderHook(() => useFollowUp());
        await act(async () => { await result.current.fetchFirstTimers(); });

        let returned: FirstTimerVisit | undefined;
        await act(async () => {
            returned = await result.current.logReturnVisit("ft1", { notes: "Came back", visitedAt: "2026-06-25" });
        });

        expect(mockPost).toHaveBeenCalledWith(
            "/admin/follow-up/first-timers/ft1/visits",
            { notes: "Came back", visitedAt: "2026-06-25" }
        );
        expect(returned?.id).toBe("v1");
    });

    it("sets error and throws on failure", async () => {
        mockPost.mockRejectedValueOnce({ response: { data: { message: "First timer not found" } } });

        const { result } = renderHook(() => useFollowUp());

        await expect(
            act(async () => { await result.current.logReturnVisit("bad-id", {}); })
        ).rejects.toThrow("First timer not found");
    });
});

describe("useFollowUp — markConverted", () => {
    it("PATCHes the mark-converted endpoint and optimistically updates state", async () => {
        mockGet.mockResolvedValueOnce(pagedFt);
        mockPatch.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useFollowUp());
        await act(async () => { await result.current.fetchFirstTimers(); });

        expect(result.current.firstTimers[0].convertedAt).toBeNull();

        await act(async () => { await result.current.markConverted("ft1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/follow-up/first-timers/ft1/mark-converted", {});
        expect(result.current.firstTimers[0].convertedAt).not.toBeNull();
    });
});

describe("useFollowUp — reassignTask", () => {
    it("PATCHes the reassign endpoint with workerProfileId", async () => {
        mockPatch.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useFollowUp());

        await act(async () => { await result.current.reassignTask("t1", "wp-uuid-2"); });

        expect(mockPatch).toHaveBeenCalledWith(
            "/admin/follow-up/tasks/t1/reassign",
            { workerProfileId: "wp-uuid-2" }
        );
    });

    it("sets error and throws on failure", async () => {
        mockPatch.mockRejectedValueOnce({ response: { data: { message: "Worker not in follow-up dept" } } });

        const { result } = renderHook(() => useFollowUp());

        await expect(
            act(async () => { await result.current.reassignTask("t1", "bad-wp"); })
        ).rejects.toThrow("Worker not in follow-up dept");
    });
});

describe("useFollowUp — adminUpdateTask", () => {
    it("PATCHes the task and updates it in the list", async () => {
        mockGet.mockResolvedValueOnce(pagedTask);
        const updated = { ...task, status: "COMPLETED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useFollowUp());
        await act(async () => { await result.current.fetchTasks(); });

        await act(async () => { await result.current.adminUpdateTask("t1", { status: "COMPLETED" }); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/follow-up/tasks/t1", { status: "COMPLETED" });
        expect(result.current.tasks[0].status).toBe("COMPLETED");
    });
});
