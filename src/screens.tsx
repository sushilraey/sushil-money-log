import React, { useMemo, useState } from "react";
import {
  Alert, Linking, Modal, Pressable, ScrollView, Text, View, TextInput,
} from "react-native";
import * as Contacts from "expo-contacts";
import { useStore, calcMonthlyRegular, calcSavingsBalance, calcSavingsForMonth, formatDate, formatRs, allowedTagsForCategory, isSavingsExpense, isSavingsIncome, loanStatus, loanTotals, monthKey, overdueDays, SAVINGS_SOURCE_ID } from "./store";
import type { LoanDirection, Transaction, TxType } from "./types";
import type { Palette } from "./theme";
import { statusTone, theme } from "./theme";
import {
  BottomTabs, Chip, EmptyState, Field, GlassCard, Glyph, Header, IconButton,
  PrimaryButton, ScreenScroll, SectionTitle, SelectorModal, usePalette, ui,
} from "./ui";
import { createSafetyBackup, exportBackup, importBackup } from "./backup";

export type ScreenName = "home" | "history" | "loans" | "reports" | "settings" | "add" | "addLoan" | "loanDetail";
export interface Route { name: ScreenName; from?: ScreenName; txId?: string; loanId?: string; txType?: TxType; }
export interface Nav { route: Route; go: (route:Route)=>void; back:()=>void; }

const today = () => new Date().toISOString().slice(0,10);

function splitName(name?:string){return (name||"").trim().split(/\s+/)[0]||"";}
function greeting(){const h=new Date().getHours();if(h<12)return"Good morning";if(h<17)return"Good afternoon";if(h<21)return"Good evening";return"Good night";}

export function HomeScreen({nav}:{nav:Nav}){
  const p=usePalette(); const s=useStore();
  const m=monthKey(new Date().toISOString()); const totals=calcMonthlyRegular(s.transactions,m);
  const savings=calcSavingsBalance(s.transactions);
  const loanNet=useMemo(()=>s.loans.reduce((sum,l)=>sum+(l.direction==="given"?1:-1)*Math.max(0,l.principal-loanTotals(l.id,s.repayments)),0),[s.loans,s.repayments]);
  const recent=s.transactions.slice(0,5); const first=splitName(s.settings.userName);
  const cat=(id:string)=>s.categories.find(x=>x.id===id)?.name||"Unknown";
  const lockNow=async()=>{await s.lockNow();};
  return <View style={{flex:1}}>
    <Header title={greeting()+(first?", "+first:"")} onSettings={()=>nav.go({name:"settings",from:"home"})} onLock={s.settings.appLockEnabled?lockNow:undefined}/>
    <ScreenScroll>
      <GlassCard large style={{padding:18}}>
        <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"}}>
          <View><Text style={[ui.eyebrow,{color:p.muted}]}>THIS MONTH BALANCE</Text><Text style={[ui.moneyHero,{color:p.text}]}>{formatRs(totals.bal)}</Text></View>
          <View style={[ui.orb,{backgroundColor:p.primary+"30",borderColor:p.primary+"45"}]}><Glyph name="money" size={24} color={p.primary}/></View>
        </View>
        <View style={{flexDirection:"row",gap:10,marginTop:18}}>
          <StatMini label="Income" value={formatRs(totals.inc)} tone={p.income} glyph="income"/>
          <StatMini label="Expense" value={formatRs(totals.exp)} tone={p.expense} glyph="expense"/>
        </View>
      </GlassCard>

      <View style={{flexDirection:"row",gap:12}}>
        <GlassCard style={{flex:1}}><Text style={[ui.eyebrow,{color:p.muted}]}>SAVINGS</Text><Text style={[ui.moneySmall,{color:p.income}]}>{formatRs(savings)}</Text><Text style={[ui.mini,{color:p.muted}]}>all time</Text></GlassCard>
        <GlassCard style={{flex:1}}><Text style={[ui.eyebrow,{color:p.muted}]}>LOAN NET</Text><Text style={[ui.moneySmall,{color:loanNet>=0?p.income:p.expense}]}>{loanNet>=0?"+":"−"} {formatRs(Math.abs(loanNet))}</Text><Text style={[ui.mini,{color:p.muted}]}>given − taken</Text></GlassCard>
      </View>

      <View style={{gap:10}}>
        <View style={{flexDirection:"row",gap:10}}>
          <QuickAction title="Expense" glyph="expense" tone={p.expense} onPress={()=>nav.go({name:"add",from:"home",txType:"expense"})}/>
          <QuickAction title="Income" glyph="income" tone={p.income} onPress={()=>nav.go({name:"add",from:"home",txType:"income"})}/>
          <QuickAction title="Loan" glyph="loans" tone={p.info} onPress={()=>nav.go({name:"addLoan",from:"home"})}/>
        </View>
      </View>

      <SectionTitle right={<Pressable onPress={()=>nav.go({name:"history",from:"home"})}><Text style={{color:p.primary,fontSize:12,fontWeight:"800"}}>See all</Text></Pressable>}>Recent activity</SectionTitle>
      {recent.length===0?<EmptyState title="No entries yet" subtitle="Add your first expense, income, or loan."/>:
        recent.map(t=><GlassCard key={t.id} style={{padding:0}}><View style={ui.txRow}>
          <View style={[ui.txIcon,{backgroundColor:(t.type==="income"?p.income:p.expense)+"1E"}]}><Glyph name={t.type==="income"?"income":"expense"} color={t.type==="income"?p.income:p.expense}/></View>
          <View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={[ui.txTitle,{color:p.text}]}>{cat(t.categoryId)}</Text><Text style={[ui.txMeta,{color:p.muted}]}>{formatDate(t.date)} {t.fromSavings?"· From Savings":isSavingsIncome(t)?"· Savings":""}</Text></View>
          <Text style={[ui.txAmount,{color:t.type==="income"?p.income:p.expense}]}>{t.type==="income"?"+":"−"} {formatRs(t.amount)}</Text>
        </View></GlassCard>)
      }
      <View style={{height:8}}/>
    </ScreenScroll>
    <BottomTabs active="home" onPress={name=>nav.go({name})}/>
  </View>
}

function StatMini({label,value,tone,glyph}:{label:string;value:string;tone:string;glyph:string}){
  const p=usePalette();return <View style={[ui.statMini,{borderColor:p.border,backgroundColor:"rgba(255,255,255,0.055)"}]}><View style={{flexDirection:"row",alignItems:"center",gap:6}}><Glyph name={glyph} size={14} color={tone}/><Text style={{fontSize:10,fontWeight:"800",color:p.muted}}>{label.toUpperCase()}</Text></View><Text style={{color:p.text,fontWeight:"800",fontSize:12,marginTop:3}}>{value}</Text></View>
}
function QuickAction({title,glyph,tone,onPress}:{title:string;glyph:string;tone:string;onPress:()=>void}){
  const p=usePalette();return <Pressable onPress={onPress} style={({pressed})=>[ui.quick,{borderColor:tone+"45",backgroundColor:tone+"12",opacity:pressed?0.7:1}]}><Glyph name={glyph} color={tone}/><Text style={{fontSize:11,fontWeight:"800",color:p.text}}>{title}</Text></Pressable>
}

