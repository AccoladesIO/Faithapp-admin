import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useEvents, EventReminder } from "../use-events";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;
const mockDelete = api.delete as jest.MockedFunction<typeof api.delete>;

const event = {
    id: "ev1", name: "Sunday Service", description: "", eventDate: "2026-06-29",
    onlineAttendanceEnabled: false, isRecurring: false,
    serviceSlots: [], endDate: "2026-06-29",
};

const recurringEvent = {
    ...event, id: "ev2", isRecurring: true,
    recurrence: { recurrencePattern: "weekly" as const, recurrenceInterval: 1, recurrenceEndDate: "2026-12-31" },
};

const reminder = {
    id: "rem1", intervalPreset: "24h" as const, audience: "ALL" as const,
    departmentId: null, enabled: true, createdAt: "2026-06-01T00:00:00Z",
};

beforeEach(() => jest.clearAllMocks());

describe("useEvents — deleteRecurringSeries", () => {
    it("calls DELETE on the recurring endpoint", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [recurringEvent] } });
        mockDelete.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useEvents());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.deleteRecurringSeries("rec-uuid-123"); });

        expect(mockDelete).toHaveBeenCalledWith("/events/recurring/rec-uuid-123");
    });

    it("sets error and throws when series delete fails", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } });
        mockDelete.mockRejectedValueOnce({ response: { data: { message: "Series not found" } } });

        const { result } = renderHook(() => useEvents());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await expect(
            act(async () => { await result.current.deleteRecurringSeries("bad-id"); })
        ).rejects.toThrow("Series not found");
    });
});

describe("useEvents — reminder CRUD", () => {
    it("fetchReminders GETs the correct URL and returns list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } })
               .mockResolvedValueOnce({ data: { data: [reminder] } });

        const { result } = renderHook(() => useEvents());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let reminders: EventReminder[] | undefined;
        await act(async () => { reminders = await result.current.fetchReminders("slot-1"); });

        expect(mockGet).toHaveBeenCalledWith("/events/slots/slot-1/reminders");
        expect(reminders).toEqual([reminder]);
    });

    it("createReminder POSTs and returns created reminder", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } });
        mockPost.mockResolvedValueOnce({ data: { data: reminder } });

        const { result } = renderHook(() => useEvents());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let created: EventReminder | undefined;
        await act(async () => {
            created = await result.current.createReminder("slot-1", { intervalPreset: "24h", audience: "ALL" });
        });

        expect(mockPost).toHaveBeenCalledWith("/events/slots/slot-1/reminders", { intervalPreset: "24h", audience: "ALL" });
        expect(created?.id).toBe("rem1");
    });

    it("updateReminder PATCHes and returns updated reminder", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } });
        const updated = { ...reminder, enabled: false };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useEvents());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let res: EventReminder | undefined;
        await act(async () => {
            res = await result.current.updateReminder("slot-1", "rem1", { enabled: false });
        });

        expect(mockPatch).toHaveBeenCalledWith("/events/slots/slot-1/reminders/rem1", { enabled: false });
        expect(res?.enabled).toBe(false);
    });

    it("deleteReminder calls DELETE on the correct path", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } });
        mockDelete.mockResolvedValueOnce({ data: {} });

        const { result } = renderHook(() => useEvents());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.deleteReminder("slot-1", "rem1"); });

        expect(mockDelete).toHaveBeenCalledWith("/events/slots/slot-1/reminders/rem1");
    });

    it("deleteReminder sets error and throws on failure", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [] } });
        mockDelete.mockRejectedValueOnce({ message: "Not found" });

        const { result } = renderHook(() => useEvents());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await expect(
            act(async () => { await result.current.deleteReminder("slot-1", "bad"); })
        ).rejects.toThrow("Not found");
    });
});
