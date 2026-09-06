import { realtime } from "./Realtime";

export const initNotifications = () => {
  realtime.on("workflow.update", (payload) => {
    console.log("Workflow Updated:", payload);
  });

  realtime.on("payment.update", (payload) => {
    console.log("Payment Updated:", payload);
  });

  realtime.on("security.event", (payload) => {
    console.log("Security Event:", payload);
  });
};