export function HistoryScreen({nav}:{nav:Nav}){
  const p=usePalette(); const s=useStore();
  const [q,setQ]=useState(""); const [type,setType]=useState<"all"|TxType>("all");
  const [sort,setSort]=useState<"date_desc"|"date_asc"|"amount_desc"|"amount_asc">("date_desc");
  const [filterOpen,setFilterOpen]=useState(false);
  const [catId,setCatId]=useState(""); const [methodId,setMethodId]=useState(""); const [sourceId,setSourceId]=useState("");
  const [minAmt,setMinAmt]=useState(""); const [maxAmt,setMaxAmt]=useState(""); const [dateFrom,setDateFrom]=useState(""); const [dateTo,setDateTo]=useState("");
  const filtered=useMemo(()=>{
    const term=q.trim().toLowerCase(); const rows=s.transactions.filter(t=>{
      if(type!=="all"&&t.type!==type)return false;
      if(catId&&t.categoryId!==catId)return false;
      if(methodId&&t.paymentMethodId!==methodId)return false;
      if(sourceId&&t.source!==sourceId)return false;
      if(minAmt&&t.amount<Number(minAmt))return false;
      if(maxAmt&&t.amount>Number(maxAmt))return false;
      if(dateFrom&&t.date.slice(0,10)<dateFrom)return false;
      if(dateTo&&t.date.slice(0,10)>dateTo)return false;
      if(term){
        const cat=s.categories.find(x=>x.id===t.categoryId)?.name||"";
        const method=s.methods.find(x=>x.id===t.paymentMethodId)?.name||"";
        const src=s.sources.find(x=>x.id===t.source)?.name||"";
        const hay=(t.remarks||"")+" "+cat+" "+method+" "+src+" "+t.amount;
        if(!hay.toLowerCase().includes(term))return false;
      }
      return true;
    }).slice();
    rows.sort((a,b)=>sort==="date_asc"?+new Date(a.date)-+new Date(b.date):sort==="amount_desc"?b.amount-a.amount:sort==="amount_asc"?a.amount-b.amount:+new Date(b.date)-+new Date(a.date));
    return rows;
  },[s.transactions,s.categories,s.methods,s.sources,q,type,catId,methodId,sourceId,minAmt,maxAmt,dateFrom,dateTo,sort]);
  const net=filtered.reduce((a,t)=>a+(t.type==="income"?t.amount:-t.amount),0);
  return <View style={{flex:1}}>
    <Header title="History" onSettings={()=>nav.go({name:"settings",from:"history"})}/>
    <ScreenScroll>
      <GlassCard style={{padding:10}}>
        <View style={{flexDirection:"row",gap:8,alignItems:"center"}}>
          <Glyph name="search" color={p.muted}/>
          <TextInput value={q} onChangeText={setQ} placeholder="Search entries..." placeholderTextColor={p.muted} style={[ui.searchInput,{color:p.text}]}/>
          <IconButton name="filter" onPress={()=>setFilterOpen(true)} active={!!(catId||methodId||sourceId||minAmt||maxAmt||dateFrom||dateTo||type!=="all")}/>
        </View>
      </GlassCard>
      <View style={{flexDirection:"row",gap:8}}>
        {(["all","income","expense"] as const).map(x=><Chip key={x} label={x==="all"?"All":x==="income"?"Income":"Expense"} selected={type===x} onPress={()=>setType(x)}/>)}
        <Chip label={sort==="date_desc"?"Newest":sort==="date_asc"?"Oldest":sort==="amount_desc"?"High amount":"Low amount"} onPress={()=>setSort(sort==="date_desc"?"date_asc":sort==="date_asc"?"amount_desc":sort==="amount_desc"?"amount_asc":"date_desc")} />
      </View>
      <View style={ui.rowBetween}><Text style={[ui.mini,{color:p.muted}]}>{filtered.length} {filtered.length===1?"entry":"entries"}</Text><Text style={{color:net>=0?p.income:p.expense,fontSize:12,fontWeight:"800"}}>Net {net>=0?"+":"−"} {formatRs(Math.abs(net))}</Text></View>
      {filtered.length===0?<EmptyState title="No matching entries" subtitle="Try clearing a filter or adding a transaction."/>:
      filtered.map(t=><Pressable key={t.id} onPress={()=>nav.go({name:"add",from:"history",txId:t.id})}><GlassCard><View style={ui.txRow}>
        <View style={[ui.txIcon,{backgroundColor:(t.type==="income"?p.income:p.expense)+"1E"}]}><Glyph name={t.type==="income"?"income":"expense"} color={t.type==="income"?p.income:p.expense}/></View>
        <View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={[ui.txTitle,{color:p.text}]}>{s.categories.find(c=>c.id===t.categoryId)?.name||"Unknown"}</Text><Text numberOfLines={1} style={[ui.txMeta,{color:p.muted}]}>{formatDate(t.date)} · {s.methods.find(m=>m.id===t.paymentMethodId)?.name||"—"}{t.fromSavings?" · From Savings":isSavingsIncome(t)?" · Savings":""}</Text></View>
        <View style={{alignItems:"flex-end",gap:5}}><Text style={[ui.txAmount,{color:t.type==="income"?p.income:p.expense}]}>{t.type==="income"?"+":"−"} {formatRs(t.amount)}</Text><View style={{flexDirection:"row",gap:4}}><IconButton name="edit" onPress={()=>nav.go({name:"add",from:"history",txId:t.id})}/><IconButton name="delete" danger onPress={()=>Alert.alert("Delete entry?","This cannot be undone.",[{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:()=>void s.deleteTransaction(t.id)}])}/></View></View>
      </View></GlassCard></Pressable>)}
    </ScreenScroll>
    <BottomTabs active="history" onPress={name=>nav.go({name})}/>
    <SelectorModal visible={false} title="" options={[]} onSelect={()=>{}} onClose={()=>{}}/>
    <FilterModal visible={filterOpen} onClose={()=>setFilterOpen(false)} p={p} s={s} catId={catId} methodId={methodId} sourceId={sourceId} minAmt={minAmt} maxAmt={maxAmt} dateFrom={dateFrom} dateTo={dateTo} type={type}
      setCatId={setCatId} setMethodId={setMethodId} setSourceId={setSourceId} setMinAmt={setMinAmt} setMaxAmt={setMaxAmt} setDateFrom={setDateFrom} setDateTo={setDateTo} setType={setType}/>
  </View>
}

