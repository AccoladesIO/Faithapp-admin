import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useChildrenChurch } from "../use-children-church";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

const ageGroup = { id: "ag1", name: "Nursery", minAge: 0, maxAge: 2, createdAt: "", updatedAt: "" };
const classGroup = { id: "cg1", name: "Nursery A", ageGroup, teacherCount: 1, createdAt: "", updatedAt: "" };

beforeEach(() => jest.clearAllMocks());

describe("useChildrenChurch — recomputeAgeGroups", () => {
    it("calls POST on the recompute endpoint and returns updated count", async () => {
        mockGet.mockResolvedValue({ data: { data: [] } });
        mockPost.mockResolvedValueOnce({ data: { data: { updated: 12 } } });

        const { result } = renderHook(() => useChildrenChurch());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let returned: { updated: number } | undefined;
        await act(async () => { returned = await result.current.recomputeAgeGroups(); });

        expect(mockPost).toHaveBeenCalledWith("/children-church/age-groups/recompute");
        expect(returned).toEqual({ updated: 12 });
    });

    it("sets error and throws when recompute fails", async () => {
        mockGet.mockResolvedValue({ data: { data: [] } });
        mockPost.mockRejectedValueOnce({ response: { data: { message: "Config not set" } } });

        const { result } = renderHook(() => useChildrenChurch());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.recomputeAgeGroups(); } catch (e: any) { caught = e; }
        });

        expect(caught?.message).toBe("Config not set");
        expect(result.current.error).toBe("Config not set");
    });
});

describe("useChildrenChurch — age groups", () => {
    it("fetchAgeGroups populates ageGroups list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [ageGroup] } })
               .mockResolvedValue({ data: { data: [] } });

        const { result } = renderHook(() => useChildrenChurch());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.fetchAgeGroups(); });

        expect(mockGet).toHaveBeenCalledWith("/children-church/age-groups");
        expect(result.current.ageGroups[0].id).toBe("ag1");
    });

    it("createAgeGroup posts and appends to list", async () => {
        mockGet.mockResolvedValue({ data: { data: [] } });
        mockPost.mockResolvedValueOnce({ data: { data: ageGroup } });

        const { result } = renderHook(() => useChildrenChurch());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.fetchAgeGroups(); });
        await act(async () => { await result.current.createAgeGroup({ name: "Nursery", minAgeMonths: 0, maxAgeMonths: 24 }); });

        expect(mockPost).toHaveBeenCalledWith("/children-church/age-groups", expect.objectContaining({ name: "Nursery" }));
        expect(result.current.ageGroups).toHaveLength(1);
    });
});
