import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useBankImportProfiles } from "../use-bank-import-profiles";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const profile = {
    id: "p1", name: "GTBank NGN", isDefault: true,
    delimiter: ",", skipHeaderRows: 1,
    dateColumnIndex: 0, dateFormat: "DD/MM/YYYY", dateColumnName: "Date",
    narrationColumnIndex: 1, narrationColumnName: "Narration",
    amountConvention: "SIGNED" as const, amountColumnIndex: 2, amountColumnName: "Amount",
    typeColumnIndex: null, typeColumnName: null,
    debitIndicator: null, creditIndicator: null,
    debitColumnIndex: null, debitColumnName: null,
    creditColumnIndex: null, creditColumnName: null,
    createdAt: "", updatedAt: "",
};

beforeEach(() => jest.clearAllMocks());

describe("useBankImportProfiles", () => {
    it("fetches profiles on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [profile] } });
        const { result } = renderHook(() => useBankImportProfiles());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/bank-import-profiles");
        expect(result.current.profiles).toEqual([profile]);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Forbidden" });
        const { result } = renderHook(() => useBankImportProfiles());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Forbidden");
    });

    it("creates a profile and prepends to list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [profile] } });
        const created = { ...profile, id: "p2", name: "Access Bank" };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => useBankImportProfiles());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createProfile({
                name: "Access Bank", delimiter: ",", skipHeaderRows: 1,
                dateColumnIndex: 0, dateFormat: "DD/MM/YYYY",
                narrationColumnIndex: 1, amountConvention: "SIGNED", amountColumnIndex: 2,
            });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/bank-import-profiles", expect.objectContaining({ name: "Access Bank" }));
        expect(result.current.profiles[0].id).toBe("p2");
    });

    it("updates a profile in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [profile] } });
        const updated = { ...profile, name: "GTBank USD" };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useBankImportProfiles());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updateProfile("p1", { name: "GTBank USD" }); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/bank-import-profiles/p1", { name: "GTBank USD" });
        expect(result.current.profiles[0].name).toBe("GTBank USD");
    });
});