function FilterModal(props:any){
  const {visible,onClose,p,s,catId,methodId,sourceId,minAmt,maxAmt,dateFrom,dateTo,type,setCatId,setMethodId,setSourceId,setMinAmt,setMaxAmt,setDateFrom,setDateTo,setType}=props;
  const [pick,setPick]=useState<"cat"|"method"|"source"|null>(null);
  const options=pick==="cat"?s.categories.map((x:any)=>({id:x.id,label:x.name})):pick==="method"?s.methods.map((x:any)=>({id:x.id,label:x.name})):s.sources.map((x:any)=>({id:x.id,label:x.name}));
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={ui.modalBackdrop}><GlassCard large><SectionTitle right={<IconButton name="close" onPress={onClose}/>}>Filters</SectionTitle>
    <View style={{flexDirection:"row",gap:8,marginTop:12}}>{(["all","income","expense"] as const).map(x=><Chip key={x} label={x} selected={type===x} onPress={()=>setType(x)}/>)}</View>
    <View style={{gap:10,marginTop:12}}>
      <PickerButton label="Category" value={s.categories.find((x:any)=>x.id===catId)?.name||"Any category"} onPress={()=>setPick("cat")}/>
      <PickerButton label="Payment method" value={s.methods.find((x:any)=>x.id===methodId)?.name||"Any method"} onPress={()=>setPick("method")}/>
      <PickerButton label="Income source" value={s.sources.find((x:any)=>x.id===sourceId)?.name||"Any source"} onPress={()=>setPick("source")}/>
      <View style={{flexDirection:"row",gap:10}}><View style={{flex:1}}><Field label="Min amount" value={minAmt} onChangeText={setMinAmt} keyboardType="numeric"/></View><View style={{flex:1}}><Field label="Max amount" value={maxAmt} onChangeText={setMaxAmt} keyboardType="numeric"/></View></View>
      <View style={{flexDirection:"row",gap:10}}><View style={{flex:1}}><Field label="From (YYYY-MM-DD)" value={dateFrom} onChangeText={setDateFrom}/></View><View style={{flex:1}}><Field label="To (YYYY-MM-DD)" value={dateTo} onChangeText={setDateTo}/></View></View>
      <PrimaryButton secondary onPress={()=>{setType("all");setCatId("");setMethodId("");setSourceId("");setMinAmt("");setMaxAmt("");setDateFrom("");setDateTo("");onClose();}}>Clear filters</PrimaryButton>
      <PrimaryButton onPress={onClose}>Apply filters</PrimaryButton>
    </View>
  </GlassCard></View><SelectorModal visible={!!pick} title={pick==="cat"?"Category":pick==="method"?"Payment method":"Income source"} options={[{id:"",label:"Any"} ,...options]} value={pick==="cat"?catId:pick==="method"?methodId:sourceId} onSelect={id=>{if(pick==="cat")setCatId(id);if(pick==="method")setMethodId(id);if(pick==="source")setSourceId(id);setPick(null)}} onClose={()=>setPick(null)} searchable/></Modal>
}
function PickerButton({label,value,onPress}:{label:string;value:string;onPress:()=>void}){const p=usePalette();return <Pressable onPress={onPress} style={[ui.picker,{borderColor:p.border,backgroundColor:p.input}]}><View><Text style={[ui.eyebrow,{color:p.muted}]}>{label}</Text><Text style={{color:p.text,fontSize:14,fontWeight:"700",marginTop:3}}>{value}</Text></View><Glyph name="chevron" color={p.muted}/></Pressable>}

