"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, Lightbulb, ArrowRight, RotateCcw } from "lucide-react";

// ─── Content config ────────────────────────────────────────────────────────────

interface PageHelp {
    title: string;
    summary: string;
    tips: string[];
    tasks: { label: string; how: string }[];
}

const HELP: Record<string, PageHelp> = {
    "/dashboard": {
        title: "Dashboard",
        summary: "Your at-a-glance view of key church metrics — attendance, upcoming events, finance summaries and birthday reminders. Everything updates in real time from the data entered across all modules.",
        tips: [
            "All numbers reflect live data — they change as records are added elsewhere in the portal.",
            "Birthday reminders only appear for members whose birthdate is saved in their profile.",
            "The finance summary respects the current open accounting period.",
        ],
        tasks: [
            { label: "Jump to a module", how: "Click any metric card to navigate directly" },
            { label: "Check upcoming events", how: "Events section on the right side of the dashboard" },
            { label: "View attendance trend", how: "Headcount chart in the centre panel" },
        ],
    },
    "/members": {
        title: "Members",
        summary: "Manage the full congregation directory — add profiles, update contact details, change member status and promote active members to workers. Member records are permanent; they cannot be deleted, only deactivated.",
        tips: [
            "Search by name, email or phone number using the search bar.",
            "Click any row to open the full member detail panel on the right.",
            "Members cannot be deleted — use 'Inactive' status to remove their access. This preserves their full history (attendance, giving, etc.).",
            "A member must be Active before they can be promoted to a worker.",
            "The 'Promote to Worker' action creates a worker profile linked to this member and asks you to assign a department.",
        ],
        tasks: [
            { label: "Add a new member", how: "'Add Member' button → fill in name, contact details and date of birth → Save" },
            { label: "Edit member details", how: "Click the member row → edit in the right panel" },
            { label: "Promote to worker", how: "Open member detail → 'Promote to Worker' → select department" },
            { label: "Deactivate a member", how: "Open member detail → Status → set to Inactive" },
            { label: "Bulk promote members", how: "Tick checkboxes on multiple rows → 'Promote Selected'" },
        ],
    },
    "/workers": {
        title: "Workers",
        summary: "View and manage all active workers across the church. Workers are members who have been promoted and assigned to a department. From here you can filter by department, view their schedules and manage their role assignments.",
        tips: [
            "Workers are always promoted from existing members — go to Members to create the promotion.",
            "Use the department filter dropdown to quickly narrow to a specific team.",
            "A worker's department determines which prayer roster rules and fixed assignments apply to them.",
            "Deactivating the underlying member record will also remove the worker from active rosters.",
        ],
        tasks: [
            { label: "Find a specific worker", how: "Search bar or use the department filter dropdown" },
            { label: "View worker details", how: "Click any row to open the detail panel" },
            { label: "Change a worker's department", how: "Open worker detail → Department field → save" },
            { label: "Create a new worker", how: "Go to Members → find the member → 'Promote to Worker'" },
        ],
    },
    "/attendance": {
        title: "Attendance",
        summary: "Record and review individual member attendance for services and events. Each attendance record links a member to a specific service slot on a specific date, building a permanent attendance history.",
        tips: [
            "Always select the correct service slot first — attendance is slot-specific, not just service-specific.",
            "You can mark multiple members as present in one session.",
            "Past attendance records cannot be deleted — corrections are handled by updating the status.",
            "Attendance data feeds the Dashboard headcount trend chart.",
            "Export the list to CSV to share with leadership or archive offline.",
        ],
        tasks: [
            { label: "Record attendance for a service", how: "Select the event and slot → search or tick members → Save" },
            { label: "Check a member's attendance history", how: "Members page → open member → Attendance tab in the panel" },
            { label: "Export attendance report", how: "Top-right Export button above the attendance list" },
        ],
    },
    "/birthday": {
        title: "Birthdays",
        summary: "View upcoming member birthdays so leadership can celebrate and reach out personally. Birthdays are automatically derived from member profiles — no separate data entry needed.",
        tips: [
            "Birthdays only appear for members who have a date of birth saved in their profile.",
            "Filter by month to plan cards, calls or celebration logistics in advance.",
            "Use the Announcements module to send a birthday message directly to a member through the app.",
        ],
        tasks: [
            { label: "Send birthday wishes", how: "Go to Announcements → Individual → search the member → write message" },
            { label: "Add a missing birthdate", how: "Go to Members → open the member → edit Date of Birth field" },
        ],
    },
    "/admin-management": {
        title: "Admin Users",
        summary: "Create and manage the admin accounts that access this portal. Each admin gets a specific set of permissions — only grant what each person actually needs. Admins are completely separate from church members.",
        tips: [
            "Admins log in to this portal. Regular members log in to the member-facing app instead.",
            "Permission groups bundle related permissions together — assign a group rather than individual permissions where possible.",
            "An inactive admin account cannot log in, but the account and its audit trail are preserved.",
            "The admin who creates an offering cannot be the one who reconciles it — this is a built-in two-person integrity rule.",
            "If an admin loses access to their email, update it here before they try to reset their password.",
        ],
        tasks: [
            { label: "Create a new admin account", how: "Top-right 'New Admin' button → fill email, name, permissions" },
            { label: "Edit an admin's permissions", how: "Click the admin row → Permissions section in the panel" },
            { label: "Deactivate an admin", how: "Click the admin row → toggle Active status to Off" },
            { label: "Reset an admin's access", how: "Update their email if needed, then ask them to use 'Forgot Password'" },
        ],
    },
    "/events": {
        title: "Services",
        summary: "Configure recurring church services and their individual slots. A Service is the parent (e.g. 'Sunday Worship'); Service Slots are the distinct sessions within it (e.g. 'First Service 7am', 'Second Service 10am'). Slots are the unit used across attendance, headcount and programmes.",
        tips: [
            "Always create the parent Service before adding slots — slots belong to a service.",
            "Service slot names should be specific (include the time) so they are unambiguous in dropdowns elsewhere.",
            "Slots must exist before you can record attendance or build a service programme for that session.",
            "Deactivating a service hides it from new entries but preserves all existing records tied to it.",
        ],
        tasks: [
            { label: "Create a new service", how: "'New Service' → enter name, day of week, recurrence" },
            { label: "Add a slot to a service", how: "Open the service row → 'Add Slot' → enter slot name and time" },
            { label: "Edit a slot", how: "Open the service → click the slot → edit in the panel" },
        ],
    },
    "/venue": {
        title: "Venues",
        summary: "Manage the physical and virtual locations where services and events are held. Venues are referenced when scheduling events so that location and capacity information is always attached to the record.",
        tips: [
            "Add all venues before scheduling events — events must reference an existing venue.",
            "Include the full address so it can be displayed to members in the app.",
            "For online events, use a descriptive name like 'Zoom — Main Service' and include the link in the notes.",
            "Venue capacity is informational and does not block bookings — it is a guide for planners.",
        ],
        tasks: [
            { label: "Add a new venue", how: "'New Venue' button → name, address, capacity" },
            { label: "Edit venue details", how: "Click the venue row → edit in the panel → save" },
        ],
    },
    "/service-headcount": {
        title: "Headcount",
        summary: "Record aggregate attendance numbers (as counts, not names) for each service slot. Unlike the Attendance module which tracks individuals, Headcount is for the total turnout per session, broken down by custom groups like Children, Visitors or Men/Women.",
        tips: [
            "Enter counts shortly after each service while the numbers are fresh.",
            "Custom groups (e.g. Children, Visitors) are configured in settings and show as columns in the entry form.",
            "The Trends tab compares headcount across multiple services over a date range — useful for leadership reports.",
            "Headcount and individual Attendance are separate records — you can use one, the other, or both.",
        ],
        tasks: [
            { label: "Record headcount after a service", how: "Select the service slot → enter numbers for each group → Save" },
            { label: "View headcount trends", how: "Switch to Trends tab → pick a service and date range" },
            { label: "Add a custom group", how: "Settings → Headcount Groups → 'Add Group'" },
        ],
    },
    "/service-programme": {
        title: "Service Programme",
        summary: "Build and manage the order of service for each slot — who leads worship, preaches, reads scripture, makes announcements, and more. Programmes can be saved as templates and reused across future services.",
        tips: [
            "Create a programme for a specific service slot first, then add the individual items (songs, readings, roles).",
            "Assigning a registered member to an item sends them an automatic email notification.",
            "If the person isn't in the system, enter a guest name manually — it still shows on the programme.",
            "Templates save your current programme structure. Apply a template to a new slot to pre-fill the order of service, then adjust as needed.",
            "Each programme item can have a time allocation — useful for timed services.",
        ],
        tasks: [
            { label: "Create a new programme", how: "'New Programme' → select the service slot and date" },
            { label: "Add an item to the programme", how: "Open the programme → 'Add Slot' → pick item type and assignee" },
            { label: "Save as a template", how: "Open programme → 'Save as Template' → give it a name" },
            { label: "Apply a saved template", how: "Open programme → 'Apply Template' → select template" },
            { label: "Notify assigned member", how: "Assign a registered member to any item — notification is automatic" },
        ],
    },
    "/service-session": {
        title: "Live Session",
        summary: "Conduct the service in real time. The conductor view shows the current programme slot, tracks elapsed time, and lets you advance, rewind, pause or end the session. All state is shared live — anyone watching the session feed sees the same position.",
        tips: [
            "The timer turns red when a slot runs over its allocated time — use it as a cue to move on.",
            "Pausing prompts you to pick a reason (e.g. Offering, Announcement) so the session report captures why time was used.",
            "Rewinding returns to the previous slot; its clock restarts from zero.",
            "Ending the session is permanent — a summary report email is sent automatically. Use Pause if you only need a break.",
            "If there is no LIVE programme for any slot today, use Service Programme to start one first.",
        ],
        tasks: [
            { label: "Advance to the next slot", how: "Click the → button (or press the arrow on the conductor panel)" },
            { label: "Rewind to the previous slot", how: "Click the ← button" },
            { label: "Pause the session", how: "'Pause' → select a reason from the dropdown → Confirm" },
            { label: "Resume after a pause", how: "'Resume' button — timer picks up where it left off" },
            { label: "End the session", how: "'End Session' → confirm in the inline prompt" },
            { label: "Start a session", how: "Go to Service Programme → open a DRAFT programme → 'Start Session'" },
        ],
    },
    "/prayer": {
        title: "Prayer Schedule",
        summary: "Manage the church prayer meeting programme end-to-end — configure when meetings run, set assignment rules, allow workers to self-select slots, and publish the monthly roster. The workflow is: Configure → Generate → Open Selection → Close Selection → Auto-Assign → Validate.",
        tips: [
            "Set up Day Configs and Rules before generating your first roster — they drive the auto-assignment logic.",
            "The Roster tab is your main working view. Work through the action buttons left-to-right; the highlighted button shows the recommended next step.",
            "Fixed Assignments lock specific workers to specific day types so they always appear regardless of auto-assign.",
            "Workers self-select slots when the selection window is open — close it before running Auto-Assign.",
            "Role Frequency rules prevent any one lead type (e.g. DEACON) from being assigned too many times in a month.",
            "Export the final roster as CSV for printing or sharing with the congregation.",
        ],
        tasks: [
            { label: "Configure prayer meeting days", how: "Day Configs tab → 'Add Day Config' → set day, time, capacity" },
            { label: "Set assignment rules", how: "Rules tab → 'Add Rule' → choose type (Max Per Meeting, Min Leaders, Role Frequency)" },
            { label: "Lock a worker to specific days", how: "Fixed Assignments tab → 'Add Assignment' → pick worker and day type" },
            { label: "Generate monthly roster", how: "Roster tab → select month/year → 'Generate'" },
            { label: "Open self-selection window", how: "Roster tab → 'Open Selection' (after generating)" },
            { label: "Close and auto-fill gaps", how: "Roster tab → 'Close Selection' then 'Auto-Assign'" },
            { label: "Validate the roster", how: "Roster tab → 'Validate' — checks all rules are satisfied" },
            { label: "Export the month's roster", how: "Roster tab → 'Export CSV'" },
            { label: "Reschedule a worker", how: "Roster tab → click a meeting row → click the worker entry → Reschedule" },
        ],
    },
    "/departments": {
        title: "Departments",
        summary: "Manage the organisational units workers belong to — Choir, Ushering, Media, etc. Every worker is assigned to exactly one department, which determines their group memberships, reporting lines and prayer roster eligibility.",
        tips: [
            "Create all departments before promoting any members to workers — a department must exist first.",
            "Workers can only belong to one department at a time; to move them, update their worker profile.",
            "Department names appear in filter dropdowns across the Workers, Prayer Schedule and other modules.",
            "Deleting a department is blocked if any workers are still assigned to it.",
        ],
        tasks: [
            { label: "Add a new department", how: "'New Department' → enter name and optional description" },
            { label: "Edit a department name", how: "Click the department row → edit in the panel → Save" },
        ],
    },
    "/classes": {
        title: "Bible Classes",
        summary: "Manage discipleship and Bible study classes — create classes, enrol members, assign a worker as class leader, and track attendance per session. Classes are independent from Sunday services.",
        tips: [
            "Assign a worker as the class leader before enrolling students — the leader appears on class communications.",
            "Track attendance per class session from the class detail view.",
            "A member can be enrolled in multiple classes simultaneously.",
        ],
        tasks: [
            { label: "Create a new class", how: "'New Class' → name, description, assign leader" },
            { label: "Enrol a member", how: "Open the class → 'Enrol Member' → search and add" },
            { label: "Record class attendance", how: "Open the class → select session → mark attendees" },
        ],
    },
    "/childrens-church": {
        title: "Children's Church",
        summary: "Manage the children's ministry — organise children into age groups, assign teachers from the workers list, and track attendance. All children in the system are managed here separately from adult members.",
        tips: [
            "Create age groups (e.g. 0–5, 6–10, 11–13) first — children are assigned to a group.",
            "Teachers are assigned from the active worker pool, not from general members.",
            "Attendance is tracked per group and per session.",
        ],
        tasks: [
            { label: "Add an age group", how: "Groups tab → 'New Group' → set age range and name" },
            { label: "Assign a teacher", how: "Open a group → 'Assign Teacher' → select from workers" },
            { label: "Record children's attendance", how: "Select the group and session → mark children present" },
        ],
    },
    "/sunday-school": {
        title: "Sunday School",
        summary: "Manage Sunday School classes for various age groups — class setup, student enrolment, teacher assignments and session-by-session attendance. Operates independently of the main Children's Church module.",
        tips: [
            "Sunday School classes and Children's Church groups are separate — a child can appear in both.",
            "Assign a lead teacher per class; co-teachers can also be added.",
        ],
        tasks: [
            { label: "Add a Sunday School class", how: "'New Class' → set name, age range, teacher" },
            { label: "Enrol a student", how: "Open the class → 'Add Student'" },
            { label: "Record session attendance", how: "Open the class → select session date → mark students" },
        ],
    },
    "/follow-up": {
        title: "Follow Up",
        summary: "Track first-time visitors from the moment they walk in until they are fully integrated into the congregation. The module has four tabs — First Timers (visitor records), Tasks (worker assignments), Pipeline (funnel report), and Report (outcome breakdown). Each visitor can have return visits logged, notes recorded per contact method, and is marked Converted when they join as a member.",
        tips: [
            "The Pipeline tab shows at a glance how many visitors are at each stage — Untouched, Contacted, Returned, Invited and Converted. Use it to spot bottlenecks.",
            "Log a return visit from the First Timers table using the Calendar icon on each row — record each time a visitor comes back before converting.",
            "The Stale filter in the Tasks tab surfaces open tasks with no recent activity. Use it to chase up workers who have gone quiet on a follow-up.",
            "Each task note records the contact method (Phone Call, WhatsApp, In Person, SMS, Email) so you have a full communication log per visitor.",
            "Mark a visitor as Converted using the tick icon on their row — this updates their pipeline stage and signals they have become a member.",
            "Workers receive automatic email reminders for overdue tasks. Admins receive a daily stale-task alert when any open task has had no activity beyond the configured threshold.",
            "Use Bulk Update in the Tasks tab to move multiple tasks to a new status in one action — useful after a follow-up team review.",
        ],
        tasks: [
            { label: "Add a first-time visitor", how: "First Timers tab → 'Add First Timer' button → fill in name, phone, source" },
            { label: "Log a return visit", how: "First Timers tab → Calendar icon on the visitor row → pick date and notes → Log Visit" },
            { label: "Mark a visitor as converted", how: "First Timers tab → UserCheck icon on the visitor row" },
            { label: "Invite a visitor to membership", how: "First Timers tab → Mail icon on the visitor row (requires an email address on the record)" },
            { label: "View the first-timer funnel", how: "Pipeline tab → optionally set a date range → 'Load Pipeline'" },
            { label: "Find stale / inactive tasks", how: "Tasks tab → 'Stale' filter pill → adjust days threshold if needed → Refresh" },
            { label: "Bulk update task statuses", how: "Tasks tab → tick checkboxes on multiple rows → choose target status → Apply" },
            { label: "Generate an outcome report", how: "Report tab → set date range → 'Generate Report'" },
        ],
    },
    "/announcements": {
        title: "Announcements",
        summary: "Send in-app messages to members — broadcast to the whole congregation, target specific roles, or message a single person — or, with the 'SMS Only' toggle, text a targeted audience without publishing anything to the app. Announcements appear immediately in the member app's notification centre; this page is also the one place SMS balance, sending, and delivery logs live.",
        tips: [
            "Double-check the audience before sending — 'All Members' reaches the entire congregation instantly.",
            "There is no recall or unsend once a message is sent — proof-read carefully.",
            "Use Individual announcements for personal matters (e.g. appointment reminders, birthday messages).",
            "Workers-only announcements are ideal for internal logistics that members don't need to see.",
            "Switch to 'SMS Only' to text an audience directly — no title, body, or feed entry is created, just a text message.",
            "Group audience reaches everyone in that group, including phone-only entries (e.g. imported first-timers) alongside real members — see the Groups page.",
            "Your SMS balance is shown at the top whenever you have SMS permissions — top up before it runs low, since a broadcast can't send without balance.",
            "Use 'View Logs' next to the SMS balance to check delivery status for any SMS you've sent — it's a live read from the SMS provider, not a local record.",
        ],
        tasks: [
            { label: "Broadcast to all members", how: "Audience → All Members → write message → Send" },
            { label: "Message a specific person", how: "Audience → Individual → search member → write → Send" },
            { label: "Target workers only", how: "Audience → Workers → write → Send" },
            { label: "Send an SMS without publishing an announcement", how: "Toggle 'SMS Only' → choose audience → write message → Send SMS" },
            { label: "Text a group (e.g. first-timers)", how: "Toggle 'SMS Only' → Audience → Group → pick group → write → Send SMS" },
            { label: "Check SMS delivery status", how: "'View Logs' link next to the SMS Balance chip" },
        ],
    },
    "/groups": {
        title: "Groups",
        summary: "Reusable rosters of people to target from Announcements, without re-selecting individuals each time. A group can hold real members and workers, plus phone-only entries — people with no member account, like first-timers — added manually or imported in bulk from a date range.",
        tips: [
            "A group's membership is independent of Department — mix members and workers from any department in one group.",
            "Phone-only entries (shown with a 'Guest' badge) can't receive push notifications or in-app announcements — they can only be reached by SMS, via Announcements' 'SMS Only' mode with a Group audience.",
            "'Add from First-Timers' pulls in everyone captured in the chosen date range who has a phone number on file — reuse this to build a fresh 'this month's first-timers' group before every outreach text.",
            "Paste multiple phone numbers at once (one per line, optionally 'number, label') when you have a list from outside the system.",
            "Deleting a group removes its roster but does not affect the underlying members or first-timer records.",
        ],
        tasks: [
            { label: "Create a group", how: "'New Group' → name it → Create" },
            { label: "Add real members/workers", how: "Select a group → 'Add Members' → search by name or phone → select → Add" },
            { label: "Add phone numbers manually", how: "Select a group → 'Add by Phone Number' → paste numbers (one per line) → Add Numbers" },
            { label: "Import first-timers from a date range", how: "Select a group → 'Add from First-Timers' → pick a date range → Import First-Timers" },
            { label: "Remove someone from a group", how: "Select the group → click the X on their roster row (works for members and phone-only entries alike)" },
            { label: "Send a message to a group", how: "Go to Announcements → set Audience to Group → pick the group → write → Send" },
        ],
    },
    "/inventories": {
        title: "Inventories",
        summary: "Track the church's physical assets and equipment — furniture, electronics, instruments, vehicles and any other items. Each record stores condition, location and assignment so auditing is straightforward.",
        tips: [
            "Log items with their current condition (Good, Fair, Poor) so deterioration is visible over time.",
            "Record the physical location of each item so it can be found quickly during events.",
            "Update condition and location whenever an item moves or its state changes.",
            "Use the Notes field for serial numbers, purchase dates or warranty information.",
        ],
        tasks: [
            { label: "Add a new inventory item", how: "'New Item' → name, category, condition, location" },
            { label: "Update item condition", how: "Click the item → edit Condition field → Save" },
        ],
    },
    "/facility-rental": {
        title: "Facility Rental",
        summary: "Manage external bookings of church facilities — halls, conference rooms, outdoor spaces. Configure which spaces are available, set how pricing adjusts for different member categories, add optional services, block unavailable dates, and process incoming booking requests.",
        tips: [
            "Create facilities first — no bookings can be submitted until at least one facility exists.",
            "Pricing Tiers set percentage discounts based on the requester's member category (e.g. full members get 20% off). One tier per category applies across all facilities — it is not per-room.",
            "Add-ons are optional chargeable services (Sound System, Projector, Chairs). They add to the booking total. The refundable deposit on an add-on is returned after the event when equipment comes back in good condition.",
            "Calendar Blocks mark dates when a facility cannot be booked (maintenance, reserved for church use, public holidays). Block at least a day buffer around major church events.",
            "Incoming booking requests sit in Pending status — review and Confirm or Reject each one. The requester is notified automatically.",
            "Override Discount lets you apply a one-off percentage reduction to any specific booking (e.g. for a charity or special guest) without changing the global tier.",
        ],
        tasks: [
            { label: "Add a facility", how: "Facilities tab → 'New Facility' → name, description, base price, capacity" },
            { label: "Set member-category pricing", how: "Pricing Tiers tab → 'Add Tier' → select category → set discount %" },
            { label: "Add an optional service", how: "Add-ons tab → 'New Add-on' → name, price, refundable deposit amount" },
            { label: "Block unavailable dates", how: "Calendar Blocks tab → select facility → 'Add Block' → pick date range" },
            { label: "Confirm or reject a booking", how: "Bookings tab → click booking row → review details → Confirm / Reject" },
            { label: "Apply a one-off discount", how: "Bookings tab → open booking → Override Discount field → enter %" },
        ],
    },

    // ── Finance sub-pages ──────────────────────────────────────────────────────

    "/finances": {
        title: "Finances",
        summary: "A complete church accounting suite. Navigate the sub-sections from the sidebar: Journal Entries, Offerings, Tithes & Giving, Petty Cash, Budgets, Pledges, Accounts and Reports. All transactions are tied to an Accounting Period — you must have an open period before you can post.",
        tips: [
            "Accounting Periods gate all transactions — open a period for the current month before anything else.",
            "The two-person rule: the admin who records an offering cannot be the one who reconciles it. This is enforced by the system.",
            "Journal entries use double-entry bookkeeping — every entry must have matching debits and credits.",
            "Locking an accounting period prevents any further posting to it — lock periods after month-end reconciliation.",
            "All financial reports respect the date range of the period(s) you select.",
        ],
        tasks: [
            { label: "Open a new accounting period", how: "Finances → Accounting Periods → 'New Period'" },
            { label: "Record an offering", how: "Finances → Offerings → 'New Offering' → complete the form" },
            { label: "Reconcile an offering", how: "Finances → Offerings → click the offering → 'Reconcile' (must be a different admin)" },
            { label: "Upload a tithe batch", how: "Finances → Tithes & Giving → 'Upload Batch'" },
            { label: "Create a journal entry", how: "Finances → Journal Entries → 'New Entry'" },
            { label: "View financial reports", how: "Finances → Reports → select report type and period" },
        ],
    },
    "/finances/accounting-periods": {
        title: "Accounting Periods",
        summary: "Accounting Periods define the date windows you can post transactions to. Before recording any offering, journal entry or petty cash transaction, an open period must exist that covers that date. Once a period is locked, no further postings are allowed.",
        tips: [
            "Create a period at the start of each month — typically 1st to last day of the month.",
            "A period can be Open (posting allowed) or Locked (no more postings — for finalised months).",
            "You cannot have two overlapping open periods — the system will reject the second one.",
            "Lock a period after completing month-end reconciliation to protect the final figures.",
            "Reports can span multiple periods — you are not limited to a single period when pulling statements.",
        ],
        tasks: [
            { label: "Open a new period", how: "'New Period' → set start date, end date and name → Save" },
            { label: "Lock a completed period", how: "Click the period → 'Lock Period' — this is irreversible" },
            { label: "Check which period is currently open", how: "The status column shows Open / Locked for each row" },
        ],
    },
    "/finances/journal-entries": {
        title: "Journal Entries",
        summary: "Manual double-entry bookkeeping entries. Every transaction debits one account and credits another — the total debits must equal the total credits before you can save. Use journal entries for adjustments, transfers between accounts, accruals and any transaction that doesn't fit the specialised modules.",
        tips: [
            "Both sides of the entry must balance — the system won't save an unbalanced journal.",
            "Always reference the Accounting Period you are posting to — entries outside an open period are rejected.",
            "Use the Description and Reference fields generously — they are your audit trail.",
            "Entries cannot be deleted once posted — corrections require a reversing journal entry.",
            "Common categories: Tithes & Offerings (income), Operational Expense, Welfare, Capital, Bank.",
        ],
        tasks: [
            { label: "Create a journal entry", how: "'New Entry' → select period → add debit and credit lines → verify balance → Post" },
            { label: "Reverse a posted entry", how: "Open the entry → 'Reverse Entry' → a counter-entry is created automatically" },
            { label: "View entries for a period", how: "Filter by Accounting Period in the top filter row" },
            { label: "Export journal entries", how: "Filter to the desired range → Export CSV button" },
        ],
    },
    "/finances/offerings": {
        title: "Offerings",
        summary: "Record and reconcile church offerings collected at services. The process requires two different admins: one records the raw collection (envelopes counted, denomination breakdown), and a separate admin reconciles it against the bank deposit. This two-person rule is enforced by the system and cannot be bypassed.",
        tips: [
            "Step 1 — Recording: The counting admin fills in the offering details immediately after the service.",
            "Step 2 — Reconciliation: A different admin compares the recorded amount to the physical bank deposit slip and marks it reconciled.",
            "You cannot reconcile an offering you recorded yourself — the system will reject it.",
            "Ensure the correct Accounting Period is selected at recording time — the period must be open for the service date.",
            "Attach notes referencing the counting sheet or deposit slip for a complete audit trail.",
            "A reconciled offering is locked — contact finance leadership if a correction is needed after reconciliation.",
        ],
        tasks: [
            { label: "Record a new offering", how: "'New Offering' → select service slot, date and period → enter breakdown → Save" },
            { label: "Reconcile an offering", how: "Different admin: click the offering → 'Reconcile' → confirm deposit matches → Submit" },
            { label: "View unreconciled offerings", how: "Filter Status → 'Pending Reconciliation'" },
            { label: "Export offering report", how: "Filter to date range → Export CSV" },
        ],
    },
    "/finances/tithes": {
        title: "Tithes & Giving",
        summary: "Manage tithe and giving records — upload batches from giving envelopes or bank statements, match deposits to member giving records, and resolve discrepancies. This module maintains each member's individual giving history.",
        tips: [
            "Upload a batch file (CSV) at the start of the process — the system attempts automatic member matching by name or member number.",
            "Unmatched rows land in the 'Unmatched' queue — review and manually link them to the correct member.",
            "Disputed rows are amounts where the uploaded figure differs from what was expected — flag them for investigation.",
            "A member's giving total is visible in their member profile once records are matched.",
            "All matched giving records feed into the annual giving statements that can be exported for acknowledgement purposes.",
            "Never delete a tithe record — mark it as a dispute and add notes explaining the discrepancy.",
        ],
        tasks: [
            { label: "Upload a giving batch", how: "'Upload Batch' → select CSV file → confirm column mapping → Upload" },
            { label: "Review unmatched records", how: "Unmatched tab → click each row → search for the member → Match" },
            { label: "Flag a dispute", how: "Click the record → 'Flag Dispute' → add a note describing the issue" },
            { label: "View a member's giving history", how: "Search the member name → open record → full giving timeline shown" },
            { label: "Export giving statements", how: "Reports → Giving Statement → select year → Export" },
        ],
    },
    "/finances/petty-cash": {
        title: "Petty Cash",
        summary: "Manage small cash disbursements from the church's petty cash fund. Each payment generates a voucher with details of what was spent, who approved it and which budget category it falls under. The petty cash balance is tracked automatically.",
        tips: [
            "Set a petty cash limit — any expense above the limit should go through a formal purchase order instead.",
            "Every voucher requires an approver who is a different admin from the one requesting the payment.",
            "Assign each voucher to a budget category so expenses are reflected in the budget vs. actual report.",
            "Replenishment: when the fund runs low, create a replenishment journal entry from the bank account.",
            "Regular petty cash audits (counting the physical cash against the system balance) help catch discrepancies early.",
        ],
        tasks: [
            { label: "Record a petty cash payment", how: "'New Voucher' → description, amount, category, payee → request approval" },
            { label: "Approve a voucher", how: "Pending tab → open voucher → 'Approve' (must be a different admin from the requester)" },
            { label: "Replenish the fund", how: "Create a journal entry debiting Petty Cash and crediting Bank Account" },
            { label: "Run a petty cash audit", how: "Reports → Petty Cash Summary → compare to physical cash on hand" },
        ],
    },
    "/finances/budgets": {
        title: "Budgets",
        summary: "Set annual or period budgets for each expense and income category, then track actual spending versus budget in real time. Budgets give leadership visibility into whether the church is on track financially before the period closes.",
        tips: [
            "Create budget lines for each major category before the financial year begins.",
            "Budget vs. Actual is calculated automatically as transactions are posted across other modules.",
            "A budget line that goes over 90% shows a warning — review it before further spending.",
            "Budget revisions (mid-year adjustments) should be documented in the notes field for transparency.",
            "Income budgets and Expense budgets are tracked separately — compare them to see projected surplus or deficit.",
        ],
        tasks: [
            { label: "Create a budget for a category", how: "'New Budget Line' → select category, period, set amount" },
            { label: "View budget vs. actual", how: "Budget Overview tab → select the period or year" },
            { label: "Revise a budget mid-year", how: "Click the budget line → update the amount → add a note explaining the revision" },
            { label: "Export budget report", how: "Budget Overview → Export CSV for leadership review" },
        ],
    },
    "/finances/pledges": {
        title: "Pledges",
        summary: "Track member pledge commitments and their fulfilment. A pledge is a member's commitment to give a specific amount over a defined period (e.g. a building fund pledge paid monthly over 12 months). Track how much has been received versus the total pledge.",
        tips: [
            "Pledges are linked to individual member records — search the member before creating a pledge.",
            "Each pledge payment (fulfilment) should be recorded separately as it comes in.",
            "The Fulfilment % shows how much of the total pledge has been received to date.",
            "Send reminders via Announcements to members whose pledges are falling behind schedule.",
            "Pledges that are fully fulfilled show as Completed automatically.",
            "If a member cancels a pledge, update the status to Cancelled — do not delete it, as the partial payments already recorded are real income.",
        ],
        tasks: [
            { label: "Record a new pledge", how: "'New Pledge' → search member → set campaign, amount and expected completion date" },
            { label: "Record a pledge payment", how: "Open the pledge → 'Add Payment' → enter amount and date" },
            { label: "View outstanding pledges", how: "Filter Status → Active → sort by Fulfilment % ascending" },
            { label: "Export pledge report", how: "Reports → Pledge Summary → select campaign → Export" },
        ],
    },
    "/finances/accounts": {
        title: "Chart of Accounts",
        summary: "Manage the accounts used across all journal entries and financial reports. The chart of accounts is the foundation of your bookkeeping — every debit and credit line must reference a valid account. Accounts are grouped into types: Asset, Liability, Income, Expense and Equity.",
        tips: [
            "Set up the full chart of accounts before entering any journal entries.",
            "Account codes (e.g. 1000 for assets, 4000 for income) help with sorting and reporting — use a consistent numbering scheme.",
            "Do not delete accounts that have been used in posted journal entries — deactivate them instead.",
            "Sub-accounts allow you to track at a more granular level (e.g. Expense → Ministry → Children's Church).",
            "Opening balances should be entered as a journal entry on the first day of your first accounting period.",
        ],
        tasks: [
            { label: "Add an account", how: "'New Account' → name, code, type (Asset/Income/etc.), optional parent account" },
            { label: "Deactivate an unused account", how: "Click the account → toggle Active to Off (preserves history)" },
            { label: "View account balances", how: "Reports → Trial Balance → select period" },
        ],
    },
    "/finances/reports": {
        title: "Financial Reports",
        summary: "Generate and export the church's standard financial statements — Income & Expenditure, Balance Sheet, Trial Balance, Giving Summary, Budget vs. Actual and more. All reports pull live data from posted transactions.",
        tips: [
            "Always lock the accounting period before generating an official report — locking prevents retroactive changes.",
            "Income & Expenditure (I&E) shows all income and expenses for a period — the primary report for leadership.",
            "Trial Balance confirms that debits equal credits across all accounts — run it at month-end as a sanity check.",
            "Budget vs. Actual compares planned spend to real spend — use it to flag overspending early.",
            "Giving Summary can be exported per member for annual giving acknowledgements.",
        ],
        tasks: [
            { label: "Generate Income & Expenditure report", how: "Reports → Income & Expenditure → select period → Generate" },
            { label: "Run a Trial Balance", how: "Reports → Trial Balance → select period → verify debits = credits" },
            { label: "Budget vs. Actual", how: "Reports → Budget vs. Actual → select year or period" },
            { label: "Member giving statement", how: "Reports → Giving Summary → select member and year → Export" },
            { label: "Export any report", how: "Generate the report → Export CSV or Export PDF button" },
        ],
    },
    "/finances/bank-import-profiles": {
        title: "Bank Import Profiles",
        summary: "Configure column mappings for importing bank statement CSV files. Each bank exports statements in a different column order — save a named profile per bank so future imports reuse the same mapping without reconfiguration.",
        tips: [
            "Create one profile per bank account type — the column layout rarely changes, so a saved profile saves time on every import.",
            "Map at minimum: date, description and amount columns. Reference and balance columns are optional but useful.",
            "Test a new profile with a small sample file before importing a full month's statement.",
            "If your bank changes its export format, update the profile rather than creating a new one.",
        ],
        tasks: [
            { label: "Create a new import profile", how: "'New Profile' → name the bank, then map each column to the correct field → Save" },
            { label: "Edit an existing profile", how: "Click the profile row → update column mappings → Save" },
            { label: "Use a profile for an import", how: "Go to Bank Reconciliation → Import Statement → select this profile" },
        ],
    },
    "/finances/external-payees": {
        title: "External Payees",
        summary: "Manage the list of vendors, contractors and organisations the church makes payments to. Payees are referenced in petty cash vouchers, journal entries and finance requests so spending is consistently attributed to the correct party.",
        tips: [
            "Add payees before creating vouchers or requests — entries must reference an existing payee.",
            "Include the bank account or payment details in the payee record to speed up payment processing.",
            "One payee record covers all transactions to that party — do not create duplicates.",
            "Mark a payee as inactive if the relationship has ended; this preserves their transaction history without exposing them in dropdowns.",
        ],
        tasks: [
            { label: "Add a new payee", how: "'New Payee' → name, contact details, optional bank information → Save" },
            { label: "Edit payee details", how: "Click the payee row → update fields → Save" },
            { label: "Deactivate a payee", how: "Click the payee → toggle Active to Off" },
            { label: "View payments to a payee", how: "Open the payee → Transactions tab → filter by date range" },
        ],
    },
    "/finances/funds": {
        title: "Funds",
        summary: "Manage designated and restricted funds — money given for a specific purpose such as a Building Fund, Mission Fund or Welfare Fund. Each fund tracks its own contributions and disbursements separately from the general account, giving clear visibility of how restricted money is being used.",
        tips: [
            "A Restricted fund must only be spent on its stated purpose — disbursements are tracked against it.",
            "A Designated fund is internally earmarked but has more flexibility — leadership can redirect it if needed.",
            "Link offerings and tithe batches to a fund at the point of recording to build up the fund balance automatically.",
            "Disbursements from a fund should reference it in the journal entry so the fund balance reduces correctly.",
            "Run a Fund Statement to show contributors the balance and how their gifts have been used.",
        ],
        tasks: [
            { label: "Create a new fund", how: "'New Fund' → name, type (Restricted/Designated), description → Save" },
            { label: "Record a contribution to a fund", how: "When recording an offering or tithe, select the fund in the Fund field" },
            { label: "Record a disbursement from a fund", how: "Create a journal entry and reference the fund on the debit line" },
            { label: "View fund balance and history", how: "Click the fund → Balance tab shows running total; Transactions tab shows all entries" },
            { label: "Generate a fund statement", how: "Reports → Fund Statement → select fund and date range → Export" },
        ],
    },
    "/finances/reconciliation": {
        title: "Bank Reconciliation",
        summary: "Match the church's internal transaction records against the bank statement to confirm they agree. Reconciliation should be performed at the end of each accounting period. Unmatched items — transactions in the system but not on the statement, or vice versa — are flagged for investigation.",
        tips: [
            "Download your bank statement as a CSV before starting — use a Bank Import Profile to load it.",
            "Auto-match compares amounts and dates; manually match anything the system couldn't pair automatically.",
            "Outstanding items (on one side only) must be explained — they are either timing differences or errors.",
            "Lock the reconciliation once complete to prevent changes to the matched transactions.",
            "A reconciliation that won't balance often points to a missing journal entry or a duplicate record.",
        ],
        tasks: [
            { label: "Import a bank statement", how: "'Import Statement' → select a Bank Import Profile → upload CSV" },
            { label: "Auto-match transactions", how: "After import → 'Auto-Match' — the system pairs records by date and amount" },
            { label: "Manually match an item", how: "Click an unmatched system entry → click its counterpart in the bank list → Match" },
            { label: "Investigate an outstanding item", how: "Outstanding Items tab → review each entry → add a note explaining the difference" },
            { label: "Lock the reconciliation", how: "'Lock Reconciliation' once the difference is zero" },
        ],
    },
    "/finances/recurring-entries": {
        title: "Recurring Journal Entries",
        summary: "Define journal entries that repeat on a fixed schedule — monthly rent, regular salaries, standing orders or lease payments. The system generates the entries automatically on the configured date, eliminating manual re-entry and reducing the risk of missing a recurring obligation.",
        tips: [
            "Set the start date to the first day the entry should be created, and an end date if the obligation has a fixed term.",
            "Each generated entry still posts to the current open accounting period — ensure a period is open before the scheduled date.",
            "Review generated entries in the Journal Entries list; they are labelled 'Recurring' so they are easy to identify.",
            "Pause a recurring entry if the obligation is temporarily suspended — it won't generate until you resume it.",
            "Change the amount on the template if the recurring amount changes (e.g. a rent increase) — future entries pick up the new amount.",
        ],
        tasks: [
            { label: "Create a recurring entry", how: "'New Recurring Entry' → set debit/credit lines, frequency, start date and end date → Save" },
            { label: "Pause a recurring entry", how: "Click the entry → toggle Status to Paused" },
            { label: "Edit the amount or accounts", how: "Click the entry → update the template lines → Save (only affects future generations)" },
            { label: "View generated history", how: "Click the entry → Generated Entries tab" },
        ],
    },
    "/finances/requests": {
        title: "Finance Requests",
        summary: "Manage internal purchase and expense requests raised before funds are disbursed. A request captures what is needed, the estimated cost and the justification. It goes through an approval workflow — only approved requests proceed to payment. This gives leadership oversight of spending before money leaves the church.",
        tips: [
            "Raise a request before making any purchase above the petty cash limit — approval must come first.",
            "Attach quotes or supporting documents to the request so the approver has full context.",
            "Approved requests can be linked to a petty cash voucher or journal entry at payment time.",
            "Rejected requests should include a note explaining the reason — the requester is notified automatically.",
            "Track spending against budget by linking each approved request to the relevant budget category.",
        ],
        tasks: [
            { label: "Raise a finance request", how: "'New Request' → describe the need, enter amount, select category and payee → Submit" },
            { label: "Approve or reject a request", how: "Pending tab → open request → review → Approve or Reject with a note" },
            { label: "Link an approved request to payment", how: "Open the approved request → 'Create Voucher' or 'Create Journal Entry'" },
            { label: "View all requests by status", how: "Filter bar → select Pending / Approved / Rejected / Paid" },
        ],
    },

    // ── Profile & settings ─────────────────────────────────────────────────────

    "/profile": {
        title: "My Profile",
        summary: "View your admin account details — personal information pulled from your member record, your assigned role and the full list of permissions that role grants. Permissions shown here determine exactly which sections of the portal you can access.",
        tips: [
            "Your profile details come from your member record. Ask another admin to update your name, phone or other personal fields in the Members module.",
            "Permissions with a green tick are active on your account. Greyed-out permissions require a role change — contact a super-admin.",
            "Your role is assigned by another admin. If your permissions seem wrong, ask the admin who manages access to review your role.",
            "Use the Change Password button to update your portal login password at any time.",
        ],
        tasks: [
            { label: "Change your password", how: "Change Password button at the top right of this page" },
            { label: "Update your personal details", how: "Ask an admin with Members Write permission to edit your member record" },
            { label: "Request additional permissions", how: "Ask a super-admin to update your role or create a new role with the required permissions" },
        ],
    },
    "/system-settings": {
        title: "Module Settings",
        summary: "Enable or disable individual modules across the portal. Turning a module off hides it from the sidebar and removes its routes — useful for churches that don't use every feature. Required modules cannot be disabled.",
        tips: [
            "Disabling a module only hides the UI — it does not delete existing data. Re-enabling it restores full access.",
            "Required modules (marked with a lock icon) cannot be toggled — they are essential for the portal to function correctly.",
            "Changes take effect immediately for all admins without a page refresh.",
            "Only admins with Admin Write permission can change module settings.",
        ],
        tasks: [
            { label: "Disable a module", how: "Toggle the switch on the module row to Off — confirms immediately" },
            { label: "Re-enable a module", how: "Toggle the switch back to On — the module reappears in the sidebar" },
            { label: "Check if a module is required", how: "Required modules show a lock icon and their toggle is disabled" },
        ],
    },

    // ── System pages ───────────────────────────────────────────────────────────

    "/audit-logs": {
        title: "Audit Trail",
        summary: "A complete, immutable record of every admin action taken in the portal — logins, record creation, edits, status changes and permission updates. The audit trail cannot be edited or deleted; it is the authoritative log for accountability and compliance reviews.",
        tips: [
            "Filter by admin name to review everything a specific person has done.",
            "Filter by action type (Create, Update, Delete, Login) to narrow to a specific category of change.",
            "Use the date range filter when investigating an incident — narrow to the window when something changed.",
            "The 'Before' and 'After' columns show exactly what changed in each update, so you can see the old value and the new value side by side.",
            "Audit logs are read-only — if you need to act on something you find, make the correction in the relevant module.",
        ],
        tasks: [
            { label: "Find actions by a specific admin", how: "Admin filter → select the admin's name → apply" },
            { label: "Investigate a specific change", how: "Filter by date range and action type → open the log row to see Before/After values" },
            { label: "Export the audit trail", how: "Apply filters to the date range you need → Export CSV" },
        ],
    },
    "/email-logs": {
        title: "Email Logs",
        summary: "View all system-generated emails sent to members and admins — password resets, announcement notifications, follow-up task reminders, birthday emails and more. Use this page to confirm whether an email was sent and, if so, when.",
        tips: [
            "Email logs show sent status only — they confirm the system dispatched the email but cannot confirm delivery to the recipient's inbox.",
            "If a member reports not receiving a notification, check here first to confirm the email was sent and to which address.",
            "Filter by recipient email or template type to find a specific message quickly.",
            "Bounced or failed sends are flagged — common causes are invalid email addresses in the member profile.",
            "Email logs are read-only. To resend, trigger the action again from the relevant module (e.g. re-send a password reset from Admin Management).",
        ],
        tasks: [
            { label: "Confirm an email was sent", how: "Search the recipient's email address → check the sent timestamp" },
            { label: "Find emails of a specific type", how: "Template filter → select the email type (e.g. Password Reset, Announcement)" },
            { label: "Investigate a failed send", how: "Filter Status → Failed → open the row to see the error reason" },
        ],
    },
    "/sms-logs": {
        title: "SMS Logs",
        summary: "View delivery history for every SMS sent from Announcements — this page reads live from the SMS provider (Termii), it is not a locally stored record, so it always reflects the provider's current data.",
        tips: [
            "This is a live query to the SMS provider on every refresh — there's no local copy, so results may take a moment to load for a long history.",
            "Status values (e.g. Delivered, Sent, Failed) come directly from the provider and aren't standardised by this app — the status filter's options are built from whatever values have actually appeared.",
            "Click a row to see the full message text, timestamp, and message ID in the detail panel.",
            "If a recipient says they didn't get a text, search their phone number here first to confirm what the provider recorded.",
        ],
        tasks: [
            { label: "Check if an SMS was delivered", how: "Filters → Recipient → enter the phone number → Apply" },
            { label: "Find all failed sends", how: "Filters → Status → select the failed/undelivered value seen in your data → Apply" },
            { label: "Refresh with the latest provider data", how: "Refresh button, top right" },
        ],
    },
    "/incident-reports": {
        title: "Incident Reports",
        summary: "Review and manage incidents submitted by members through the member app. Each report has a title, description, optional location and images, and a status — Open, In Progress or Resolved. Anonymous reports are supported; when a member chooses anonymity their identity is hidden from this view.",
        tips: [
            "Anonymous reports show no reporter details — this is intentional and cannot be overridden.",
            "Move a report to In Progress as soon as someone is actively investigating it, so the congregation knows it has been seen.",
            "Use the Admin Notes field to record investigation findings, actions taken or the outcome — these notes are internal only.",
            "Setting status to Resolved automatically stamps the resolved date on the record.",
            "Filter by status to triage the queue: start with Open, then In Progress, then review Resolved for pattern spotting.",
            "Only admins with the Incident Report Write permission can change status — read-only admins can view but not update.",
        ],
        tasks: [
            { label: "Review a new report", how: "Click the report row → full details open in the right panel" },
            { label: "Update the status", how: "Right panel → Status dropdown → select In Progress or Resolved → add Admin Notes → Save" },
            { label: "Filter by status", how: "Status filter above the table → select Open / In Progress / Resolved" },
            { label: "Filter by date range", how: "From / To date inputs above the table → apply to narrow to a time window" },
        ],
    },

    // ── Bulk operation pages ───────────────────────────────────────────────────

    "/members/bulk-promote": {
        title: "Bulk Promote to Workers",
        summary: "Promote multiple active members to workers in a single action. Select the members you want to promote, confirm the list, and each member gets a worker profile created automatically. You will assign departments to the newly created workers afterwards from the Workers page.",
        tips: [
            "Only Active members can be promoted — Inactive members are filtered out automatically.",
            "Members who are already workers are excluded from the selection list.",
            "Department assignment happens after the bulk promotion — newly promoted workers appear in the Workers list without a department until you assign one.",
            "Promotions cannot be undone in bulk — if you promoted someone by mistake, go to their worker profile and deactivate it.",
        ],
        tasks: [
            { label: "Bulk promote members", how: "Tick the checkboxes next to each member → click 'Promote Selected' → confirm" },
            { label: "Assign departments after promotion", how: "Go to Workers → filter by 'No Department' → open each worker → assign department" },
        ],
    },
    "/workers/bulk-department": {
        title: "Bulk Assign Department",
        summary: "Move multiple workers to a new department in one action — useful after a departmental restructure or when onboarding a group of new workers who all belong to the same team.",
        tips: [
            "Each worker can only belong to one department — bulk assigning overwrites their current department.",
            "Filter the worker list by their current department before selecting to avoid accidentally reassigning people from different teams.",
            "Affected workers will appear under the new department immediately across the portal (prayer rosters, reports, filters).",
        ],
        tasks: [
            { label: "Bulk assign workers to a department", how: "Tick the workers to move → select the target department from the dropdown → Apply" },
        ],
    },
    "/classes/bulk-enroll": {
        title: "Bulk Enrol",
        summary: "Enrol multiple members into a Bible class simultaneously instead of one by one. Search and select the members you want to add, then confirm to enrol them all in a single action.",
        tips: [
            "Members already enrolled in this class are excluded from the selection list to prevent duplicates.",
            "A member can be enrolled in multiple classes — this page does not limit class membership.",
            "If you need to enrol a large group (e.g. after a new intake), use this page rather than adding members individually.",
        ],
        tasks: [
            { label: "Enrol multiple members", how: "Search and tick members → 'Enrol Selected' → confirm" },
            { label: "Return to the class", how: "Use the breadcrumb at the top or the Back button" },
        ],
    },

    // ── Leave management ───────────────────────────────────────────────────────

    "/leave": {
        title: "Worker Leave",
        summary: "Review and manage leave requests submitted by workers. Workers request time off through the member app; those requests appear here for admin review. Approved leave is factored into scheduling so workers on leave are not assigned duties during their absence.",
        tips: [
            "Review Pending requests promptly — workers may be waiting for confirmation before making plans.",
            "Rejected requests should include a reason so the worker understands and can resubmit if appropriate.",
            "Approved leave automatically prevents the worker from being auto-assigned to prayer roster slots during that period.",
            "Filter by status (Pending / Approved / Rejected) to focus on what needs action.",
            "Use the date range filter to check who is on leave during a specific period before finalising rosters.",
        ],
        tasks: [
            { label: "Approve a leave request", how: "Click the request row → review dates and reason → 'Approve'" },
            { label: "Reject a leave request", how: "Click the request row → 'Reject' → enter a reason" },
            { label: "Check who is on leave for a date", how: "Date filter → enter the date range → filter Status to Approved" },
        ],
    },
};

