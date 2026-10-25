/**
 * Tab-scoped session coordination and initialization.
 * Ensures each browser tab maintains an independent identity and prevents
 * accidental credential leakage when tabs are duplicated or newly opened.
 */

const TAB_ID_KEY = "__prointerview_tab_id__";
const TAB_CHANNEL_NAME = "prointerview_tab_channel";

export const TAB_AUTH_KEYS = [
    "userLoggedIn",
    "sessionToken",
    "userSessionExpiresAt",
    "userName",
    "userIdentifier",
    "userType",
    "userRole",
    "userSubscriptionPlan",
    "userProfilePhoto",
    "userOrgName",
    "userAdminId",
    "userDepartment",
    "userAdditionalEmail",
    "userGithub",
    "userLinkedin",
    "userPortfolio",
    "userResumeCvName",
    "userResumeCvText",
    "userPhone",
    "userEducationData",
];

export const DEVICE_PREF_KEYS = [
    "appUsersDb",
    "globalTheme",
    "globalInterviewMode",
];

let currentTabId: string | null = null;
let tabCoordinationInitialized = false;

function generateUniqueTabId(): string {
    const rand = Math.random().toString(36).slice(2, 10);
    const time = Date.now().toString(36);
    return `prointerview_tab_${time}_${rand}`;
}

export function resetTabSessionForTesting(): void {
    currentTabId = null;
    tabCoordinationInitialized = false;
}

/**
 * Initializes and verifies tab ownership.
 * Differentiates same-tab refreshes/navigation from newly opened or duplicated tabs.
 */
export function initTabSession(forceReset?: boolean): string {
    if (typeof window === "undefined") {
        return "prointerview_tab_server";
    }

    const windowName = typeof window.name === "string" ? window.name : "";

    if (currentTabId && tabCoordinationInitialized && !forceReset) {
        if (windowName === currentTabId) {
            return currentTabId;
        }
    }

    const instanceId = Math.random().toString(36).slice(2);
    let storedTabId: string | null = null;
    try {
        storedTabId = sessionStorage.getItem(TAB_ID_KEY);
    } catch {}

    const isNamedTab = windowName.startsWith("prointerview_tab_");

    // Case 1: Same-tab refresh or same-tab navigation
    // Both window.name and sessionStorage match the existing tab ID
    if (isNamedTab && storedTabId && windowName === storedTabId) {
        currentTabId = storedTabId;
    } else {
        // Case 2: Newly opened tab (Ctrl+T, +, address bar, or link with target="_blank")
        // Browser may have cloned sessionStorage into this new tab, but window.name is empty or mismatched.
        const newTabId = generateUniqueTabId();
        currentTabId = newTabId;
        try {
            window.name = newTabId;
            sessionStorage.setItem(TAB_ID_KEY, newTabId);

            // Clean any cloned credentials from the previous tab to ensure an independent session
            TAB_AUTH_KEYS.forEach((key) => {
                sessionStorage.removeItem(key);
            });
        } catch {}
    }

    // Case 3: Set up BroadcastChannel to detect and resolve tab duplication
    if (typeof BroadcastChannel !== "undefined" && !tabCoordinationInitialized) {
        try {
            const channel = new BroadcastChannel(TAB_CHANNEL_NAME);

            // Respond to probes from other tabs: if another tab asks for our ID, let it know we are alive
            channel.onmessage = (event) => {
                const data = event.data;
                if (!data || typeof data !== "object") return;

                if (data.type === "PROBE_TAB_ID" && data.tabId === currentTabId && data.instanceId !== instanceId) {
                    channel.postMessage({
                        type: "TAB_ID_CLAIMED",
                        tabId: currentTabId,
                        ownerInstanceId: instanceId,
                    });
                } else if (data.type === "TAB_ID_CLAIMED" && data.tabId === currentTabId && data.ownerInstanceId !== instanceId) {
                    // Another live tab already owned this tabId (this tab was duplicated)
                    const replacementTabId = generateUniqueTabId();
                    currentTabId = replacementTabId;
                    try {
                        window.name = replacementTabId;
                        sessionStorage.setItem(TAB_ID_KEY, replacementTabId);
                        TAB_AUTH_KEYS.forEach((key) => {
                            sessionStorage.removeItem(key);
                        });
                    } catch {}
                }
            };

            // Probe on startup to detect duplicate tabs
            channel.postMessage({
                type: "PROBE_TAB_ID",
                tabId: currentTabId,
                instanceId,
            });
        } catch {}
    }

    tabCoordinationInitialized = true;
    return currentTabId;
}

/**
 * Returns the active tab ID.
 */
export function getCurrentTabId(): string {
    if (currentTabId) return currentTabId;
    return initTabSession();
}
