import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RentalFacility {
    id: string;
    name: string;
    description: string | null;
    basePrice: number;
    capacity: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RentalPricingTier {
    id: string;
    memberCategory: "PUBLIC" | "MEMBER" | "WORKER" | "LEADER";
    discountType: "PERCENTAGE" | "FLAT";
    discountValue: number;
    isActive: boolean;
}

export interface RentalAddon {
    id: string;
    name: string;
    description: string | null;
    price: number;
    cautionAmount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RentalCalendarBlock {
    id: string;
    facilityId: string;
    startDateTime: string;
    endDateTime: string;
    reason: string | null;
    createdAt: string;
}

export interface RentalBooking {
    id: string;
    facility: { id: string; name: string };
    member: { id: string; firstname: string; lastname: string; email: string };
    startDateTime: string;
    endDateTime: string;
    status: string;
    memberCategory: string;
    basePrice: number;
    discountType: string | null;
    discountValue: number | null;
    discountSource: string;
    serviceFee: number;
    cautionTotal: number;
    grandTotal: number;
    overrideDiscountType: string | null;
    overrideDiscountValue: number | null;
    overrideDiscountNote: string | null;
    purpose: string | null;
    notes: string | null;
    rejectionReason: string | null;
    bookingAddons: { id: string; quantity: number; addon: { name: string; price: number } }[];
    payments: { id: string; type: string; amount: number; status: string; reference: string | null }[];
    createdAt: string;
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REJECTED";
export type MemberCategory = "PUBLIC" | "MEMBER" | "WORKER" | "LEADER";
export type DiscountType = "PERCENTAGE" | "FLAT";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateFacilityDto {
    name: string;
    description?: string;
    basePrice: number;
    capacity?: number;
}

export interface UpdateFacilityDto {
    name?: string;
    description?: string;
    basePrice?: number;
    capacity?: number;
    isActive?: boolean;
}

export interface UpsertPricingTierDto {
    memberCategory: MemberCategory;
    discountType: DiscountType;
    discountValue: number;
}

export interface CreateAddonDto {
    name: string;
    description?: string;
    price: number;
    cautionAmount?: number;
}

export interface UpdateAddonDto {
    name?: string;
    description?: string;
    price?: number;
    cautionAmount?: number;
    isActive?: boolean;
}

export interface CreateCalendarBlockDto {
    facilityId: string;
    startDateTime: string;
    endDateTime: string;
    reason?: string;
}

export interface ConfirmBookingDto {
    notes?: string;
}

export interface RejectBookingDto {
    rejectionReason: string;
}

export interface ApplyDiscountDto {
    overrideDiscountType: DiscountType;
    overrideDiscountValue: number;
    overrideDiscountNote?: string;
}

export interface MarkPaidDto {
    reference?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFacilityRental() {
    const [facilities, setFacilities] = useState<RentalFacility[]>([]);
    const [pricingTiers, setPricingTiers] = useState<RentalPricingTier[]>([]);
    const [addons, setAddons] = useState<RentalAddon[]>([]);
    const [calendarBlocks, setCalendarBlocks] = useState<RentalCalendarBlock[]>([]);
    const [bookings, setBookings] = useState<RentalBooking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<RentalBooking | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Facilities ───────────────────────────────────────────────────────────

    const fetchFacilities = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/facility-rental/admin/facilities");
            const list: RentalFacility[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setFacilities(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch facilities.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createFacility = useCallback(async (dto: CreateFacilityDto): Promise<RentalFacility> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/facility-rental/admin/facilities", dto);
            const created: RentalFacility = res.data?.data;
            setFacilities((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to create facility.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateFacility = useCallback(async (id: string, dto: UpdateFacilityDto): Promise<RentalFacility> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/facility-rental/admin/facilities/${id}`, dto);
            const updated: RentalFacility = res.data?.data;
            setFacilities((prev) => prev.map((f) => (f.id === id ? updated : f)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to update facility.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ─── Pricing Tiers ────────────────────────────────────────────────────────

    const fetchPricingTiers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/facility-rental/admin/pricing-tiers");
            const list: RentalPricingTier[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setPricingTiers(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch pricing tiers.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const upsertPricingTier = useCallback(async (dto: UpsertPricingTierDto): Promise<RentalPricingTier> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/facility-rental/admin/pricing-tiers", dto);
            const upserted: RentalPricingTier = res.data?.data;
            setPricingTiers((prev) => {
                const idx = prev.findIndex((t) => t.memberCategory === upserted.memberCategory);
                return idx >= 0 ? prev.map((t, i) => (i === idx ? upserted : t)) : [upserted, ...prev];
            });
            return upserted;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to save pricing tier.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deletePricingTier = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/facility-rental/admin/pricing-tiers/${id}`);
            setPricingTiers((prev) => prev.filter((t) => t.id !== id));
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to delete pricing tier.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ─── Add-ons ──────────────────────────────────────────────────────────────

    const fetchAddons = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/facility-rental/admin/addons");
            const list: RentalAddon[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setAddons(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch add-ons.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createAddon = useCallback(async (dto: CreateAddonDto): Promise<RentalAddon> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/facility-rental/admin/addons", dto);
            const created: RentalAddon = res.data?.data;
            setAddons((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to create add-on.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateAddon = useCallback(async (id: string, dto: UpdateAddonDto): Promise<RentalAddon> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/facility-rental/admin/addons/${id}`, dto);
            const updated: RentalAddon = res.data?.data;
            setAddons((prev) => prev.map((a) => (a.id === id ? updated : a)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to update add-on.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ─── Calendar Blocks ──────────────────────────────────────────────────────

    const fetchCalendarBlocks = useCallback(async (facilityId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/facility-rental/admin/calendar-blocks?facilityId=${facilityId}`);
            const list: RentalCalendarBlock[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setCalendarBlocks(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch calendar blocks.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createCalendarBlock = useCallback(async (dto: CreateCalendarBlockDto): Promise<RentalCalendarBlock> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/facility-rental/admin/calendar-blocks", dto);
            const created: RentalCalendarBlock = res.data?.data;
            setCalendarBlocks((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to create calendar block.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteCalendarBlock = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/facility-rental/admin/calendar-blocks/${id}`);
            setCalendarBlocks((prev) => prev.filter((b) => b.id !== id));
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to delete calendar block.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ─── Bookings ─────────────────────────────────────────────────────────────

    const fetchBookings = useCallback(async (status?: BookingStatus | "") => {
        setIsLoading(true);
        setError(null);
        try {
            const q = status ? `?status=${status}` : "";
            const res = await api.get(`/facility-rental/admin/bookings${q}`);
            const list: RentalBooking[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setBookings(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch bookings.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchBookingById = useCallback(async (id: string): Promise<RentalBooking> => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/facility-rental/admin/bookings/${id}`);
            const booking: RentalBooking = res.data?.data;
            setSelectedBooking(booking);
            return booking;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to fetch booking.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const confirmBooking = useCallback(async (id: string, dto: ConfirmBookingDto): Promise<RentalBooking> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/facility-rental/admin/bookings/${id}/confirm`, dto);
            const updated: RentalBooking = res.data?.data;
            setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
            setSelectedBooking(updated);
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to confirm booking.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const rejectBooking = useCallback(async (id: string, dto: RejectBookingDto): Promise<RentalBooking> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/facility-rental/admin/bookings/${id}/reject`, dto);
            const updated: RentalBooking = res.data?.data;
            setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
            setSelectedBooking(updated);
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to reject booking.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const applyBookingDiscount = useCallback(async (id: string, dto: ApplyDiscountDto): Promise<RentalBooking> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/facility-rental/admin/bookings/${id}/discount`, dto);
            const updated: RentalBooking = res.data?.data;
            setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
            setSelectedBooking(updated);
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to apply discount.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const removeBookingDiscount = useCallback(async (id: string): Promise<RentalBooking> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.delete(`/facility-rental/admin/bookings/${id}/discount`);
            const updated: RentalBooking = res.data?.data;
            setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
            setSelectedBooking(updated);
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to remove discount.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const markPaymentPaid = useCallback(async (paymentId: string, dto: MarkPaidDto): Promise<RentalBooking> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/facility-rental/admin/payments/${paymentId}/paid`, dto);
            const updated: RentalBooking = res.data?.data;
            setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            setSelectedBooking(updated);
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to mark payment as paid.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const refundPayment = useCallback(async (paymentId: string): Promise<RentalBooking> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/facility-rental/admin/payments/${paymentId}/refund`);
            const updated: RentalBooking = res.data?.data;
            setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            setSelectedBooking(updated);
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to process refund.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ─── Bootstrap ────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchFacilities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        // State
        facilities,
        pricingTiers,
        addons,
        calendarBlocks,
        bookings,
        selectedBooking,
        setSelectedBooking,
        isLoading,
        isSubmitting,
        error,
        setError,
        // Facilities
        fetchFacilities,
        createFacility,
        updateFacility,
        // Pricing Tiers
        fetchPricingTiers,
        upsertPricingTier,
        deletePricingTier,
        // Add-ons
        fetchAddons,
        createAddon,
        updateAddon,
        // Calendar Blocks
        fetchCalendarBlocks,
        createCalendarBlock,
        deleteCalendarBlock,
        // Bookings
        fetchBookings,
        fetchBookingById,
        confirmBooking,
        rejectBooking,
        applyBookingDiscount,
        removeBookingDiscount,
        markPaymentPaid,
        refundPayment,
    };
}
