export class OtpService {
  /**
   * Generates a 6-digit OTP
   */
  public static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Simulates SMS delivery for development & testing
   */
  public static simulateSmsDispatch(phone: string, otp: string, purpose: string): void {
    console.log(`[SMS-GATEWAY-DEMO] To: ${phone} | Purpose: ${purpose} | OTP: ${otp} | Status: DISPATCHED (Simulation)`);
  }
}
