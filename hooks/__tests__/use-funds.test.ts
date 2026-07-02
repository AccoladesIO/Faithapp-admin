import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useFunds } from "../use-funds";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const fund = { id: "f1", name: "General Fund", type: "UNRESTRICTED" as const, description: null, isActive: true, createdAt: "", updatedAt: "" };

beforeEach(() => jest.clearAllMocks());

describe("useFunds", () => {
    it("fetches funds on mount and sets state", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [fund] } });
        const { result } = renderHook(() => useFunds());

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGet).toHaveBeenCalledWith("/admin/finance/funds");
        expect(result.current.funds).toEqual([fund]);
        expect(result.current.error).toBeNull();
    });

    it("sets error when fetch fails", async () => {
        mockGet.mockRejectedValueOnce({ message: "Network error" });
        const { result } = renderHook(() => useFunds());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Network error");
        expect(result.current.funds).toEqual([]);
    });

    it("creates a fund and prepends it to the list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [fund] } });
        const newFund = { ...fund, id: "f2", name: "Building Fund", type: "RESTRICTED" as const };
        mockPost.mockResolvedValueOnce({ data: { data: newFund } });

        const { result } = renderHook(() => useFunds());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createFund({ name: "Building Fund", type: "RESTRICTED" });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/funds", { name: "Building Fund", type: "RESTRICTED" });
        expect(result.current.funds[0]).toEqual(newFund);
    });

    it("updates a fund in the list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [fund] } });
        const updated = { ...fund, name: "Renamed Fund" };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useFunds());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.updateFund("f1", { name: "Renamed Fund" });
        });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/funds/f1", { name: "Renamed Fund" });
        expect(result.current.funds[0].name).toBe("Renamed Fund");
    });
});
