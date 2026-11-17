import { CONFIG } from '../config';

export interface PriceBreakdown {
  durationHours: number;
  hourlyRate: number;
  rentalAmount: number;
  receiverFee: number;
  lenderFee: number;
  securityDeposit: number;
  deliveryFee: number;
  totalPayableAmount: number;
  lenderEarnings: number;
  platformRevenue: number;
}

export class PricingService {
  /**
   * Calculates detailed rental quote
   * @param hourlyRate - Price per hour set by owner
   * @param durationHours - Billable hours (can be fractional, e.g., 2.5 for 2 hrs 30 mins)
   * @param securityDeposit - Refundable security deposit
   * @param isDelivery - Whether doorstep delivery is selected
   * @param itemDeliveryFee - Owner's delivery charge
   * @param minHours - Minimum hours mandated by item listing
   */
  public static calculateRentalQuote(
    hourlyRate: number,
    durationHours: number,
    securityDeposit: number,
    isDelivery: boolean = false,
    itemDeliveryFee: number = 0,
    minHours: number = 1
  ): PriceBreakdown {
    const effectiveHours = Math.max(durationHours, minHours);
    const rentalAmount = Math.round(effectiveHours * hourlyRate);
    const receiverFee = CONFIG.DEFAULT_RECEIVER_COMMISSION;
    const lenderFee = CONFIG.DEFAULT_LENDER_COMMISSION;
    const deliveryFee = isDelivery ? itemDeliveryFee : 0;

    // Zero security deposit for borrower: BorrowCircle is 100% deposit-free.
    // Borrower strictly pays only rental charges + platform fee (+ deliveryFee if selected).
    const totalPayableAmount = rentalAmount + receiverFee + deliveryFee;
    const lenderEarnings = Math.max(0, rentalAmount - lenderFee);
    const platformRevenue = receiverFee + lenderFee;

    return {
      durationHours: effectiveHours,
      hourlyRate,
      rentalAmount,
      receiverFee,
      lenderFee,
      securityDeposit: 0,
      deliveryFee,
      totalPayableAmount,
      lenderEarnings,
      platformRevenue
    };
  }

  /**
   * Calculates actual usage billing based on real timestamps
   */
  public static calculateActualUsage(
    startTime: Date,
    endTime: Date,
    hourlyRate: number,
    minHours: number = 1
  ): { elapsedHours: number; billableHours: number; actualRentalAmount: number } {
    const elapsedMs = Math.max(0, endTime.getTime() - startTime.getTime());
    const elapsedMinutes = Math.ceil(elapsedMs / (1000 * 60));
    const rawHours = elapsedMinutes / 60;
    const billableHours = Math.max(rawHours, minHours);
    const actualRentalAmount = Math.round(billableHours * hourlyRate);

    return {
      elapsedHours: Number(rawHours.toFixed(2)),
      billableHours: Number(billableHours.toFixed(2)),
      actualRentalAmount
    };
  }
}
