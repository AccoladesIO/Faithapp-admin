import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
    useTitheAccounts,
    useTitheBatches,
    useTitheUnmatched,
    useTitheDisputes,
    useTitheProofs,
    useTitheRecords,
    downloadTitheTemplate,
    downloadTitheRecords,
} from "../use-tithes";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

// ── fixtures ─────────────────────────────────────────────────────────────────

const account = {
    id: "acc1", bankName: "GTBank", accountNumber: "0123456789",
    accountName: "Church Tithe Account", currency: "NGN" as const,
    description: null, isActive: true, createdAt: "", updatedAt: "",
};

const summary = {
    account,
    fromMonth: null, toMonth: null,
    bulkTotal: 500000, bulkCount: 10,
    proofTotal: 50000, proofCount: 3,
};

const member = { id: "m1", firstname: "John", lastname: "Doe", email: "john@example.com" };

const batch = {
    id: "b1",
    uploadedBy: { id: "a1", member },
    titheAccount: account,
    fileName: "tithes.xlsx",
    status: "COMPLETED" as const,
    totalRows: 20, matchedRows: 18, unmatchedRows: 1, disputedRows: 1,
    errorMessage: null, processedAt: "2026-01-01T00:00:00Z",
    createdAt: "", updatedAt: "",
};

const unmatchedRecord = {
    id: "u1", batch: { id: "b1" }, rawEmail: "nobody@example.com",
    amount: 5000, paymentDate: "2026-01-01", reference: null, bankName: "GTBank",
    status: "PENDING" as const, matchedMember: null, resolvedAt: null,
    createdAt: "", updatedAt: "",
};

const dispute = {
    id: "d1", batch: { id: "b1" }, member,
    amount: 5000, paymentDate: "2026-01-01", reference: null, bankName: null,
    status: "PENDING" as const, reviewedAt: null, createdAt: "", updatedAt: "",
};

const proof = {
    id: "p1", member, titheAccount: account,
    amount: 10000, paymentDate: "2026-01-01", reference: "REF123",
    proofUrl: "https://example.com/proof.jpg", status: "PENDING" as const,
    financeNote: null, reviewedAt: null,
    expiresAt: "2026-04-01T00:00:00Z", createdAt: "", updatedAt: "",
};

const record = {
    id: "r1", member, batch: { id: "b1" },
    amount: 10000, paymentDate: "2026-01-01",
    reference: null, bankName: "GTBank",
    source: "MANUAL_PROOF" as const, createdAt: "", updatedAt: "",
};

const paged = (items: unknown[]) => ({
    data: { data: { data: items, page: 1, limit: 20, totalCount: items.length, totalPages: 1 } },
});

beforeEach(() => jest.clearAllMocks());

// ── useTitheAccounts ──────────────────────────────────────────────────────────

describe("useTitheAccounts", () => {
    it("fetches accounts on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [account] } });
        const { result } = renderHook(() => useTitheAccounts());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/tithes/accounts");
        expect(result.current.accounts).toEqual([account]);
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ response: { data: { message: "Forbidden" } } });
        const { result } = renderHook(() => useTitheAccounts());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Forbidden");
        expect(result.current.accounts).toEqual([]);
    });

    it("creates account and refetches list", async () => {
        mockGet.mockResolvedValue({ data: { data: [account] } });
        mockPost.mockResolvedValueOnce({ data: { data: account } });

        const { result } = renderHook(() => useTitheAccounts());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createAccount({
                bankName: "GTBank", accountNumber: "0123456789",
                accountName: "Church Tithe Account", currency: "NGN",
            });
        });

        expect(mockPost).toHaveBeenCalledWith(
            "/admin/tithes/accounts",
            expect.objectContaining({ bankName: "GTBank", currency: "NGN" })
        );
    });

    it("throws and sets error when create fails", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } });
        mockPost.mockRejectedValueOnce({ response: { data: { message: "Conflict" } } });

        const { result } = renderHook(() => useTitheAccounts());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await expect(
                result.current.createAccount({
                    bankName: "GTBank", accountNumber: "0123456789",
                    accountName: "Church Tithe Account", currency: "NGN",
                })
            ).rejects.toThrow("Conflict");
        });

        expect(result.current.error).toBe("Conflict");
    });

    it("updates account in-place", async () => {
        const updated = { ...account, bankName: "Zenith" };
        mockGet.mockResolvedValueOnce({ data: { data: [account] } });
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useTitheAccounts());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.updateAccount("acc1", { bankName: "Zenith" });
        });

        expect(mockPatch).toHaveBeenCalledWith("/admin/tithes/accounts/acc1", { bankName: "Zenith" });
        expect(result.current.accounts[0].bankName).toBe("Zenith");
    });

    it("fetchSummary calls the correct URL and returns summary", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } });
        const { result } = renderHook(() => useTitheAccounts());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        mockGet.mockResolvedValueOnce({ data: { data: summary } });
        let out: { bulkTotal: number } | undefined;
        await act(async () => {
            out = await result.current.fetchSummary("acc1", "2026-01", "2026-06");
        });

        expect(mockGet).toHaveBeenCalledWith(
            expect.stringContaining("/admin/tithes/accounts/acc1/summary")
        );
        expect(out?.bulkTotal).toBe(500000);
    });
});

