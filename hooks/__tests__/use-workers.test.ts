import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useWorkers } from "../use-workers";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;
const mockDelete = api.delete as jest.MockedFunction<typeof api.delete>;

const worker = {
    id: "m1", firstname: "Ada", lastname: "Lovelace",
    email: "ada@church.test", phoneNumber: null,
    role: "WORKER" as const, status: "ACTIVE",
    workerProfile: { id: "wp1", status: "ACTIVE", profession: null, yearJoinedWorkforce: null, completedSOD: false, completedBibleCollege: false, department: null },
};

const paged = {
    data: { data: { data: [worker], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
};

beforeEach(() => jest.clearAllMocks());

describe("useWorkers", () => {
    it("fetches workers on mount", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const { result } = renderHook(() => useWorkers());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/members/workers"));
        expect(result.current.workers).toEqual([worker]);
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Network error" });
        const { result } = renderHook(() => useWorkers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Network error");
    });

    it("updateWorkerProfile patches and updates worker in list", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const updated = { ...worker, workerProfile: { ...worker.workerProfile, profession: "Engineer" } };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useWorkers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updateWorkerProfile("m1", { profession: "Engineer" }); });

        expect(mockPatch).toHaveBeenCalledWith("/members/m1/worker-profile", { profession: "Engineer" });
        expect(result.current.workers[0].workerProfile?.profession).toBe("Engineer");
    });

    it("revokeWorker posts and removes worker from list", async () => {
        mockGet.mockResolvedValueOnce(paged);
        mockPost.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useWorkers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.revokeWorker("m1"); });

        expect(mockPost).toHaveBeenCalledWith("/members/m1/revoke-worker");
        expect(result.current.workers).toHaveLength(0);
    });

    it("purgeDevice calls DELETE on the device endpoint", async () => {
        mockGet.mockResolvedValueOnce(paged);
        mockDelete.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useWorkers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.purgeDevice("m1"); });

        expect(mockDelete).toHaveBeenCalledWith("/members/m1/device");
    });

    it("purgeDevice sets error and throws on failure", async () => {
        mockGet.mockResolvedValueOnce(paged);
        mockDelete.mockRejectedValueOnce({ response: { data: { message: "Device not found" } } });

        const { result } = renderHook(() => useWorkers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.purgeDevice("m1"); } catch (e: unknown) { caught = e as Error; }
        });

        expect(caught?.message).toBe("Device not found");
        expect(result.current.error).toBe("Device not found");
    });
});
