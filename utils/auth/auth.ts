export class VerifyUser {
    checkUserSession(callback: (isActive: boolean) => void): void {
        setTimeout(() => {
            callback(false);
        }, 3000);
    }

    checkUserRole(): void {
        // Role logic here
    }
}

export const authService = new VerifyUser();