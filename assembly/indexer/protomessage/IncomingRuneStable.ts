import { AtomicTransaction } from "metashrew-as/assembly/indexer/atomic";
import { RuneId } from "metashrew-runes/assembly/indexer/RuneId";
import { u128 } from "as-bignum/assembly";
import { MessageContext } from "./MessageContext";
import { ProtoruneTable } from "../tables/protorune";
import { fromArrayBuffer, toArrayBuffer } from "metashrew-runes/assembly/utils";
import { console } from "metashrew-as/assembly/utils";
import { encodeHexFromBuffer } from "metashrew-as/assembly/utils/hex";

export class IncomingRune {
  runeId: RuneId;
  amount: u128;
  depositAmount: u128;
  initialAmount: u128;
  pointer_index: i32 = -1;
  refund_pointer_index: i32 = -1;
  outpoint_index: i32 = -1;
  runtime: AtomicTransaction = new AtomicTransaction();
  context: MessageContext = changetype<MessageContext>(0);
  table: ProtoruneTable;
  usdDebt: u128 = new u128(0, 0); // New field to track borrowed USD rune

  constructor(
    context: MessageContext,
    runeId: RuneId,
    amount: u128,
    table: ProtoruneTable,
  ) {
    this.context = context;
    this.runeId = runeId;
    this.initialAmount = amount;
    this.amount = new u128(amount.lo, amount.hi);
    this.depositAmount = new u128(0, 0);
    this.table = table;
  }

  // Method to borrow USD rune
  borrow(usdAmount: u128): bool {
    // Calculate the collateralization ratio (e.g., 150%)
    const requiredCollateral = usdAmount * u128.from(1.5); // Example ratio
    if (this.amount < requiredCollateral) {
      return false; // Insufficient collateral
    }
    this.usdDebt += usdAmount;
    this.amount -= requiredCollateral; // Lock collateral
    // Mint and send USD rune to the user
    // (Add the minting logic for USD rune here)
    return true;
  }

  // Method to liquidate if collateralization drops below threshold
  liquidate(): bool {
    const currentCollateralValue = this.amount;
    const liquidationThreshold = this.usdDebt * u128.from(1.1); // Example threshold
    if (currentCollateralValue < liquidationThreshold) {
      // Perform liquidation logic
      // Seize collateral and repay debt
      // (Implement liquidation process here)
      return true;
    }
    return false;
  }

  // Other existing methods (refund, forward, deposit, etc.) remain the same

  deposit(value: u128): bool {
    const refundPtr = this.table.OUTPOINT_TO_RUNES.select(
      this.context.refund_pointer.toArrayBuffer(),
    ).keyword("/balances");
    const runePtr = this.table.OUTPOINT_TO_RUNES.select(
      this.context.refund_pointer.toArrayBuffer(),
    ).keyword("/runes");
    if (this.refund_pointer_index == -1) return false;
    const index = refundPtr.selectIndex(this.refund_pointer_index).unwrap();
    const runeId = this.context.runtime.get(
      runePtr.selectIndex(this.refund_pointer_index).unwrap(),
    );
    const currentValue = fromArrayBuffer(this.context.runtime.get(index));
    if (value > this.amount || value > currentValue) return false;
    const newValue: u128 = currentValue - value;
    if (newValue > u128.Zero) {
      this.context.runtime.set(index, toArrayBuffer(newValue));
    } else {
      this.context.runtime.set(index, new ArrayBuffer(0));
    }
    let toSet = this.context.table.RUNTIME_BALANCE.select(runeId);
    this.context.runtimeBalance.increase(runeId, value);
    this.amount = this.amount - value;
    this.depositAmount += value;
    return true;
  }

  // Implement repay method if needed
  repay(usdAmount: u128): bool {
    if (usdAmount > this.usdDebt) {
      return false; // Trying to repay more than the debt
    }
    this.usdDebt -= usdAmount;
    // Burn the repaid USD rune (add burning logic here)
    return true;
  }
}