export function AddEntryScreen({nav,txId,txType}:{nav:Nav;txId?:string;txType?:TxType}){
  const p=usePalette(); const s=useStore();
  const editing=txId?s.transactions.find(t=>t.id===txId):undefined;
  const [type,setType]=useState<TxType>(editing?.type??txType??"expense");
  const [amount,setAmount]=useState(editing?String(editing.amount):"");
  const [categoryId,setCategoryId]=useState(editing?.categoryId||s.categories[0]?.id||"");
  const [methodId,setMethodId]=useState(editing?.paymentMethodId||s.methods[0]?.id||"");
  const [date,setDate]=useState(editing?.date.slice(0,10)||today());
  const [remarks,setRemarks]=useState(editing?.remarks||"");
  const [source,setSource]=useState(editing?.source||"");
  const [fromSavings,setFromSavings]=useState(editing?.fromSavings||false);
  const [tags,setTags]=useState<string[]>(editing?.tags||[]);
  const [pick,setPick]=useState<"cat"|"method"|"source"|null>(null);
  const category=s.categories.find(x=>x.id===categoryId);
  const allowed=allowedTagsForCategory(category?.name)||[];
  const visibleTags=s.tags.filter(t=>!t.deletedAt && (!t.categoryId||t.categoryId===categoryId) && (allowed.length===0||allowed.some(n=>n.toLowerCase()===t.name.toLowerCase())));
  const savings=calcSavingsBalance(s.transactions);
  const save=async()=>{
    const n=Number(amount);if(!(n>0)||!categoryId||!methodId||!date){Alert.alert("Check entry","Amount, category, payment method and date are required.");return;}
    if(type==="income"&&!source){Alert.alert("Select source","Income requires a source.");return;}
    if(type==="expense"&&fromSavings&&n>savings){Alert.alert("Insufficient savings","Available savings: "+formatRs(savings));return;}
    const payload={type,amount:n,categoryId,paymentMethodId:methodId,date:new Date(date).toISOString(),remarks:remarks.trim()||undefined,tags:tags.length?tags:undefined,source:type==="income"?source:undefined,fromSavings:type==="expense"&&fromSavings};
    if(editing)await s.updateTransaction(editing.id,payload);else await s.addTransaction(payload);
    Alert.alert(editing?"Entry updated":"Entry added");nav.back();
  };
  const categoryOptions=s.categories.map(x=>({id:x.id,label:x.name}));const methodOptions=s.methods.map(x=>({id:x.id,label:x.name}));const sourceOptions=s.sources.map(x=>({id:x.id,label:x.name}));
  return <View style={{flex:1}}><Header title={editing?"Edit entry":"Add entry"} onBack={nav.back}/>
    <ScreenScroll>
      <View style={ui.segmented}>{(["expense","income"] as const).map(x=><Pressable key={x} onPress={()=>{setType(x);if(x==="income")setFromSavings(false)}} style={[ui.segment,{backgroundColor:type===x?(x==="income"?p.income:p.expense):"transparent"}]}><Text style={{color:type===x?"#fff":p.muted,fontWeight:"800",fontSize:13}}>{x==="income"?"Income":"Expense"}</Text></Pressable>)}</View>
      <GlassCard large><Field label="AMOUNT (Rs)" value={amount} onChangeText={v=>setAmount(v.replace(/[^0-9.]/g,""))} keyboardType="numeric"/><Text style={{position:"absolute",right:30,top:45,color:p.primary,fontSize:28,fontWeight:"900"}}>₨</Text></GlassCard>
      <PickerButton label="CATEGORY" value={category?.name||"Choose category"} onPress={()=>setPick("cat")}/>
      <PickerButton label="PAYMENT METHOD" value={s.methods.find(x=>x.id===methodId)?.name||"Choose method"} onPress={()=>setPick("method")}/>
      <Field label="DATE" value={date} onChangeText={setDate}/>
      {type==="income"&&<PickerButton label="INCOME SOURCE" value={s.sources.find(x=>x.id===source)?.name||"Choose source"} onPress={()=>setPick("source")}/>}
      {type==="expense"&&<GlassCard><View style={ui.rowBetween}><View style={{flex:1,paddingRight:12}}><Text style={{color:p.text,fontSize:14,fontWeight:"800"}}>Pay from Savings</Text><Text style={{color:p.muted,fontSize:11,marginTop:2}}>Available {formatRs(savings)}</Text></View><Pressable onPress={()=>setFromSavings(v=>!v)} style={[ui.switch,{backgroundColor:fromSavings?p.income:p.muted+"55"}]}><View style={[ui.switchKnob,{alignSelf:fromSavings?"flex-end":"flex-start"}]}/></Pressable></View></GlassCard>}
      <GlassCard><Text style={[ui.fieldLabel,{color:p.muted,marginBottom:9}]}>TAGS</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:7}}>
        {visibleTags.map(t=><Chip key={t.id} label={t.name} selected={tags.includes(t.id)} onPress={()=>setTags(v=>v.includes(t.id)?v.filter(x=>x!==t.id):[...v,t.id])}/>)}
      </View>
      <TagAdder categoryId={categoryId} onAdd={id=>setTags(v=>v.includes(id)?v:[...v,id])}/>
      {tags.length>0&&<Pressable onPress={()=>setTags([])}><Text style={{color:p.muted,fontSize:11,marginTop:10}}>Clear tags</Text></Pressable>}</GlassCard>
      <Field label="REMARKS (optional)" value={remarks} onChangeText={setRemarks} placeholder="What was this for?" multiline/>
      <PrimaryButton onPress={()=>void save()}>{editing?"Save changes":"Add "+type}</PrimaryButton>
    </ScreenScroll>
    <SelectorModal visible={pick==="cat"} title="Category" options={categoryOptions} value={categoryId} onSelect={setCategoryId} onClose={()=>setPick(null)} searchable/>
    <SelectorModal visible={pick==="method"} title="Payment method" options={methodOptions} value={methodId} onSelect={setMethodId} onClose={()=>setPick(null)}/>
    <SelectorModal visible={pick==="source"} title="Income source" options={sourceOptions} value={source} onSelect={setSource} onClose={()=>setPick(null)}/>
  </View>
}
function TagAdder({categoryId,onAdd}:{categoryId:string;onAdd:(id:string)=>void}){
  const p=usePalette();const s=useStore();const [draft,setDraft]=useState("");
  return <View style={{flexDirection:"row",gap:8,marginTop:12}}><TextInput value={draft} onChangeText={setDraft} placeholder="Add custom tag" placeholderTextColor={p.muted} style={[ui.input,{flex:1,color:p.text,backgroundColor:p.input,borderColor:p.border}]}/><PrimaryButton onPress={async()=>{if(!draft.trim())return;const id=await s.addTag(draft.trim(),categoryId);onAdd(id);setDraft("")}}>Add</PrimaryButton></View>
}

export function AddLoanScreen({nav}:{nav:Nav}){
  const p=usePalette();const s=useStore();
  const [direction,setDirection]=useState<LoanDirection>("given");const [name,setName]=useState("");const [phone,setPhone]=useState("");const [amount,setAmount]=useState("");const [startDate,setStartDate]=useState(today());const [dueDate,setDueDate]=useState("");const [purpose,setPurpose]=useState("");const [note,setNote]=useState("");const [methodId,setMethodId]=useState(s.methods[0]?.id||"");const [methodPick,setMethodPick]=useState(false);const [pick,setPick]=useState(false);const [contacts,setContacts]=useState<{name:string;phone:string}[]>([]);
  const pickContact=async()=>{const perm=await Contacts.requestPermissionsAsync();if(perm.status!=="granted"){Alert.alert("Contacts permission needed","Allow Contacts access to pick a person.");return;}const r=await Contacts.getContactsAsync({fields:[Contacts.Fields.PhoneNumbers],pageSize:1000});const rows=(r.data||[]).flatMap(c=>(c.phoneNumbers||[]).slice(0,1).map(ph=>({name:c.name||"",phone:(ph.number||"").replace(/\s+/g,"")}))).filter(x=>x.name||x.phone);setContacts(rows);setPick(true);};
  const save=async()=>{const n=Number(amount);if(!name.trim()||!(n>0)||!startDate||(dueDate&&dueDate<startDate)){Alert.alert("Check loan","Name, amount and a valid date are required.");return;}const id=await s.addLoan({direction,partyName:name.trim(),phone:phone||undefined,principal:n,startDate:new Date(startDate).toISOString(),dueDate:dueDate?new Date(dueDate).toISOString():undefined,purpose:purpose||undefined,note:note||undefined,paymentMethodId:methodId||undefined});Alert.alert("Loan added");nav.go({name:"loanDetail",from:"addLoan",loanId:id});};
  return <View style={{flex:1}}><Header title="Add loan" onBack={nav.back}/><ScreenScroll>
    <View style={ui.segmented}>{(["given","taken"] as const).map(x=><Pressable key={x} onPress={()=>setDirection(x)} style={[ui.segment,{backgroundColor:direction===x?(x==="given"?p.income:p.expense):"transparent"}]}><Text style={{color:direction===x?"#fff":p.muted,fontWeight:"800"}}>{x==="given"?"I gave":"I took"}</Text></Pressable>)}</View>
    <Field label="PERSON NAME" value={name} onChangeText={setName} placeholder="e.g. Ram"/>
    <View><Text style={[ui.fieldLabel,{color:p.muted,marginBottom:7}]}>PHONE (optional)</Text><View style={{flexDirection:"row",gap:8}}><TextInput value={phone} onChangeText={setPhone} placeholder="98XXXXXXXX" placeholderTextColor={p.muted} keyboardType="phone-pad" style={[ui.input,{flex:1,color:p.text,backgroundColor:p.input,borderColor:p.border}]}/><IconButton name="contact" onPress={()=>void pickContact()}/></View></View>
    <GlassCard large><Field label="AMOUNT (Rs)" value={amount} onChangeText={v=>setAmount(v.replace(/[^0-9.]/g,""))} keyboardType="numeric"/></GlassCard>
    <View style={{flexDirection:"row",gap:10}}><View style={{flex:1}}><Field label="START DATE" value={startDate} onChangeText={setStartDate}/></View><View style={{flex:1}}><Field label="DUE DATE" value={dueDate} onChangeText={setDueDate}/></View></View>
    <PickerButton label="PAYMENT METHOD" value={s.methods.find(x=>x.id===methodId)?.name||"Choose method"} onPress={()=>setMethodPick(true)}/><SelectorModal visible={methodPick} title="Payment method" options={s.methods.map(m=>({id:m.id,label:m.name}))} value={methodId} onSelect={setMethodId} onClose={()=>setMethodPick(false)}/>
    <Field label="PURPOSE (optional)" value={purpose} onChangeText={setPurpose} placeholder="Medical, tuition, business..."/>
    <Field label="NOTE (optional)" value={note} onChangeText={setNote} multiline placeholder="Any details..."/>
    <PrimaryButton onPress={()=>void save()}>Save loan</PrimaryButton>
  </ScreenScroll>
  <Modal transparent visible={pick} animationType="fade" onRequestClose={()=>setPick(false)}><View style={ui.modalBackdrop}><GlassCard large><SectionTitle right={<IconButton name="close" onPress={()=>setPick(false)}/>}>Choose contact</SectionTitle><ScrollView style={{maxHeight:480,marginTop:10}}>{contacts.map((c,i)=><Pressable key={i} onPress={()=>{setName(c.name);setPhone(c.phone);setPick(false)}} style={[ui.option,{borderBottomColor:p.border}]}><Text style={{color:p.text,fontWeight:"700"}}>{c.name}</Text><Text style={{color:p.muted,fontSize:12}}>{c.phone}</Text></Pressable>)}</ScrollView></GlassCard></View></Modal></View>
}

