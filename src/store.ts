import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext } from "react";
import type {
  BackupPayload, Category, Loan, LoanStatus, Party, PaymentMethod,
  Repayment, Settings, Source, Tag, Transaction,
} from "./types";

export const PREFIX = "mml.v1.";
export const SAVINGS_SOURCE_ID = "src-savings";
export const SAVINGS_SOURCE_NAME = "Savings";

const CATEGORY_ORDER = [
  "Food","Health","Travel","Education","Mobile/Internet","Entertainment",
  "Caring/Sharing","Family","Friends","Business","Investment","Other",
];
const METHOD_ORDER = ["Cash","eSewa","Khalti","O-Wallet","Bank","Card"];
const DEFAULT_CATEGORIES: Category[] = CATEGORY_ORDER.map((name) => ({ id: slugify(name), name, isDefault: true }));
const DEFAULT_METHODS: PaymentMethod[] = METHOD_ORDER.map((name) => ({ id: slugify(name), name, isDefault: true }));
const DEFAULT_SOURCES: Source[] = [
  "Salary","Business","Freelance","Family","Friends","Girlfriend","Savings","Gift","Other",
].map((name) => ({ id: "src-" + name.toLowerCase().replace(/[^a-z]/g, "-"), name, isDefault: true }));

const CATEGORY_TAG_NAMES: Record<string,string[]> = {
  food:["Breakfast","Lunch","Dinner","Snacks","Tea/Coffee","Hotel/Restaurant","Junk Food","Water","Fruit"],
  mobileinternet:["Phone","Recharge","Data Pack","WiFi","Money Transfer","Accessories"],
  health:["Medicine","Treatment","Haircut","Personal Care"],
  education:["Stationery","Documents","Exam","Printing","Fees","Study Materials"],
  entertainment:["Subscription","Movie","Outing","Game"],
  investment:["IPO","Profit","Loss","Savings","Crypto","Fixed Deposit"],
  business:["IPO","Profit","Loss","Savings","Crypto","Fixed Deposit"],
  investmentbusiness:["IPO","Profit","Loss","Savings","Crypto","Fixed Deposit"],
  family:["Repair","Household","Support","Bills"],
  friends:["Hangout","Party","Tip","Help","Support","Gift"],
  travel:["Bus","Tempo","Flight","Fuel","Short Ride","Long Journey"],
  caringsharing:["Help","Support","Gift","Donation","Charity"],
  other:["Personal","Work","Emergency","Fine","Donation","Charity","Group"],
};
const DEFAULT_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map(x=>x.id));
const DEFAULT_METHOD_IDS = new Set(DEFAULT_METHODS.map(x=>x.id));
const DEFAULT_SOURCE_IDS = new Set(DEFAULT_SOURCES.map(x=>x.id));

export interface AppState {
  hydrated: boolean;
  categories: Category[];
  methods: PaymentMethod[];
  sources: Source[];
  tags: Tag[];
  transactions: Transaction[];
  parties: Party[];
  loans: Loan[];
  repayments: Repayment[];
  settings: Settings;
}
export interface AppActions {
  hydrate: () => Promise<void>;
  addTransaction: (t: Omit<Transaction,"id"|"createdAt"|"updatedAt">) => Promise<void>;
  updateTransaction: (id:string, patch:Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id:string) => Promise<void>;
  addLoan: (input:{direction:Loan["direction"];partyName:string;phone?:string;principal:number;startDate:string;dueDate?:string;purpose?:string;note?:string;paymentMethodId?:string}) => Promise<string>;
  updateLoan: (id:string, patch:Partial<Loan>) => Promise<void>;
  deleteLoan: (id:string) => Promise<void>;
  addRepayment: (r:Omit<Repayment,"id"|"createdAt">) => Promise<void>;
  addCategory: (name:string) => Promise<void>;
  removeCategory: (id:string) => Promise<void>;
  addMethod: (name:string) => Promise<void>;
  removeMethod: (id:string) => Promise<void>;
  addSource: (name:string) => Promise<void>;
  removeSource: (id:string) => Promise<void>;
  addTag: (name:string, categoryId?:string) => Promise<string>;
  removeTag: (id:string) => Promise<void>;
  setAppLockEnabled: (v:boolean) => Promise<void>;
  setUserName: (name:string) => Promise<void>;
  markUnlocked: () => Promise<void>;
  lockNow: () => Promise<void>;
  resetAll: () => Promise<void>;
  replaceSnapshot: (b:BackupPayload) => Promise<void>;
  mergeSnapshot: (b:BackupPayload) => Promise<void>;
}
export type Store = AppState & AppActions;

