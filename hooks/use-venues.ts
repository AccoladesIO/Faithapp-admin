import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface Venue {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    createdAt: string;
}

export interface CreateVenuePayload {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}

export interface UpdateVenuePayload {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}

export function useVenues() {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVenues = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/venues");
            setVenues(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch venues."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createVenue = useCallback(async (payload: CreateVenuePayload): Promise<Venue> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/venues", payload);
            const created: Venue = res.data?.data;
            setVenues((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create venue.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateVenue = useCallback(async (venueId: string, payload: UpdateVenuePayload): Promise<Venue> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/venues/${venueId}`, payload);
            const updated: Venue = res.data?.data;
            setVenues((prev) =>
                prev.map((v) => (v.id === venueId ? updated : v))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update venue.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteVenue = useCallback(async (venueId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/venues/${venueId}`);
            setVenues((prev) => prev.filter((v) => v.id !== venueId));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete venue.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchVenues();
    }, [fetchVenues]);

    const clearError = useCallback(() => setError(null), []);
    return {
        venues,
        isLoading,
        isSubmitting,
        error,

        clearError,
        fetchVenues,
        createVenue,
        updateVenue,
        deleteVenue,
    };
}