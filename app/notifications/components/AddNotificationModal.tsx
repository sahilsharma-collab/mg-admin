"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, MailPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "react-toastify";
import { apiFetch, withQuery } from "@/lib/api";

interface AddNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNotificationAdded: () => void;
}

/**
 * The phrase the operator has to type out before the broadcast unlocks.
 *
 * A yes/no dialog is the right weight for one row: the operator can undo a
 * mistake by deleting it. This is not that. One POST fans out a push to every
 * registered user, there is no draft, no scheduling and no recall endpoint — so
 * the only place this can be stopped is here, before the click. A second
 * "Confirm" button next to the first is exactly what muscle memory defeats, so
 * the gate is something the hands cannot do absent-mindedly: read the preview,
 * read the count, type the word.
 */
export const CONFIRM_PHRASE = "SEND";

type Stage = "compose" | "confirm";

export const AddNotificationModal: React.FC<AddNotificationModalProps> = ({
    isOpen,
    onClose,
    onNotificationAdded,
}) => {
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState<Stage>("compose");
    const [confirmText, setConfirmText] = useState("");
    const [audience, setAudience] = useState<number | null>(null);
    const [audienceLoading, setAudienceLoading] = useState(false);
    const [notificationData, setNotificationData] = useState({
        title: "",
        body: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNotificationData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    // Closing always drops back to the compose stage with the phrase cleared.
    // Otherwise a modal reopened after a cancel would come back already armed,
    // which is the muscle-memory hazard this whole step exists to remove.
    const closeAndReset = () => {
        setStage("compose");
        setConfirmText("");
        setAudience(null);
        onClose();
    };

    // How many people this actually reaches. Read from the same paginated
    // listing the users table uses (app/users/components/client.tsx:53-104):
    // one row is enough, the count lives in the pagination envelope.
    const loadAudience = async () => {
        try {
            setAudienceLoading(true);
            const response = await apiFetch(
                withQuery("/api/profile/paginated/all", { page: 1, limit: 1 }),
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            const data = await response.json();
            const total = Number(data?.pagination?.totalUsers);
            setAudience(Number.isFinite(total) ? total : null);
        } catch (error) {
            // A missing count is not a reason to block the broadcast, but it is
            // a reason not to invent one: the confirm step says "every
            // registered user" instead of a number it cannot vouch for.
            console.error("Error counting notification recipients:", error);
            setAudience(null);
        } finally {
            setAudienceLoading(false);
        }
    };

    const handleReview = () => {
        if (!notificationData.title.trim() || !notificationData.body.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        setConfirmText("");
        setStage("confirm");
        loadAudience();
    };

    const handleSubmit = async () => {
        // Belt and braces: the button is disabled without the phrase, but the
        // send must not be reachable without it even if the button is not.
        if (confirmText.trim().toUpperCase() !== CONFIRM_PHRASE) {
            toast.error(`Type ${CONFIRM_PHRASE} to confirm this broadcast`);
            return;
        }

        if (!notificationData.title.trim() || !notificationData.body.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setLoading(true);
            const response = await apiFetch("/api/notification/send-notification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: notificationData.title,
                    body: notificationData.body,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to send notification");
            }

            toast.success("Notification sent successfully");
            onNotificationAdded();
            setNotificationData({ title: "", body: "" });
            closeAndReset();
        } catch (error) {
            console.error("Error sending notification:", error);
            toast.error("Failed to send notification");
        } finally {
            setLoading(false);
        }
    };

    const armed = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;
    const recipients = audienceLoading
        ? "counting recipients…"
        : audience === null
            ? "every registered user"
            : `all ${audience.toLocaleString()} registered users`;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                >
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                        className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-[90%] max-w-md"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {stage === "confirm" ? (
                                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                                ) : (
                                    <MailPlus className="h-6 w-6 text-blue-500" />
                                )}
                                <h3 className="text-lg font-semibold">
                                    {stage === "confirm"
                                        ? "Confirm broadcast"
                                        : "Add New Notification"}
                                </h3>
                            </div>
                            <button
                                onClick={closeAndReset}
                                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                disabled={loading}
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {stage === "compose" ? (
                            <>
                                <div className="space-y-4 mb-4">
                                    <div>
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            id="title"
                                            name="title"
                                            value={notificationData.title}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] dark:bg-gray-800 dark:border-gray-600"
                                            placeholder="Notification title"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Message
                                        </label>
                                        <textarea
                                            id="body"
                                            name="body"
                                            value={notificationData.body}
                                            onChange={handleInputChange}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] dark:bg-gray-800 dark:border-gray-600"
                                            placeholder="Notification message"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={closeAndReset}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleReview}
                                        disabled={loading}
                                        className="bg-[#0ABAB5] hover:bg-[#089e99] flex items-center justify-center gap-2"
                                    >
                                        Review broadcast
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-4 mb-4">
                                    {/* What is actually going out, verbatim. */}
                                    <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                            Preview
                                        </p>
                                        <p className="text-sm font-semibold break-words">
                                            {notificationData.title}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line break-words">
                                            {notificationData.body}
                                        </p>
                                    </div>

                                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                            This sends a push notification to{" "}
                                            <span className="font-semibold">{recipients}</span>.
                                            It is delivered immediately and cannot be edited,
                                            recalled or undone.
                                        </p>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="confirmPhrase"
                                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                        >
                                            Type {CONFIRM_PHRASE} to confirm
                                        </label>
                                        <input
                                            type="text"
                                            id="confirmPhrase"
                                            name="confirmPhrase"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            onKeyDown={(e) => {
                                                // Enter from this field is a
                                                // deliberate act — the phrase
                                                // had to be typed first — and
                                                // it is the path that makes the
                                                // guard in handleSubmit real
                                                // rather than decorative.
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    void handleSubmit();
                                                }
                                            }}
                                            autoComplete="off"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ABAB5] dark:bg-gray-800 dark:border-gray-600"
                                            placeholder={CONFIRM_PHRASE}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setStage("compose");
                                            setConfirmText("");
                                        }}
                                        disabled={loading}
                                    >
                                        Back to editing
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={loading || !armed}
                                        variant="destructive"
                                        className="flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Sending</span>
                                            </>
                                        ) : (
                                            "Send Notification"
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
