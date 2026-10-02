export type TxType = "expense" | "income";
export type LoanDirection = "given" | "taken";
export type LoanStatus = "open" | "partial" | "closed" | "overdue";

export interface Category { id:string; name:string; icon?:string; isDefault?:boolean }
export interface PaymentMethod { id:string; name:string; isDefault?:boolean }
export interface Source { id:string; name:string; isDefault?:boolean }
export interface Tag { id:string; name:string; categoryId?:string; isDefault?:boolean; createdAt?:string; deletedAt?:string }

export interface Transaction {
  id:string; type:TxType; amount:number; categoryId:string; paymentMethodId:string; date:string;
  remarks?:string; tags?:string[]; source?:string; fromSavings?:boolean; createdAt:string; updatedAt:string;
}
export interface Party { id:string; name:string; phone?:string; note?:string }
export interface Loan {
  id:string; partyId:string; direction:LoanDirection; principal:number; startDate:string; dueDate?:string;
  purpose?:string; note?:string; tags?:string[]; paymentMethodId?:string; createdAt:string; updatedAt:string;
}
export interface Repayment { id:string; loanId:string; amount:number; date:string; paymentMethodId:string; note?:string; createdAt:string }
export interface Settings { appLockEnabled:boolean; lastUnlockedAt?:number; userName?:string }

export interface BackupPayload {
  appVersion:string;
  schemaVersion:number;
  timestamp:string;
  data:{
    categories:Category[]; methods:PaymentMethod[]; sources:Source[]; tags:Tag[];
    transactions:Transaction[]; parties:Party[]; loans:Loan[]; repayments:Repayment[]; settings:Settings;
  };
  extras?:Record<string,unknown>;
}
