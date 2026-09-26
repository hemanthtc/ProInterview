export type AccountType = "user" | "admin" | "employee";
export type AuthFlowType = "register" | "login" | "forgot_password";
export type LoginMode = "user" | "organization";
export type OrgSubMode = "admin" | "employee";

export interface AuthSuccessUser {
    displayName: string;
    identifier: string;
    isOrganization: boolean;
    orgRole: AccountType;
    subscriptionPlan?: string;
    createdAt?: string | Date;
    organizationName?: string;
    department?: string;
    adminId?: string;
}

export interface OtpSendResponse {
    success: true;
    message: string;
    accountType?: AccountType;
    /** Only returned for non-email (e.g. phone demo) — never for email OTP */
    otpCode?: string;
}
