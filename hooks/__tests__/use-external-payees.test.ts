import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useExternalPayees } from "../use-external-payees";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const payee = {
    id: "py1", name: "NEPA Utility", type: "UTILITY" as const,
    accountNumber: "0123456789", bankName: "GTBank",
    contactEmail: null, contactPhone: null, notes: null,
    isActive: true, createdAt: "", updatedAt: "",
};

beforeEach(() => jest.clearAllMocks());

describe("useExternalPayees", () => {
    it("fetches payees on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [payee] } });
        const { result } = renderHook(() => useExternalPayees());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/external-payees");
        expect(result.current.payees).toEqual([payee]);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Not authorized" });
        const { result } = renderHook(() => useExternalPayees());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Not authorized");
    });

    it("creates a payee and prepends to list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [payee] } });
        const created = { ...payee, id: "py2", name: "Vendor XYZ" };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => useExternalPayees());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createPayee({ name: "Vendor XYZ", type: "VENDOR" });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/external-payees", { name: "Vendor XYZ", type: "VENDOR" });
        expect(result.current.payees[0].id).toBe("py2");
    });

    it("updates a payee in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [payee] } });
        const updated = { ...payee, name: "EKEDC Utility" };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useExternalPayees());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updatePayee("py1", { name: "EKEDC Utility" }); });

        expect(result.current.payees[0].name).toBe("EKEDC Utility");
    });
});
