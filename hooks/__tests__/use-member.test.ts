import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useMembers, useCreateMember } from "../use-member";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;
const mockDelete = api.delete as jest.MockedFunction<typeof api.delete>;

const member = {
    id: "m1", firstname: "Ada", lastname: "Lovelace",
    email: "ada@church.test", phoneNumber: null,
    changedPassword: true, photoUrl: null,
    role: "MEMBER" as const, status: "ACTIVE" as const,
    gender: null, birthDay: null, birthMonth: null, birthYear: null,
    maritalStatus: null, yearBornAgain: null, yearBaptized: null,
    baptizedWithHolyGhost: false, dateJoinedChurch: null,
    workerProfile: null, pastorType: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const paged = {
    data: { data: { data: [member], page: 1, limit: 10, totalCount: 1, totalPages: 1 } },
};

async function renderLoaded() {
    mockGet.mockResolvedValueOnce(paged);
    const view = renderHook(() => useMembers());
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    return view;
}

beforeEach(() => jest.clearAllMocks());

describe("useMembers", () => {
    it("fetches members on mount", async () => {
        const { result } = await renderLoaded();

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/members?page=1&limit=10"));
        expect(result.current.members).toEqual([member]);
        expect(result.current.pagination).toEqual({ page: 1, limit: 10, totalCount: 1, totalPages: 1 });
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Network error" });
        const { result } = renderHook(() => useMembers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Network error");
    });

    it("promoteToWorker posts and merges the updated member into the list", async () => {
        const { result } = await renderLoaded();
        const updated = { ...member, role: "WORKER" as const };
        mockPost.mockResolvedValueOnce({ data: { data: updated } });

        await act(async () => {
            await result.current.promoteToWorker("m1", {
                departmentId: "d1", profession: "Engineer", yearJoinedWorkforce: "2020",
            });
        });

        expect(mockPost).toHaveBeenCalledWith("/members/m1/promote", {
            departmentId: "d1", profession: "Engineer", yearJoinedWorkforce: "2020",
        });
        expect(result.current.members[0].role).toBe("WORKER");
    });

    it("changeStatus patches the member's status", async () => {
        const { result } = await renderLoaded();
        mockPatch.mockResolvedValueOnce({ data: { data: { ...member, status: "INACTIVE" } } });

        await act(async () => { await result.current.changeStatus("m1", "INACTIVE"); });

        expect(mockPatch).toHaveBeenCalledWith("/members/m1/status", { status: "INACTIVE" });
        expect(result.current.members[0].status).toBe("INACTIVE");
    });

    it("resetPassword posts with no body and does not mutate the member list", async () => {
        const { result } = await renderLoaded();
        mockPost.mockResolvedValueOnce({ data: {} });

        await act(async () => { await result.current.resetPassword("m1"); });

        expect(mockPost).toHaveBeenCalledWith("/members/m1/reset-password");
        expect(result.current.members).toEqual([member]);
    });

    it("assignPastor posts the pastor type and merges the result", async () => {
        const { result } = await renderLoaded();
        mockPost.mockResolvedValueOnce({ data: { data: { ...member, pastorType: "ASSOCIATE" } } });

        await act(async () => { await result.current.assignPastor("m1", "ASSOCIATE"); });

        expect(mockPost).toHaveBeenCalledWith("/members/m1/pastor", { type: "ASSOCIATE" });
        expect(result.current.members[0].pastorType).toBe("ASSOCIATE");
    });

    it("updatePastorType patches the pastor type", async () => {
        const { result } = await renderLoaded();
        mockPatch.mockResolvedValueOnce({ data: { data: { ...member, pastorType: "LEAD" } } });

        await act(async () => { await result.current.updatePastorType("m1", "LEAD"); });

        expect(mockPatch).toHaveBeenCalledWith("/members/m1/pastor", { type: "LEAD" });
        expect(result.current.members[0].pastorType).toBe("LEAD");
    });

    it("removePastor deletes and clears pastorType locally", async () => {
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [{ ...member, pastorType: "LEAD" }], page: 1, limit: 10, totalCount: 1, totalPages: 1 } },
        });
        const { result } = renderHook(() => useMembers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        mockDelete.mockResolvedValueOnce({ data: {} });

        await act(async () => { await result.current.removePastor("m1"); });

        expect(mockDelete).toHaveBeenCalledWith("/members/m1/pastor");
        expect(result.current.members[0].pastorType).toBeNull();
    });

    it("removePhoto deletes and merges the cleared photoUrl into the list", async () => {
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [{ ...member, photoUrl: "https://res.cloudinary.com/x.jpg" }], page: 1, limit: 10, totalCount: 1, totalPages: 1 } },
        });
        const { result } = renderHook(() => useMembers());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        mockDelete.mockResolvedValueOnce({ data: { data: { ...member, photoUrl: null } } });

        let updated;
        await act(async () => { updated = await result.current.removePhoto("m1"); });

        expect(mockDelete).toHaveBeenCalledWith("/members/m1/photo");
        expect(result.current.members[0].photoUrl).toBeNull();
        expect((updated as unknown as typeof member).photoUrl).toBeNull();
    });

    it("removePhoto sets error and throws on failure", async () => {
        const { result } = await renderLoaded();
        mockDelete.mockRejectedValueOnce({ response: { data: { message: "Photo not found" } } });

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.removePhoto("m1"); } catch (e: unknown) { caught = e as Error; }
        });

        expect(caught?.message).toBe("Photo not found");
        expect(result.current.error).toBe("Photo not found");
    });

    it("bulkPromote posts the payload and returns the result summary", async () => {
        const { result } = await renderLoaded();
        const summary = { promoted: 2, skipped: 1, failures: [] };
        mockPost.mockResolvedValueOnce({ data: { data: summary } });

        let response;
        await act(async () => {
            response = await result.current.bulkPromote({ memberIds: ["m1", "m2", "m3"], departmentId: "d1" });
        });

        expect(mockPost).toHaveBeenCalledWith("/members/bulk-promote", { memberIds: ["m1", "m2", "m3"], departmentId: "d1" });
        expect(response).toEqual(summary);
    });
});

describe("useCreateMember", () => {
    it("posts the payload and returns the created member", async () => {
        mockPost.mockResolvedValueOnce({ data: { data: member } });
        const { result } = renderHook(() => useCreateMember());

        let created;
        await act(async () => {
            created = await result.current.createMember({
                firstname: "Ada", lastname: "Lovelace", email: "ada@church.test",
            });
        });

        expect(mockPost).toHaveBeenCalledWith("/members", {
            firstname: "Ada", lastname: "Lovelace", email: "ada@church.test",
        });
        expect(created).toEqual(member);
        expect(result.current.error).toBeNull();
    });

    it("sets error and throws on failure", async () => {
        mockPost.mockRejectedValueOnce({ response: { data: { message: "Email already in use" } } });
        const { result } = renderHook(() => useCreateMember());

        let caught: Error | undefined;
        await act(async () => {
            try {
                await result.current.createMember({ firstname: "Ada", lastname: "Lovelace", email: "ada@church.test" });
            } catch (e: unknown) { caught = e as Error; }
        });

        expect(caught?.message).toBe("Email already in use");
        expect(result.current.error).toBe("Email already in use");
    });
});