export function LoansScreen({nav}:{nav:Nav}){
  const p=usePalette();const s=useStore();const [direction,setDirection]=useState<"all"|LoanDirection>("all");const [query,setQuery]=useState("");
  const rows=useMemo(()=>s.loans.filter(l=>direction==="all"||l.direction===direction).map(l=>{const party=s.parties.find(x=>x.id===l.partyId);const paid=loanTotals(l.id,s.repayments);return {l,party,paid,status:loanStatus(l,paid)}}).filter(x=>(x.party?.name||"").toLowerCase().includes(query.toLowerCase())),[s.loans,s.parties,s.repayments,direction,query]);
  return <View style={{flex:1}}><Header title="Loans" onSettings={()=>nav.go({name:"settings",from:"loans"})}/><ScreenScroll>
    <View style={ui.rowBetween}><View style={{flexDirection:"row",gap:8}}>{(["all","given","taken"] as const).map(x=><Chip key={x} label={x==="all"?"All":x==="given"?"Given":"Taken"} selected={direction===x} onPress={()=>setDirection(x)}/>)}</View><IconButton name="plus" onPress={()=>nav.go({name:"addLoan",from:"loans"})}/></View>
    <View style={{flexDirection:"row",gap:8,alignItems:"center"}}><GlassCard style={{flex:1,padding:10}}><View style={{flexDirection:"row",alignItems:"center",gap:7}}><Glyph name="search" color={p.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search person" placeholderTextColor={p.muted} style={[ui.searchInput,{color:p.text}]}/></View></GlassCard></View>
    {rows.length===0?<EmptyState title="No loans" subtitle="Add a given or taken loan to track repayments."/>:rows.map(({l,party,paid,status})=>{const rem=Math.max(0,l.principal-paid);const tone=statusTone(status,p);return <Pressable key={l.id} onPress={()=>nav.go({name:"loanDetail",from:"loans",loanId:l.id})}><GlassCard><View style={ui.txRow}><View style={[ui.txIcon,{backgroundColor:(l.direction==="given"?p.income:p.expense)+"1E"}]}><Glyph name={l.direction==="given"?"income":"expense"} color={l.direction==="given"?p.income:p.expense}/></View><View style={{flex:1,minWidth:0}}><Text style={[ui.txTitle,{color:p.text}]} numberOfLines={1}>{party?.name||"Unknown"}</Text><Text style={[ui.txMeta,{color:p.muted}]}>{l.direction==="given"?"You gave":"You took"} · {formatDate(l.startDate)}</Text></View><View style={{alignItems:"flex-end"}}><Chip label={status==="overdue"?overdueDays(l)+"d overdue":status} subtle/><Text style={{color:l.direction==="given"?p.income:p.expense,fontWeight:"900",fontSize:12,marginTop:6}}>{formatRs(rem)} left</Text></View></View></GlassCard></Pressable>})}
  </ScreenScroll><BottomTabs active="loans" onPress={name=>nav.go({name})}/></View>
}

export function LoanDetailScreen({nav,loanId}:{nav:Nav;loanId?:string}){
  const p=usePalette();const s=useStore();const loan=s.loans.find(l=>l.id===loanId);
  const [amount,setAmount]=useState("");const [date,setDate]=useState(today());const [methodId,setMethodId]=useState(s.methods[0]?.id||"");const [methodPick,setMethodPick]=useState(false);const [note,setNote]=useState("");
  if(!loan)return <View style={{flex:1}}><Header title="Loan" onBack={nav.back}/><EmptyState title="Loan not found"/></View>;
  const party=s.parties.find(x=>x.id===loan.partyId);const paid=loanTotals(loan.id,s.repayments);const remaining=Math.max(0,loan.principal-paid);const status=loanStatus(loan,paid);const reps=s.repayments.filter(r=>r.loanId===loan.id);const tone=statusTone(status,p);
  const add=async()=>{const n=Number(amount);if(!(n>0)||n>remaining){Alert.alert("Invalid repayment","Enter an amount up to "+formatRs(remaining));return;}await s.addRepayment({loanId:loan.id,amount:n,date:new Date(date).toISOString(),paymentMethodId:methodId,note:note||undefined});setAmount("");setNote("");Alert.alert("Repayment recorded");};
  const remove=()=>Alert.alert("Delete loan?","All repayments will also be deleted.",[{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:async()=>{await s.deleteLoan(loan.id);nav.go({name:"loans"})}}]);
  return <View style={{flex:1}}><Header title={loan.direction==="given"?"Given loan":"Taken loan"} onBack={nav.back} />
    <ScreenScroll>
      <GlassCard large><View style={ui.rowBetween}><View style={{flex:1}}><Text style={[ui.eyebrow,{color:p.muted}]}>{loan.direction==="given"?"YOU GAVE":"YOU TOOK"}</Text><Text style={[ui.nameTitle,{color:p.text}]}>{party?.name||"Unknown"}</Text>{party?.phone&&<Pressable onPress={()=>Linking.openURL("tel:"+party.phone)}><Text style={{color:p.primary,fontWeight:"700",marginTop:5}}>{party.phone}</Text></Pressable>}</View><Chip label={status==="overdue"?overdueDays(loan)+"d overdue":status}/></View>
        <View style={{flexDirection:"row",gap:8,marginTop:20}}><LoanStat label="Principal" value={formatRs(loan.principal)} tone={loan.direction==="given"?p.income:p.expense}/><LoanStat label="Paid" value={formatRs(paid)} tone={p.income}/><LoanStat label="Left" value={formatRs(remaining)} tone={loan.direction==="given"?p.income:p.expense}/></View>
        <View style={{marginTop:16,gap:5}}><Text style={{color:p.muted,fontSize:12}}>Start: {formatDate(loan.startDate)}</Text><Text style={{color:p.muted,fontSize:12}}>Due: {loan.dueDate?formatDate(loan.dueDate):"—"}</Text>{loan.purpose&&<Text style={{color:p.muted,fontSize:12}}>Purpose: {loan.purpose}</Text>}</View>
      </GlassCard>
      {remaining>0&&<GlassCard><SectionTitle> {loan.direction==="given"?"Receive repayment":"Pay repayment"}</SectionTitle><View style={{gap:12,marginTop:12}}><Field label="AMOUNT" value={amount} onChangeText={v=>setAmount(v.replace(/[^0-9.]/g,""))} keyboardType="numeric"/><Field label="DATE" value={date} onChangeText={setDate}/><PickerButton label="METHOD" value={s.methods.find(x=>x.id===methodId)?.name||"Choose"} onPress={()=>setMethodPick(true)}/><SelectorModal visible={methodPick} title="Payment method" options={s.methods.map(m=>({id:m.id,label:m.name}))} value={methodId} onSelect={setMethodId} onClose={()=>setMethodPick(false)}/><Field label="NOTE" value={note} onChangeText={setNote} multiline/><PrimaryButton onPress={()=>void add()}>Add repayment</PrimaryButton></View></GlassCard>}
      <SectionTitle right={<IconButton name="delete" danger onPress={remove}/>}>Repayment history</SectionTitle>
      {reps.length===0?<EmptyState title="No repayments yet"/>:reps.map(r=><GlassCard key={r.id}><View style={ui.rowBetween}><View><Text style={{color:p.text,fontWeight:"800"}}>{formatRs(r.amount)}</Text><Text style={{color:p.muted,fontSize:11,marginTop:3}}>{formatDate(r.date)} · {s.methods.find(m=>m.id===r.paymentMethodId)?.name||"—"}</Text>{r.note&&<Text style={{color:p.muted,fontSize:11,marginTop:3}}>{r.note}</Text>}</View><Text style={{color:p.income,fontWeight:"800"}}>+ paid</Text></View></GlassCard>)}
    </ScreenScroll></View>
}
function LoanStat({label,value,tone}:{label:string;value:string;tone:string}){const p=usePalette();return <View style={[ui.loanStat,{borderColor:p.border,backgroundColor:"rgba(255,255,255,0.05)"}]}><Text style={[ui.eyebrow,{color:p.muted}]}>{label.toUpperCase()}</Text><Text style={{color:tone,fontWeight:"900",fontSize:12,marginTop:5}}>{value}</Text></View>}

export function ReportsScreen({nav}:{nav:Nav}){
  const p=usePalette();const s=useStore();const months=useMemo(()=>{const set=new Set<string>(s.transactions.map(t=>monthKey(t.date)));set.add(monthKey(new Date().toISOString()));return Array.from(set).sort().reverse()},[s.transactions]);const [month,setMonth]=useState(months[0]||monthKey(new Date().toISOString()));const [tagView,setTagView]=useState<"income"|"expense">("expense");
  const totals=calcMonthlyRegular(s.transactions,month);const savings=calcSavingsForMonth(s.transactions,month);const inMonth=s.transactions.filter(t=>monthKey(t.date)===month);
  const catMap=groupAmounts(inMonth.filter(t=>t.type==="expense"&&!isSavingsExpense(t)).map(t=>[t.categoryId,t.amount] as const));const incCat=groupAmounts(inMonth.filter(t=>t.type==="income"&&!isSavingsIncome(t)).map(t=>[t.categoryId,t.amount] as const));const srcMap=groupAmounts(inMonth.filter(t=>t.type==="income"&&!isSavingsIncome(t)).map(t=>[t.source||"__none",t.amount] as const));const methodMap=groupAmounts(inMonth.map(t=>[t.paymentMethodId,t.amount] as const));
  const tagsMap=groupTags(inMonth.filter(t=>t.type===tagView&&(tagView==="expense"? !isSavingsExpense(t):!isSavingsIncome(t))),s.tags);
  const loanSummary=s.loans.reduce((a,l)=>{const rem=Math.max(0,l.principal-loanTotals(l.id,s.repayments));return l.direction==="given"?{...a,given:a.given+rem}:{...a,taken:a.taken+rem}}, {given:0,taken:0});
  const max=Math.max(totals.inc,totals.exp,1);
  return <View style={{flex:1}}><Header title="Reports" onSettings={()=>nav.go({name:"settings",from:"reports"})}/><ScreenScroll>
    <PickerButton label="MONTH" value={month} onPress={()=>Alert.alert("Select month",months.map(m=>m).join("\n"),months.map(m=>({text:m,onPress:()=>setMonth(m)})).slice(0,8))}/>
    <GlassCard large><Text style={[ui.eyebrow,{color:p.muted}]}>BALANCE</Text><Text style={[ui.moneyHero,{color:p.text}]}>{formatRs(totals.bal)}</Text><Bar label="Income" value={totals.inc} max={max} tone={p.income}/><Bar label="Expense" value={totals.exp} max={max} tone={p.expense}/></GlassCard>
    <GlassCard><Text style={[ui.eyebrow,{color:p.income}]}>THIS MONTH SAVINGS</Text><Text style={[ui.moneySmall,{color:p.income}]}>{formatRs(savings)}</Text><Text style={[ui.mini,{color:p.muted}]}>Savings-source income added in {month}</Text></GlassCard>
    <Breakdown title="Expense by category" rows={catMap} lookup={id=>s.categories.find(c=>c.id===id)?.name||"Unknown"} total={totals.exp} tone={p.expense}/>
    <Breakdown title="Income by category" rows={incCat} lookup={id=>s.categories.find(c=>c.id===id)?.name||"Unknown"} total={totals.inc} tone={p.income}/>
    <Breakdown title="Income by source" rows={srcMap} lookup={id=>id==="__none"?"No source":s.sources.find(x=>x.id===id)?.name||id} total={incCat.reduce((a,x)=>a+x[1],0)} tone={p.income}/>
    <Breakdown title="Money by payment method" rows={methodMap} lookup={id=>s.methods.find(x=>x.id===id)?.name||"Unknown"} total={methodMap.reduce((a,x)=>a+x[1],0)} tone={p.primary}/>
    <GlassCard><SectionTitle right={<View style={{flexDirection:"row",gap:7}}>{(["expense","income"] as const).map(x=><Chip key={x} label={x} selected={tagView===x} onPress={()=>setTagView(x)}/>)}</View>}>Tag analysis</SectionTitle><View style={{gap:8,marginTop:12}}>{tagsMap.length===0?<Text style={{color:p.muted,fontSize:12}}>No tagged entries.</Text>:tagsMap.map(([id,val,count])=><View key={id}><View style={ui.rowBetween}><Text style={{color:p.text,fontSize:12,fontWeight:"700"}}>{id}</Text><Text style={{color:p.muted,fontSize:11}}>{count} · {formatRs(val)}</Text></View></View>)}</View></GlassCard>
    <GlassCard><SectionTitle>Loan summary</SectionTitle><View style={{flexDirection:"row",gap:10,marginTop:12}}><LoanStat label="Given" value={formatRs(loanSummary.given)} tone={p.income}/><LoanStat label="Taken" value={formatRs(loanSummary.taken)} tone={p.expense}/><LoanStat label="Net" value={formatRs(loanSummary.given-loanSummary.taken)} tone={loanSummary.given-loanSummary.taken>=0?p.income:p.expense}/></View></GlassCard>
  </ScreenScroll><BottomTabs active="reports" onPress={name=>nav.go({name})}/></View>
}
function groupAmounts(rows:readonly (readonly [string,number])[]){const map=new Map<string,number>();rows.forEach(([k,v])=>map.set(k,(map.get(k)||0)+v));return Array.from(map.entries()).sort((a,b)=>b[1]-a[1])}
function groupTags(rows:Transaction[],tags:{id:string;name:string}[]){const m=new Map<string,{v:number;c:number}>();rows.forEach(t=>(t.tags?.length?t.tags:["Untagged"]).forEach(id=>{const name=id==="Untagged"?"Untagged":tags.find(x=>x.id===id)?.name||id;const cur=m.get(name)||{v:0,c:0};cur.v+=t.amount;cur.c++;m.set(name,cur)}));return Array.from(m.entries()).sort((a,b)=>b[1].v-a[1].v).map(([k,v])=>[k,v.v,v.c] as [string,number,number])}
function Bar({label,value,max,tone}:{label:string;value:number;max:number;tone:string}){const p=usePalette();return <View style={{marginTop:12}}><View style={ui.rowBetween}><Text style={{color:p.muted,fontSize:11}}>{label}</Text><Text style={{color:p.text,fontSize:11,fontWeight:"800"}}>{formatRs(value)}</Text></View><View style={[ui.barTrack,{backgroundColor:"rgba(255,255,255,0.08)"}]}><View style={[ui.barFill,{width:Math.max(3,(value/max)*100)+"%",backgroundColor:tone}]}/></View></View>}
function Breakdown({title,rows,lookup,total,tone}:{title:string;rows:[string,number][];lookup:(id:string)=>string;total:number;tone:string}){const p=usePalette();return <GlassCard><SectionTitle>{title}</SectionTitle>{rows.length===0?<Text style={{color:p.muted,fontSize:12,marginTop:10}}>Nothing to show.</Text>:<View style={{gap:11,marginTop:12}}>{rows.slice(0,8).map(([id,v])=><View key={id}><View style={ui.rowBetween}><Text style={{color:p.text,fontSize:12,fontWeight:"700"}}>{lookup(id)}</Text><Text style={{color:p.muted,fontSize:11}}>{formatRs(v)}</Text></View><View style={[ui.barTrack,{backgroundColor:"rgba(255,255,255,0.07)"}]}><View style={[ui.barFill,{width:Math.max(3,(v/Math.max(total,1))*100)+"%",backgroundColor:tone}]}/></View></View>)}</View>}</GlassCard>}

export function SettingsScreen({nav}:{nav:Nav}){
  const p=usePalette();const s=useStore();const [name,setName]=useState(s.settings.userName||"");const [lastBackup,setLastBackup]=useState("");const [addKind,setAddKind]=useState<"cat"|"method"|"source"|"tag"|null>(null);const [draft,setDraft]=useState("");
  const saveName=async()=>{await s.setUserName(name.trim());Alert.alert("Saved","Your display name was updated.");};
  const doExport=async()=>{try{await exportBackup(s);setLastBackup(new Date().toLocaleString());Alert.alert("Backup ready","The backup file was shared using the Android share sheet.");}catch(e){Alert.alert("Backup failed",String(e));}};
  const doImport=async()=>{try{const b=await importBackup();if(!b)return;Alert.alert("Restore backup","Choose how to restore this backup.",[{text:"Cancel",style:"cancel"},{text:"Merge",onPress:async()=>{await createSafetyBackup(s);await s.mergeSnapshot(b);Alert.alert("Restored","Backup data merged.");}},{text:"Replace all",style:"destructive",onPress:async()=>{await createSafetyBackup(s);await s.replaceSnapshot(b);Alert.alert("Restored","Your data was replaced by the backup.");}}]);}catch(e){Alert.alert("Import failed",String(e));}};
  const reset=()=>Alert.alert("Delete all data?","Everything on this device will be permanently erased.",[{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:async()=>{await s.resetAll();Alert.alert("Deleted","App reset to a fresh state.");}}]);
  return <View style={{flex:1}}><Header title="Settings" onBack={nav.back}/><ScreenScroll>
    <GlassCard large><Text style={[ui.eyebrow,{color:p.muted}]}>PROFILE</Text><View style={{marginTop:10}}><Field label="YOUR NAME" value={name} onChangeText={setName} placeholder="Sushil"/><View style={{marginTop:10}}><PrimaryButton onPress={()=>void saveName()}>Save name</PrimaryButton></View></View></GlassCard>
    <GlassCard><SectionTitle>Security</SectionTitle><View style={[ui.rowBetween,{marginTop:12}]}><View style={{flex:1,paddingRight:10}}><Text style={{color:p.text,fontWeight:"800"}}>App Lock</Text><Text style={{color:p.muted,fontSize:11,marginTop:3}}>Uses fingerprint, face or your device credential.</Text></View><Pressable onPress={async()=>{if(!s.settings.appLockEnabled){const LocalAuthentication=require("expo-local-authentication") as typeof import("expo-local-authentication");const result=await LocalAuthentication.authenticateAsync({promptMessage:"Enable Money Log lock"});if(!result.success)return;}await s.setAppLockEnabled(!s.settings.appLockEnabled)}} style={[ui.switch,{backgroundColor:s.settings.appLockEnabled?p.income:p.muted+"55"}]}><View style={[ui.switchKnob,{alignSelf:s.settings.appLockEnabled?"flex-end":"flex-start"}]}/></Pressable></View><View style={{marginTop:12}}><PrimaryButton secondary onPress={()=>void s.lockNow()}>Lock now</PrimaryButton></View></GlassCard>
    <GlassCard><SectionTitle>Backup & restore</SectionTitle><Text style={{color:p.muted,fontSize:11,marginTop:5}}>JSON schema v4. Includes transactions, loans, repayments, categories, tags, payment methods, income sources and settings.</Text><View style={{flexDirection:"row",gap:10,marginTop:12}}><View style={{flex:1}}><PrimaryButton onPress={()=>void doExport()}>Export</PrimaryButton></View><View style={{flex:1}}><PrimaryButton secondary onPress={()=>void doImport()}>Import</PrimaryButton></View></View>{lastBackup&&<Text style={{color:p.muted,fontSize:10,marginTop:8}}>Last export: {lastBackup}</Text>}</GlassCard>
    <ManageSection title="Categories" items={s.categories} removable addKind="cat" addKindState={addKind} setAddKind={setAddKind} draft={draft} setDraft={setDraft} onAdd={async()=>{if(draft.trim())await s.addCategory(draft.trim());setDraft("");setAddKind(null)}} onRemove={s.removeCategory}/>
    <ManageSection title="Payment methods" items={s.methods} removable addKind="method" addKindState={addKind} setAddKind={setAddKind} draft={draft} setDraft={setDraft} onAdd={async()=>{if(draft.trim())await s.addMethod(draft.trim());setDraft("");setAddKind(null)}} onRemove={s.removeMethod}/>
    <ManageSection title="Income sources" items={s.sources} removable addKind="source" addKindState={addKind} setAddKind={setAddKind} draft={draft} setDraft={setDraft} onAdd={async()=>{if(draft.trim())await s.addSource(draft.trim());setDraft("");setAddKind(null)}} onRemove={s.removeSource}/>
    <ManageTags tags={s.tags} addKindState={addKind} setAddKind={setAddKind} draft={draft} setDraft={setDraft} onAdd={async()=>{if(draft.trim())await s.addTag(draft.trim());setDraft("");setAddKind(null)}} onRemove={s.removeTag}/>
    <GlassCard><SectionTitle>About</SectionTitle><Text style={{color:p.text,fontSize:16,fontWeight:"900",marginTop:8}}>Sushil Money Log</Text><Text style={{color:p.muted,fontSize:11,marginTop:4}}>Private, local-first personal finance tracker.</Text><Text style={{color:p.muted,fontSize:11,marginTop:10}}>React Native + TypeScript · Expo SDK 57 · iOS-inspired glass UI</Text></GlassCard>
    <GlassCard style={{borderColor:p.danger+"45"}}><Text style={{color:p.danger,fontSize:14,fontWeight:"900"}}>Danger zone</Text><Text style={{color:p.muted,fontSize:11,marginTop:4}}>Delete every transaction, loan, repayment, taxonomy item and setting stored on this device.</Text><View style={{marginTop:12}}><PrimaryButton danger onPress={reset}>Delete all data</PrimaryButton></View></GlassCard>
  </ScreenScroll></View>
}
function ManageSection(props:any){const p=usePalette();const {title,items,addKind,addKindState,setAddKind,draft,setDraft,onAdd,onRemove}=props;return <GlassCard><SectionTitle right={<IconButton name="plus" onPress={()=>setAddKind(addKind)}/>}>{title}</SectionTitle><View style={{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10}}>{items.map((x:any)=><View key={x.id} style={{flexDirection:"row",alignItems:"center"}}><Chip label={x.name} subtle/><>{(!x.isDefault)&&<Pressable onPress={()=>void onRemove(x.id)}><Text style={{color:p.muted,marginLeft:-13,marginTop:-16,fontSize:17}}>×</Text></Pressable>}</></View>)}</View>{addKindState===addKind&&<View style={{flexDirection:"row",gap:8,marginTop:12}}><TextInput value={draft} onChangeText={setDraft} placeholder={"New "+title.toLowerCase().slice(0,-1)} placeholderTextColor={p.muted} style={[ui.input,{flex:1,color:p.text,backgroundColor:p.input,borderColor:p.border}]}/><PrimaryButton onPress={()=>void onAdd()}>Add</PrimaryButton></View>}</GlassCard>}
function ManageTags(props:any){const p=usePalette();const {tags,addKindState,setAddKind,draft,setDraft,onAdd,onRemove}=props;const visible=tags.filter((t:any)=>!t.deletedAt);return <GlassCard><SectionTitle right={<IconButton name="plus" onPress={()=>setAddKind("tag")}/>}>Tags</SectionTitle><Text style={{color:p.muted,fontSize:11,marginTop:4}}>Default tags are permanent. Custom tags can be removed without changing old entries.</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10}}>{visible.map((t:any)=><View key={t.id} style={{flexDirection:"row",alignItems:"center"}}><Chip label={t.name} subtle/>{!t.isDefault&&<Pressable onPress={()=>void onRemove(t.id)}><Text style={{color:p.muted,marginLeft:-13,marginTop:-16,fontSize:17}}>×</Text></Pressable>}</View>)}</View>{addKindState==="tag"&&<View style={{flexDirection:"row",gap:8,marginTop:12}}><TextInput value={draft} onChangeText={setDraft} placeholder="New tag" placeholderTextColor={p.muted} style={[ui.input,{flex:1,color:p.text,backgroundColor:p.input,borderColor:p.border}]}/><PrimaryButton onPress={()=>void onAdd()}>Add</PrimaryButton></View>}</GlassCard>}

export function RouteScreen({nav}:{nav:Nav}){
  const r=nav.route;
  if(r.name==="home")return <HomeScreen nav={nav}/>;
  if(r.name==="history")return <HistoryScreen nav={nav}/>;
  if(r.name==="loans")return <LoansScreen nav={nav}/>;
  if(r.name==="reports")return <ReportsScreen nav={nav}/>;
  if(r.name==="settings")return <SettingsScreen nav={nav}/>;
  if(r.name==="add")return <AddEntryScreen nav={nav} txId={r.txId} txType={r.txType}/>;
  if(r.name==="addLoan")return <AddLoanScreen nav={nav}/>;
  return <LoanDetailScreen nav={nav} loanId={r.loanId}/>;
}

const local=StyleSheet.create({});
const sStyle=StyleSheet.create({});