// ── useTitheBatches ───────────────────────────────────────────────────────────

describe("useTitheBatches", () => {
    it("fetches batches on mount", async () => {
        mockGet.mockResolvedValueOnce(paged([batch]));
        const { result } = renderHook(() => useTitheBatches());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/tithes/batches"));
        expect(result.current.batches).toEqual([batch]);
        expect(result.current.pagination?.totalCount).toBe(1);
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Network error" });
        const { result } = renderHook(() => useTitheBatches());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Network error");
    });

    it("uploads batch via multipart and refetches", async () => {
        mockGet.mockResolvedValue(paged([batch]));
        const uploadResult = { batchId: "b1", totalRows: 20, message: "Upload queued for processing." };
        mockPost.mockResolvedValueOnce({ data: { data: uploadResult } });

        const { result } = renderHook(() => useTitheBatches());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const formData = new FormData();
        await act(async () => {
            await result.current.uploadBatch(formData);
        });

        expect(mockPost).toHaveBeenCalledWith(
            "/admin/tithes/upload",
            formData,
            expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } })
        );
    });

    it("requeues a failed batch", async () => {
        mockGet.mockResolvedValue(paged([batch]));
        mockPost.mockResolvedValueOnce({});

        const { result } = renderHook(() => useTitheBatches());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.requeueBatch("b1");
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/tithes/batches/b1/requeue");
    });

    it("navigates to next page", async () => {
        mockGet.mockResolvedValue(paged([batch]));

        const { result } = renderHook(() => useTitheBatches());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.goToPage(2); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    });

    it("applyStatusFilter sends ?status= and resets to page 1", async () => {
        mockGet.mockResolvedValue(paged([batch]));

        const { result } = renderHook(() => useTitheBatches());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("COMPLETED"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.statusFilter).toBe("COMPLETED");
        const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
        expect(lastCall).toContain("status=COMPLETED");
        expect(lastCall).toContain("page=1");
    });

    it("goToPage preserves statusFilter", async () => {
        mockGet.mockResolvedValue(paged([batch]));

        const { result } = renderHook(() => useTitheBatches());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("FAILED"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.goToPage(2); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
        expect(lastCall).toContain("page=2");
        expect(lastCall).toContain("status=FAILED");
    });
});

// ── useTitheUnmatched ─────────────────────────────────────────────────────────

describe("useTitheUnmatched", () => {
    it("fetches unmatched records on mount", async () => {
        mockGet.mockResolvedValueOnce(paged([unmatchedRecord]));
        const { result } = renderHook(() => useTitheUnmatched());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/tithes/unmatched"));
        expect(result.current.records).toEqual([unmatchedRecord]);
    });

    it("applies status filter and resets to page 1", async () => {
        mockGet.mockResolvedValue(paged([unmatchedRecord]));

        const { result } = renderHook(() => useTitheUnmatched());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("PENDING"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=PENDING"));
        expect(result.current.statusFilter).toBe("PENDING");
    });

    it("matches unmatched record to a member and refetches", async () => {
        mockGet.mockResolvedValue(paged([unmatchedRecord]));
        mockPost.mockResolvedValueOnce({});

        const { result } = renderHook(() => useTitheUnmatched());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.matchUnmatched("u1", "m1");
        });

        expect(mockPost).toHaveBeenCalledWith(
            "/admin/tithes/unmatched/u1/match",
            { memberId: "m1" }
        );
    });

    it("dismisses an unmatched record and refetches", async () => {
        mockGet.mockResolvedValue(paged([unmatchedRecord]));
        mockPost.mockResolvedValueOnce({});

        const { result } = renderHook(() => useTitheUnmatched());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.dismissUnmatched("u1");
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/tithes/unmatched/u1/dismiss");
    });

    it("sets error and re-throws on match failure", async () => {
        mockGet.mockResolvedValueOnce(paged([]));
        mockPost.mockRejectedValueOnce({ response: { data: { message: "Not found" } } });

        const { result } = renderHook(() => useTitheUnmatched());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await expect(result.current.matchUnmatched("u1", "m1")).rejects.toThrow("Not found");
        });

        expect(result.current.error).toBe("Not found");
    });

    it("applySearch sends ?search= param and resets to page 1", async () => {
        mockGet.mockResolvedValue(paged([unmatchedRecord]));

        const { result } = renderHook(() => useTitheUnmatched());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applySearch("nobody@example.com"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.search).toBe("nobody@example.com");
        const lastCall = mockGet.mock.calls.at(-1)![0] as string;
        expect(lastCall).toContain("search=nobody%40example.com");
        expect(lastCall).toContain("page=1");
    });

    it("applySearch preserves current statusFilter", async () => {
        mockGet.mockResolvedValue(paged([unmatchedRecord]));

        const { result } = renderHook(() => useTitheUnmatched());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("MATCHED"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applySearch("ref123"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const lastCall = mockGet.mock.calls.at(-1)![0] as string;
        expect(lastCall).toContain("status=MATCHED");
        expect(lastCall).toContain("search=ref123");
    });
});