export const StoreContext = createContext<Store | null>(null);
export const useStore = () => {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreContext missing");
  return value;
};

export const slugify = (s:string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export const monthKey = (iso:string) => iso.slice(0,7);
export const formatMoney = (n:number) => new Intl.NumberFormat("en-IN",{maximumFractionDigits:2}).format(n);
export const formatRs = (n:number) => "Rs " + formatMoney(n);
export const formatDate = (iso:string) => new Date(iso).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
export const uid = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,10) + "-" + Math.random().toString(36).slice(2,8);

export const isSavingsIncome = (t:Transaction) => t.type === "income" && t.source === SAVINGS_SOURCE_ID;
export const isSavingsExpense = (t:Transaction) => t.type === "expense" && t.fromSavings === true;
export const calcSavingsBalance = (rows:Transaction[]) =>
  rows.reduce((v,t) => v + (isSavingsIncome(t) ? t.amount : isSavingsExpense(t) ? -t.amount : 0),0);
export const calcSavingsForMonth = (rows:Transaction[], m:string) =>
  rows.reduce((v,t) => v + (isSavingsIncome(t) && monthKey(t.date)===m ? t.amount : 0),0);
export const calcMonthlyRegular = (rows:Transaction[], m:string) => {
  let inc=0, exp=0;
  for (const t of rows) {
    if (monthKey(t.date)!==m || isSavingsIncome(t) || isSavingsExpense(t)) continue;
    if (t.type==="income") inc+=t.amount; else exp+=t.amount;
  }
  return {inc,exp,bal:inc-exp};
};
export const loanTotals = (loanId:string, repayments:Repayment[]) =>
  repayments.filter(r=>r.loanId===loanId).reduce((a,r)=>a+r.amount,0);
export const loanStatus = (loan:Loan, paid:number):LoanStatus => {
  const remaining=loan.principal-paid;
  if(remaining<=0)return "closed";
  if(loan.dueDate && new Date(loan.dueDate)<new Date())return "overdue";
  if(paid>0)return "partial";
  return "open";
};
export const overdueDays = (loan:Loan) => !loan.dueDate ? 0 : Math.max(0,Math.floor((Date.now()-new Date(loan.dueDate).getTime())/86400000));
export const allowedTagsForCategory = (categoryName?:string) => {
  if(!categoryName)return null;
  const key=categoryName.toLowerCase().replace(/[^a-z0-9]+/g,"");
  return CATEGORY_TAG_NAMES[key] ?? null;
};
export const categoryTagId = (categoryName:string,tagName:string) =>
  "tag-" + categoryName.toLowerCase().replace(/[^a-z0-9]+/g,"") + "-" + tagName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

