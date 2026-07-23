"use client";

import React, { useEffect, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Star, Trash2, RefreshCw } from "lucide-react";
import { useServiceRatings } from "@/hooks/use-service-ratings";
import { EventSearchInput } from "@/components/ui/event-search-input";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function StarRow({ rating }: Readonly<{ rating: number }>) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={14}
                    className={n <= rating ? "fill-[#121212] text-[#121212]" : "text-[#121212]/15"}
                />
            ))}
        </div>
    );
}

function DistributionBar({ star, count, total }: Readonly<{ star: number; count: number; total: number }>) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-3 text-[#8A817C]">{star}</span>
            <div className="flex-1 h-2 bg-[#F4F1EA] rounded-full overflow-hidden">
                <div className="h-full bg-[#121212]" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 text-right text-[#8A817C]">{count}</span>
        </div>
    );
}

const ServiceRatingsPage = withAuth(function ServiceRatingsPage() {
    const { summary, comments, pagination, isLoading, error, fetchSummary, fetchComments, moderateDelete } = useServiceRatings();
    const [filterEventId, setFilterEventId] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    useEffect(() => {
        fetchSummary();
        fetchComments(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyFilters = () => {
        fetchSummary(filterEventId || undefined, filterFrom || undefined, filterTo || undefined);
    };

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Service Ratings</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        How members felt about recent services
                    </p>
                </div>
                <button
                    onClick={() => {
                        fetchSummary(filterEventId || undefined, filterFrom || undefined, filterTo || undefined);
                        fetchComments(1);
                    }}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40 self-start sm:self-auto"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Event
                    </label>
                    <EventSearchInput value={filterEventId} onChange={setFilterEventId} />
                </div>
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        From
                    </label>
                    <input
                        type="date"
                        value={filterFrom}
                        onChange={(e) => setFilterFrom(e.target.value)}
                        className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        To
                    </label>
                    <input
                        type="date"
                        value={filterTo}
                        onChange={(e) => setFilterTo(e.target.value)}
                        className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
                <button
                    onClick={applyFilters}
                    className="h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                >
                    Apply
                </button>
            </div>

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Average Rating
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-light text-[#121212]">
                                {summary.averageRating.toFixed(1)}
                            </span>
                            <StarRow rating={Math.round(summary.averageRating)} />
                        </div>
                        <p className="text-xs text-[#8A817C] mt-1">{summary.totalRatings} ratings</p>
                    </div>
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Distribution
                        </div>
                        {[5, 4, 3, 2, 1].map((star) => (
                            <DistributionBar
                                key={star}
                                star={star}
                                count={summary.distribution[String(star) as "1" | "2" | "3" | "4" | "5"]}
                                total={summary.totalRatings}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5 bg-[#121212]/5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Comments</h2>
                </div>
                <div className="divide-y divide-[#121212]/5">
                    {comments.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-xs text-[#8A817C]">No comments yet.</div>
                    )}
                    {comments.map((c) => (
                        <div key={c.id} className="p-5 flex items-start justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                    <StarRow rating={c.rating} />
                                    <span className="text-xs text-[#8A817C]">
                                        {c.eventName} — {c.serviceSlotName} · {fmtDate(c.createdAt)}
                                    </span>
                                </div>
                                {c.comment && <p className="text-sm text-[#121212] font-light">{c.comment}</p>}
                                {c.member ? (
                                    <p className="text-[11px] text-[#8A817C]">{c.member.firstname} {c.member.lastname}</p>
                                ) : (
                                    <p className="text-[11px] text-[#8A817C] italic">Anonymous</p>
                                )}
                            </div>
                            {c.member && (
                                <button
                                    onClick={() => moderateDelete(c.id)}
                                    className="p-1.5 text-[#8A817C] hover:text-red-600 border border-[#121212]/5 hover:border-red-200 rounded-md transition-colors shrink-0"
                                    title="Hide this comment"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="px-5 py-4 border-t border-[#121212]/5">
                    <PaginationBar
                        pagination={pagination}
                        onPage={(p) => fetchComments(p)}
                        isLoading={isLoading}
                        label="comments"
                    />
                </div>
            </div>
        </div>
    );
}, { requiredPermission: "service_rating:read" });

export default ServiceRatingsPage;