// ── useTitheDisputes ──────────────────────────────────────────────────────────

describe("useTitheDisputes", () => {
    it("fetches disputes on mount", async () => {
        mockGet.mockResolvedValueOnce(paged([dispute]));
        const { result } = renderHook(() => useTitheDisputes());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/tithes/disputes"));
        expect(result.current.disputes).toEqual([dispute]);
    });

    it("applies status filter", async () => {
        mockGet.mockResolvedValue(paged([dispute]));

        const { result } = renderHook(() => useTitheDisputes());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("PENDING"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=PENDING"));
    });

    it("approves a dispute and refetches", async () => {
        mockGet.mockResolvedValue(paged([dispute]));
        mockPost.mockResolvedValueOnce({});

        const { result } = renderHook(() => useTitheDisputes());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.approveDispute("d1"); });

        expect(mockPost).toHaveBeenCalledWith("/admin/tithes/disputes/d1/approve");
    });

    it("rejects a dispute and refetches", async () => {
        mockGet.mockResolvedValue(paged([dispute]));
        mockPost.mockResolvedValueOnce({});

        const { result } = renderHook(() => useTitheDisputes());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.rejectDispute("d1"); });

        expect(mockPost).toHaveBeenCalledWith("/admin/tithes/disputes/d1/reject");
    });

    it("applySearch sends ?search= param and resets to page 1", async () => {
        mockGet.mockResolvedValue(paged([dispute]));

        const { result } = renderHook(() => useTitheDisputes());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applySearch("john"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.search).toBe("john");
        const lastCall = mockGet.mock.calls.at(-1)![0] as string;
        expect(lastCall).toContain("search=john");
        expect(lastCall).toContain("page=1");
    });

    it("applySearch preserves current statusFilter", async () => {
        mockGet.mockResolvedValue(paged([dispute]));

        const { result } = renderHook(() => useTitheDisputes());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("REJECTED"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applySearch("doe"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const lastCall = mockGet.mock.calls.at(-1)![0] as string;
        expect(lastCall).toContain("status=REJECTED");
        expect(lastCall).toContain("search=doe");
    });
});

// ── useTitheProofs ────────────────────────────────────────────────────────────

describe("useTitheProofs", () => {
    it("fetches proofs on mount", async () => {
        mockGet.mockResolvedValueOnce(paged([proof]));
        const { result } = renderHook(() => useTitheProofs());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/tithes/proofs"));
        expect(result.current.proofs).toEqual([proof]);
    });

    it("applies status filter and resets to page 1", async () => {
        mockGet.mockResolvedValue(paged([proof]));

        const { result } = renderHook(() => useTitheProofs());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("CONFIRMED"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=CONFIRMED"));
    });

    it("confirms a proof and refetches", async () => {
        mockGet.mockResolvedValue(paged([proof]));
        mockPost.mockResolvedValueOnce({});

        const { result } = renderHook(() => useTitheProofs());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.confirmProof("p1"); });

        expect(mockPost).toHaveBeenCalledWith("/admin/tithes/proofs/p1/confirm");
    });

    it("declines a proof with a financeNote and refetches", async () => {
        mockGet.mockResolvedValue(paged([proof]));
        mockPost.mockResolvedValueOnce({});

        const { result } = renderHook(() => useTitheProofs());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.declineProof("p1", "Receipt does not match amount.");
        });

        expect(mockPost).toHaveBeenCalledWith(
            "/admin/tithes/proofs/p1/decline",
            { financeNote: "Receipt does not match amount." }
        );
    });

    it("sets error and re-throws on decline failure", async () => {
        mockGet.mockResolvedValueOnce(paged([]));
        mockPost.mockRejectedValueOnce({ response: { data: { message: "Already reviewed" } } });

        const { result } = renderHook(() => useTitheProofs());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await expect(result.current.declineProof("p1", "note")).rejects.toThrow("Already reviewed");
        });

        expect(result.current.error).toBe("Already reviewed");
    });

    it("applySearch sends ?search= param and resets to page 1", async () => {
        mockGet.mockResolvedValue(paged([proof]));

        const { result } = renderHook(() => useTitheProofs());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applySearch("john"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.search).toBe("john");
        const lastCall = mockGet.mock.calls.at(-1)![0] as string;
        expect(lastCall).toContain("search=john");
        expect(lastCall).toContain("page=1");
    });

    it("applySearch preserves current statusFilter", async () => {
        mockGet.mockResolvedValue(paged([proof]));

        const { result } = renderHook(() => useTitheProofs());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyStatusFilter("DECLINED"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applySearch("doe"); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const lastCall = mockGet.mock.calls.at(-1)![0] as string;
        expect(lastCall).toContain("status=DECLINED");
        expect(lastCall).toContain("search=doe");
    });
});

