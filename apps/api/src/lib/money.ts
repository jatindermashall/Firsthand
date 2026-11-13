import { config } from "./config.js";
/** Platform commission on a booking, from the business's agreed rate. Integer paise. */
export const platformCommission = (pricePaise: number, commissionBps: number) => Math.round((pricePaise * commissionBps) / 10000);
/** Recommender's share is always a share of platform revenue, never of the booking price. */
export const recommenderShare = (platformPaise: number) => Math.round((platformPaise * config.recommenderShareBps) / 10000);