const DEFAULT_HELP: PageHelp = {
    title: "Admin Portal",
    summary: "Use the sidebar to navigate between modules. Click the ? button on any page to get tips for what you are currently looking at.",
    tips: [
        "The sidebar can be collapsed with the ‹ arrow to give more space.",
        "Your session stays active as long as the browser tab is open.",
    ],
    tasks: [],
};

function getHelp(pathname: string): PageHelp {
    if (HELP[pathname]) return HELP[pathname];
    const match = Object.keys(HELP)
        .filter((k) => pathname.startsWith(k))
        .sort((a, b) => b.length - a.length)[0];
    return match ? HELP[match] : DEFAULT_HELP;
}

// ─── Tour module list ──────────────────────────────────────────────────────────

const TOUR_MODULES = [
    {
        emoji: "📊",
        name: "Dashboard",
        desc: "A live overview of attendance, finances, upcoming events and member birthdays.",
    },
    {
        emoji: "📅",
        name: "Events",
        desc: "Schedule services, record headcount, build service programmes and manage the prayer roster.",
    },
    {
        emoji: "👥",
        name: "People",
        desc: "Manage the congregation — members, workers, attendance records and birthdays.",
    },
    {
        emoji: "🎤",
        name: "Ministry",
        desc: "Departments, Bible classes, Children's Church, Sunday School and member follow-up.",
    },
    {
        emoji: "📢",
        name: "Announcements",
        desc: "Send messages to all members, specific roles or individual people via the member app.",
    },
    {
        emoji: "🏛️",
        name: "Facility",
        desc: "Manage church rooms, equipment inventory and handle external facility booking requests.",
    },
    {
        emoji: "💰",
        name: "Finances",
        desc: "Full church accounting — tithes, offerings, journal entries, budgets, reconciliation and reports.",
    },
];

