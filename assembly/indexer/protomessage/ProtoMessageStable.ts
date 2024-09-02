import { AtomicTransaction } from "metashrew-as/assembly/indexer/atomic";
import { MessageContext } from "./MessageContext";

export class ProtoMessage {
  runtime: AtomicTransaction = new AtomicTransaction();

  constructor(runtime: AtomicTransaction) {
    this.runtime = runtime;
  }

  handleBorrow(context: MessageContext): void {
    // Decode borrowing details from the message (not fully implemented here)
    const usdAmount: u128 = u128.Zero; // Replace with actual decoding logic
    for (let i = 0; i < context.runes.length; i++) {
      if (context.runes[i].borrow(usdAmount)) {
        console.log("Borrowing successful for USD amount: " + usdAmount.toString());
      } else {
        console.log("Borrowing failed due to insufficient collateral");
      }
    }
  }

  handleLiquidation(context: MessageContext): void {
    context.handleLiquidation();
  }

  handle(context: MessageContext): void {
    // Handle new messages (borrow and liquidation)
    this.handleBorrow(context);
    this.handleLiquidation(context);

    // Existing logic for processing other message types
  }
}