// ── useTitheRecords ───────────────────────────────────────────────────────────

describe("useTitheRecords", () => {
    it("fetches records on mount with no filters", async () => {
        mockGet.mockResolvedValueOnce(paged([record]));
        const { result } = renderHook(() => useTitheRecords());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/tithes/records"));
        expect(result.current.records).toEqual([record]);
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Timeout" });
        const { result } = renderHook(() => useTitheRecords());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Timeout");
    });

    it("applies filters and resets to page 1", async () => {
        mockGet.mockResolvedValue(paged([record]));

        const { result } = renderHook(() => useTitheRecords());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            result.current.applyFilters({ fromMonth: "2026-01", toMonth: "2026-06", search: "john" });
        });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
        expect(lastCall).toContain("fromMonth=2026-01");
        expect(lastCall).toContain("toMonth=2026-06");
        expect(lastCall).toContain("search=john");
        expect(lastCall).toContain("page=1");
    });

    it("paginates to a new page while preserving filters", async () => {
        mockGet.mockResolvedValue(paged([record]));

        const { result } = renderHook(() => useTitheRecords());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            result.current.applyFilters({ search: "john" });
        });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.goToPage(3); });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
        expect(lastCall).toContain("page=3");
        expect(lastCall).toContain("search=john");
    });
});

// ── downloadTitheTemplate ─────────────────────────────────────────────────────

describe("downloadTitheTemplate", () => {
    it("fetches blob and triggers browser download", async () => {
        const blob = new Blob(["data"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        mockGet.mockResolvedValueOnce({ data: blob });

        const createObjectURL = jest.fn().mockReturnValue("blob:url");
        const revokeObjectURL = jest.fn();
        const clickFn = jest.fn();
        global.URL.createObjectURL = createObjectURL;
        global.URL.revokeObjectURL = revokeObjectURL;
        jest.spyOn(document, "createElement").mockReturnValueOnce(
            Object.assign(document.createElement("a"), { click: clickFn }) as HTMLAnchorElement
        );

        await downloadTitheTemplate();

        expect(mockGet).toHaveBeenCalledWith(
            "/admin/tithes/template",
            expect.objectContaining({ responseType: "blob" })
        );
        expect(createObjectURL).toHaveBeenCalledWith(blob);
        expect(clickFn).toHaveBeenCalled();
    });
});

// ── downloadTitheRecords ──────────────────────────────────────────────────────

describe("downloadTitheRecords", () => {
    it("builds query params from filters and triggers download", async () => {
        const blob = new Blob(["data"]);
        mockGet.mockResolvedValueOnce({ data: blob });

        const createObjectURL = jest.fn().mockReturnValue("blob:url");
        const revokeObjectURL = jest.fn();
        const clickFn = jest.fn();
        global.URL.createObjectURL = createObjectURL;
        global.URL.revokeObjectURL = revokeObjectURL;
        jest.spyOn(document, "createElement").mockReturnValueOnce(
            Object.assign(document.createElement("a"), { click: clickFn }) as HTMLAnchorElement
        );

        await downloadTitheRecords({ fromMonth: "2026-01", toMonth: "2026-03", search: "doe" });

        const calledUrl = mockGet.mock.calls[0][0] as string;
        expect(calledUrl).toContain("/admin/tithes/records/download");
        expect(calledUrl).toContain("fromMonth=2026-01");
        expect(calledUrl).toContain("toMonth=2026-03");
        expect(calledUrl).toContain("search=doe");
        expect(clickFn).toHaveBeenCalled();
    });

    it("works with no filters (empty query string)", async () => {
        const blob = new Blob(["data"]);
        mockGet.mockResolvedValueOnce({ data: blob });

        global.URL.createObjectURL = jest.fn().mockReturnValue("blob:url");
        global.URL.revokeObjectURL = jest.fn();
        jest.spyOn(document, "createElement").mockReturnValueOnce(
            Object.assign(document.createElement("a"), { click: jest.fn() }) as HTMLAnchorElement
        );

        await downloadTitheRecords();

        expect(mockGet).toHaveBeenCalledWith(
            expect.stringContaining("/admin/tithes/records/download"),
            expect.objectContaining({ responseType: "blob" })
        );
    });
});
