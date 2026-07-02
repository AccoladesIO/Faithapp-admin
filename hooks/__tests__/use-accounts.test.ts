import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useAccounts } from "../use-accounts";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const account = {
    id: "a1", name: "Cash", code: "1001", type: "ASSET" as const,
    subtype: "Bank", normalBalance: "DEBIT" as const, currentBalance: 500000,
    fund: null, isActive: true, createdAt: "", updatedAt: "",
};

beforeEach(() => jest.clearAllMocks());

describe("useAccounts", () => {
    it("fetches accounts on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [account] } });
        const { result } = renderHook(() => useAccounts());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/accounts");
        expect(result.current.accounts).toEqual([account]);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Server error" });
        const { result } = renderHook(() => useAccounts());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Server error");
    });

    it("creates an account and prepends to list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [account] } });
        const created = { ...account, id: "a2", name: "Savings", code: "1002" };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => useAccounts());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createAccount({ name: "Savings", code: "1002", type: "ASSET", normalBalance: "DEBIT" });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/accounts", expect.objectContaining({ code: "1002" }));
        expect(result.current.accounts[0].id).toBe("a2");
    });

    it("updates account name in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [account] } });
        const updated = { ...account, name: "Renamed Cash" };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useAccounts());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updateAccount("a1", { name: "Renamed Cash" }); });

        expect(result.current.accounts[0].name).toBe("Renamed Cash");
    });
});