// ─── Welcome Tour ──────────────────────────────────────────────────────────────

const WELCOMED_KEY = "dh_admin_welcomed";

export function WelcomeTour({ onClose }: Readonly<{ onClose: () => void }>) {
    const dismiss = useCallback(() => {
        localStorage.setItem(WELCOMED_KEY, "1");
        onClose();
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-[#121212]/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#FFFFFF] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-[#121212] px-7 py-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Welcome</p>
                    <h2 className="text-2xl font-light text-[#FFFFFF] tracking-tight">
                        Admin Portal Guide
                    </h2>
                    <p className="text-xs text-[#8A817C] font-light mt-1">
                        Here&apos;s a quick look at what you can do from here.
                    </p>
                </div>

                {/* Module list */}
                <div className="px-7 py-5 space-y-3 max-h-[55vh] overflow-y-auto">
                    {TOUR_MODULES.map((m) => (
                        <div key={m.name} className="flex gap-3 items-start">
                            <span className="text-xl shrink-0 mt-0.5">{m.emoji}</span>
                            <div>
                                <p className="text-xs font-semibold text-[#121212] uppercase tracking-wider">{m.name}</p>
                                <p className="text-xs text-[#8A817C] font-light mt-0.5 leading-relaxed">{m.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-[#121212]/5 flex items-center justify-between gap-3">
                    <p className="text-[10px] text-[#8A817C] font-light">
                        Click <span className="font-semibold">?</span> in the header any time to get help for the current page.
                    </p>
                    <button
                        onClick={dismiss}
                        className="flex items-center gap-1.5 h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/80 transition-colors shrink-0"
                    >
                        Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Help Drawer ───────────────────────────────────────────────────────────────

export function HelpDrawer({
    isOpen,
    onClose,
    onShowTour,
}: Readonly<{
    isOpen: boolean;
    onClose: () => void;
    onShowTour: () => void;
}>) {
    const pathname = usePathname();
    const help = getHelp(pathname);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close help drawer"
                className="fixed inset-0 z-40 bg-[#121212]/20 cursor-default"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-80 bg-[#FFFFFF] border-l border-[#121212]/10 z-50 flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5 shrink-0">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Help</p>
                        <h2 className="text-base font-light text-[#121212] tracking-tight">{help.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212]/20 rounded-md transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                    {/* Summary */}
                    <p className="text-xs text-[#121212] font-light leading-relaxed">{help.summary}</p>

                    {/* Tips */}
                    {help.tips.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Tips</p>
                            <ul className="space-y-2">
                                {help.tips.map((tip) => (
                                    <li key={tip} className="flex gap-2 items-start">
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        <span className="text-xs text-[#121212] font-light leading-relaxed">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Common tasks */}
                    {help.tasks.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Common Tasks</p>
                            <div className="space-y-2">
                                {help.tasks.map((t) => (
                                    <div key={t.label} className="bg-[#F4F1EA]/50 border border-[#121212]/5 rounded-lg px-3 py-2.5">
                                        <p className="text-[11px] font-semibold text-[#121212]">{t.label}</p>
                                        <p className="text-[11px] text-[#8A817C] font-light mt-0.5">{t.how}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[#121212]/5 shrink-0">
                    <button
                        onClick={() => { onClose(); onShowTour(); }}
                        className="flex items-center gap-1.5 text-[11px] text-[#8A817C] hover:text-[#121212] font-semibold uppercase tracking-wider transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Show welcome guide again
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Combined system (manages state) ──────────────────────────────────────────

export function useHelpSystem() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [tourOpen, setTourOpen] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(WELCOMED_KEY)) {
            setTourOpen(true);
        }
    }, []);

    const openDrawer = useCallback(() => setDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setDrawerOpen(false), []);
    const openTour = useCallback(() => setTourOpen(true), []);
    const closeTour = useCallback(() => {
        localStorage.setItem(WELCOMED_KEY, "1");
        setTourOpen(false);
    }, []);

    return { drawerOpen, tourOpen, openDrawer, closeDrawer, openTour, closeTour };
}