async function getJSON<T>(key:string,fallback:T):Promise<T>{
  try{const raw=await AsyncStorage.getItem(PREFIX+key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}
}
async function setJSON(key:string,value:unknown){await AsyncStorage.setItem(PREFIX+key,JSON.stringify(value));}
const tombstoneKey=(name:string)=>"deleted"+name+"Ids";

function reorder<T extends {name:string}>(list:T[],order:string[]){
  const idx=new Map(order.map((n,i)=>[n.toLowerCase(),i])); const known:T[]=[]; const unknown:T[]=[];
  list.forEach(x=>(idx.has(x.name.toLowerCase())?known:unknown).push(x));
  known.sort((a,b)=>(idx.get(a.name.toLowerCase())??999)-(idx.get(b.name.toLowerCase())??999));
  return [...known,...unknown];
}
function dedupeByName<T extends {id:string;name:string;isDefault?:boolean}>(list:T[],defaults:Set<string>){
  const by=new Map<string,T>(); const remap=new Map<string,string>();
  for(const item of list){
    const key=item.name.trim().toLowerCase(),old=by.get(key);
    if(!old){by.set(key,item);continue;}
    const oldDef=defaults.has(old.id)||old.isDefault,itemDef=defaults.has(item.id)||item.isDefault;
    if(itemDef&&!oldDef){by.set(key,item);remap.set(old.id,item.id);} else remap.set(item.id,old.id);
  }
  return {list:[...by.values()],remap};
}

export async function loadAll():Promise<AppState>{
  let transactions=await getJSON<Transaction[]>("transactions",[]);
  let loans=await getJSON<Loan[]>("loans",[]);
  let repayments=await getJSON<Repayment[]>("repayments",[]);
  const parties=await getJSON<Party[]>("parties",[]);
  let categories=await getJSON<Category[]>("categories",DEFAULT_CATEGORIES);
  let methods=await getJSON<PaymentMethod[]>("methods",DEFAULT_METHODS);
  let sources=await getJSON<Source[]>("sources",DEFAULT_SOURCES);
  let tags=await getJSON<Tag[]>("tags",[]);
  const settings=await getJSON<Settings>("settings",{appLockEnabled:false});

  const tsCategories=new Set(await getJSON<string[]>(tombstoneKey("Category"),[]));
  const tsMethods=new Set(await getJSON<string[]>(tombstoneKey("Method"),[]));
  const tsSources=new Set(await getJSON<string[]>(tombstoneKey("Source"),[]));
  const tsTags=new Set(await getJSON<string[]>(tombstoneKey("Tag"),[]));

  categories=categories.filter(x=>!tsCategories.has(x.id));
  methods=methods.filter(x=>!tsMethods.has(x.id));
  sources=sources.filter(x=>!tsSources.has(x.id));
  for(const d of DEFAULT_CATEGORIES)if(!categories.some(x=>x.id===d.id))categories.push(d);
  for(const d of DEFAULT_METHODS)if(!methods.some(x=>x.id===d.id))methods.push(d);
  for(const d of DEFAULT_SOURCES)if(!sources.some(x=>x.id===d.id))sources.push(d);
  if(!sources.some(x=>x.id===SAVINGS_SOURCE_ID))sources.push({id:SAVINGS_SOURCE_ID,name:SAVINGS_SOURCE_NAME,isDefault:true});

  const cD=dedupeByName(categories,DEFAULT_CATEGORY_IDS); categories=reorder(cD.list,CATEGORY_ORDER);
  transactions=transactions.map(t=>cD.remap.has(t.categoryId)?{...t,categoryId:cD.remap.get(t.categoryId)!}:t);

  const mD=dedupeByName(methods,DEFAULT_METHOD_IDS); methods=reorder(mD.list,METHOD_ORDER);
  transactions=transactions.map(t=>mD.remap.has(t.paymentMethodId)?{...t,paymentMethodId:mD.remap.get(t.paymentMethodId)!}:t);
  loans=loans.map(l=>l.paymentMethodId&&mD.remap.has(l.paymentMethodId)?{...l,paymentMethodId:mD.remap.get(l.paymentMethodId)!}:l);
  repayments=repayments.map(r=>mD.remap.has(r.paymentMethodId)?{...r,paymentMethodId:mD.remap.get(r.paymentMethodId)!}:r);

  const sD=dedupeByName(sources,DEFAULT_SOURCE_IDS); sources=sD.list;
  transactions=transactions.map(t=>t.source&&sD.remap.has(t.source)?{...t,source:sD.remap.get(t.source)!}:t);

  const cleaned:Tag[]=[];const tagRemap=new Map<string,string>();const seen=new Map<string,string>();
  for(const t of tags){
    if(tsTags.has(t.id))continue;
    const key=(t.categoryId??"")+"::"+t.name.trim().toLowerCase();
    if(seen.has(key)){tagRemap.set(t.id,seen.get(key)!);continue;}
    seen.set(key,t.id);cleaned.push(t);
  }
  tags=cleaned;
  for(const cat of categories){
    const names=CATEGORY_TAG_NAMES[cat.name.toLowerCase().replace(/[^a-z0-9]+/g,"")]??[];
    for(const name of names){
      const id=categoryTagId(cat.name,name);
      const exists=tags.find(x=>x.id===id);
      if(exists){exists.isDefault=true;exists.categoryId=cat.id;continue;}
      tags.push({id,name,categoryId:cat.id,isDefault:true});
    }
  }
  transactions=transactions.map(t=>({...t,tags:(t.tags??[]).map(id=>tagRemap.get(id)??id).filter((x,i,a)=>a.indexOf(x)===i)}));
  loans=loans.map(l=>({...l,tags:(l.tags??[]).map(id=>tagRemap.get(id)??id).filter((x,i,a)=>a.indexOf(x)===i)}));

  const tagIds=new Set(tags.map(x=>x.id));const missing=new Set<string>();
  transactions.forEach(t=>(t.tags??[]).forEach(id=>{if(!tagIds.has(id)&&!tsTags.has(id))missing.add(id)}));
  loans.forEach(l=>(l.tags??[]).forEach(id=>{if(!tagIds.has(id)&&!tsTags.has(id))missing.add(id)}));
  for(const id of missing)tags.push({id,name:id.startsWith("tag-")?id.slice(4).replace(/-/g," "):id});

  await Promise.all([
    setJSON("categories",categories),setJSON("methods",methods),setJSON("sources",sources),setJSON("tags",tags),
    setJSON("transactions",transactions),setJSON("parties",parties),setJSON("loans",loans),setJSON("repayments",repayments)
  ]);
  return {hydrated:true,categories,methods,sources,tags,transactions,parties,loans,repayments,settings};
}

export function makeStore(initial:AppState,setState:React.Dispatch<React.SetStateAction<AppState>>):Store{
  let current=initial;
  const persist=async(patch:Partial<AppState>)=>{
    current={...current,...patch};setState(current);
    await Promise.all(Object.entries(patch).map(([k,v])=>setJSON(k,v)));
  };
  return {
    ...current,
    hydrate:async()=>{current=await loadAll();setState(current);},
    addTransaction:async input=>{const now=new Date().toISOString();await persist({transactions:[{...input,id:uid(),createdAt:now,updatedAt:now},...current.transactions]});},
    updateTransaction:async(id,patch)=>persist({transactions:current.transactions.map(t=>t.id===id?{...t,...patch,updatedAt:new Date().toISOString()}:t)}),
    deleteTransaction:async id=>persist({transactions:current.transactions.filter(t=>t.id!==id)}),
    addLoan:async input=>{
      const now=new Date().toISOString(),partyId=uid(),loanId=uid();
      await setJSON("parties",[...current.parties,{id:partyId,name:input.partyName,phone:input.phone}]);
      await persist({parties:[...current.parties,{id:partyId,name:input.partyName,phone:input.phone}],loans:[{id:loanId,partyId,direction:input.direction,principal:input.principal,startDate:input.startDate,dueDate:input.dueDate,purpose:input.purpose,note:input.note,paymentMethodId:input.paymentMethodId,createdAt:now,updatedAt:now},...current.loans]});
      return loanId;
    },
    updateLoan:async(id,patch)=>persist({loans:current.loans.map(l=>l.id===id?{...l,...patch,updatedAt:new Date().toISOString()}:l)}),
    deleteLoan:async id=>persist({loans:current.loans.filter(l=>l.id!==id),repayments:current.repayments.filter(r=>r.loanId!==id)}),
    addRepayment:async input=>persist({repayments:[{...input,id:uid(),createdAt:new Date().toISOString()},...current.repayments]}),
    addCategory:async name=>{const id=slugify(name)||uid();if(current.categories.some(c=>c.id===id))return;await persist({categories:reorder([...current.categories,{id,name}],CATEGORY_ORDER)});},
    removeCategory:async id=>{if(DEFAULT_CATEGORY_IDS.has(id))return;await persist({categories:current.categories.filter(c=>c.id!==id)});await setJSON(tombstoneKey("Category"),[...(await getJSON<string[]>(tombstoneKey("Category"),[])),id]);},
    addMethod:async name=>{const id=slugify(name)||uid();if(current.methods.some(m=>m.id===id))return;await persist({methods:reorder([...current.methods,{id,name}],METHOD_ORDER)});},
    removeMethod:async id=>{if(DEFAULT_METHOD_IDS.has(id))return;await persist({methods:current.methods.filter(m=>m.id!==id)});await setJSON(tombstoneKey("Method"),[...(await getJSON<string[]>(tombstoneKey("Method"),[])),id]);},
    addSource:async name=>{const id="src-"+(slugify(name)||uid());if(current.sources.some(x=>x.id===id))return;await persist({sources:[...current.sources,{id,name}]});},
    removeSource:async id=>{if(DEFAULT_SOURCE_IDS.has(id)||id===SAVINGS_SOURCE_ID)return;await persist({sources:current.sources.filter(x=>x.id!==id)});await setJSON(tombstoneKey("Source"),[...(await getJSON<string[]>(tombstoneKey("Source"),[])),id]);},
    addTag:async(name,categoryId)=>{
      const existing=current.tags.find(t=>t.name.toLowerCase()===name.toLowerCase()&&(t.categoryId??null)===(categoryId??null));
      if(existing){if(existing.deletedAt)await persist({tags:current.tags.map(t=>t.id===existing.id?{...t,deletedAt:undefined}:t)});return existing.id;}
      const id=uid();await persist({tags:[...current.tags,{id,name,categoryId,createdAt:new Date().toISOString()}]});return id;
    },
    removeTag:async id=>{const t=current.tags.find(x=>x.id===id);if(!t||t.isDefault)return;await persist({tags:current.tags.map(x=>x.id===id?{...x,deletedAt:new Date().toISOString()}:x)});},
    setAppLockEnabled:async v=>persist({settings:{...current.settings,appLockEnabled:v,lastUnlockedAt:v?Date.now():current.settings.lastUnlockedAt}}),
    setUserName:async name=>persist({settings:{...current.settings,userName:name}}),
    markUnlocked:async()=>persist({settings:{...current.settings,lastUnlockedAt:Date.now()}}),
    lockNow:async()=>persist({settings:{...current.settings,lastUnlockedAt:undefined}}),
    resetAll:async()=>{const keys=await AsyncStorage.getAllKeys();await AsyncStorage.multiRemove(keys.filter(k=>k.startsWith(PREFIX)));current=await loadAll();setState(current);},
    replaceSnapshot:async b=>{await replaceData(b);current=await loadAll();setState(current);},
    mergeSnapshot:async b=>{await mergeData(b);current=await loadAll();setState(current);}
  };
}

export async function replaceData(b:BackupPayload){
  const d=b.data;
  const normalized=normalizeBackup(b);
  await Promise.all([
    setJSON("categories",normalized.data.categories),setJSON("methods",normalized.data.methods),setJSON("sources",normalized.data.sources),
    setJSON("tags",normalized.data.tags),setJSON("transactions",normalized.data.transactions),setJSON("parties",normalized.data.parties),
    setJSON("loans",normalized.data.loans),setJSON("repayments",normalized.data.repayments),setJSON("settings",normalized.data.settings)
  ]);
  if(normalized.extras)for(const [k,v] of Object.entries(normalized.extras))await setJSON(k,v);
  void d;
}
export async function mergeData(b:BackupPayload){
  const d=normalizeBackup(b).data;
  async function merge<T extends {id:string}>(key:keyof BackupPayload["data"],incoming:T[]){
    const currentRows=await getJSON<T[]>(String(key),[]);const ids=new Set(currentRows.map(x=>x.id));
    await setJSON(String(key),[...currentRows,...incoming.filter(x=>!ids.has(x.id))]);
  }
  await merge("categories",d.categories);await merge("methods",d.methods);await merge("sources",d.sources);await merge("tags",d.tags);
  await merge("transactions",d.transactions);await merge("parties",d.parties);await merge("loans",d.loans);await merge("repayments",d.repayments);
  const currentSettings=await getJSON<Settings>("settings",{appLockEnabled:false});await setJSON("settings",{...d.settings,...currentSettings});
}

export function normalizeBackup(b:BackupPayload):BackupPayload{
  const d=b.data;
  if(!d.sources.some(s=>s.id===SAVINGS_SOURCE_ID))d.sources.push({id:SAVINGS_SOURCE_ID,name:SAVINGS_SOURCE_NAME,isDefault:true});
  const methodIds=new Set(d.methods.map(m=>m.id));
  const missingMethods=new Set<string>();
  d.transactions.forEach(t=>{if(t.paymentMethodId&&!methodIds.has(t.paymentMethodId))missingMethods.add(t.paymentMethodId);});
  d.repayments.forEach(r=>{if(r.paymentMethodId&&!methodIds.has(r.paymentMethodId))missingMethods.add(r.paymentMethodId);});
  missingMethods.forEach(id=>d.methods.push({id,name:id.charAt(0).toUpperCase()+id.slice(1).replace(/-/g," ")}));
  const tagIds=new Set(d.tags.map(t=>t.id));const missingTags=new Set<string>();
  d.transactions.forEach(t=>(t.tags??[]).forEach(id=>{if(!tagIds.has(id))missingTags.add(id)}));
  d.loans.forEach(l=>(l.tags??[]).forEach(id=>{if(!tagIds.has(id))missingTags.add(id)}));
  missingTags.forEach(id=>d.tags.push({id,name:id.startsWith("tag-")?id.slice(4).replace(/-/g," "):id}));
  d.transactions=d.transactions.map(t=>({...t,fromSavings:t.fromSavings===true?true:undefined}));
  b.schemaVersion=4;
  return b;
}
