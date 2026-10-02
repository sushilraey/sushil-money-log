import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState as RNAppState, BackHandler, StatusBar, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Background, GlassCard, Glyph, PrimaryButton, usePalette, ui } from "./src/ui";
import { RouteScreen, Route, ScreenName, Nav } from "./src/screens";
import type { AppActions, AppState } from "./src/store";
import { StoreContext, PREFIX, calcSavingsBalance, loadAll, loanStatus, loanTotals, uid } from "./src/store";
import { theme } from "./src/theme";
import type { BackupPayload } from "./src/types";

const blankState: AppState = {
  hydrated: false,
  categories: [],
  methods: [],
  sources: [],
  tags: [],
  transactions: [],
  parties: [],
  loans: [],
  repayments: [],
  settings: { appLockEnabled: false },
};

export default function App(){
  const [state,setState]=useState<AppState>(blankState);
  const stateRef=useRef(state);
  stateRef.current=state;
  const [route,setRoute]=useState<Route>({name:"home"});
  const [showSplash,setShowSplash]=useState(true);
  const [authBusy,setAuthBusy]=useState(false);
  const p=theme.dark;

  const persist=async(patch:Partial<AppState>)=>{
    const next={...stateRef.current,...patch};
    stateRef.current=next;
    setState(next);
    await Promise.all(Object.entries(patch).map(([k,v])=>AsyncStorage.setItem(PREFIX+k,JSON.stringify(v))));
  };

  const actions:AppActions=useMemo(()=>({
    hydrate:async()=>{const next=await loadAll();stateRef.current=next;setState(next);},
    addTransaction:async(input)=>{const now=new Date().toISOString();await persist({transactions:[{...input,id:uid(),createdAt:now,updatedAt:now},...stateRef.current.transactions]});},
    updateTransaction:async(id,patch)=>persist({transactions:stateRef.current.transactions.map(t=>t.id===id?{...t,...patch,updatedAt:new Date().toISOString()}:t)}),
    deleteTransaction:async id=>persist({transactions:stateRef.current.transactions.filter(t=>t.id!==id)}),
    addLoan:async input=>{const now=new Date().toISOString(),partyId=uid(),loanId=uid();const s=stateRef.current;await persist({parties:[...s.parties,{id:partyId,name:input.partyName,phone:input.phone}],loans:[{id:loanId,partyId,direction:input.direction,principal:input.principal,startDate:input.startDate,dueDate:input.dueDate,purpose:input.purpose,note:input.note,paymentMethodId:input.paymentMethodId,createdAt:now,updatedAt:now},...s.loans]});return loanId;},
    updateLoan:async(id,patch)=>persist({loans:stateRef.current.loans.map(l=>l.id===id?{...l,...patch,updatedAt:new Date().toISOString()}:l)}),
    deleteLoan:async id=>persist({loans:stateRef.current.loans.filter(l=>l.id!==id),repayments:stateRef.current.repayments.filter(r=>r.loanId!==id)}),
    addRepayment:async input=>persist({repayments:[{...input,id:uid(),createdAt:new Date().toISOString()},...stateRef.current.repayments]}),
    addCategory:async name=>{const s=stateRef.current,id=name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||uid();if(s.categories.some(c=>c.id===id))return;await persist({categories:[...s.categories,{id,name}]});},
    removeCategory:async id=>{if(["food","health","travel","education","mobile-internet","entertainment","caring-sharing","family","friends","business","investment","other"].includes(id))return;const s=stateRef.current;await persist({categories:s.categories.filter(c=>c.id!==id)});const raw=await AsyncStorage.getItem(PREFIX+"deletedCategoryIds");const ids=raw?JSON.parse(raw):[];if(!ids.includes(id))await AsyncStorage.setItem(PREFIX+"deletedCategoryIds",JSON.stringify([...ids,id]));},
    addMethod:async name=>{const s=stateRef.current,id=name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||uid();if(s.methods.some(m=>m.id===id))return;await persist({methods:[...s.methods,{id,name}]});},
    removeMethod:async id=>{if(["cash","esewa","khalti","o-wallet","bank","card"].includes(id))return;const s=stateRef.current;await persist({methods:s.methods.filter(m=>m.id!==id)});const raw=await AsyncStorage.getItem(PREFIX+"deletedMethodIds");const ids=raw?JSON.parse(raw):[];if(!ids.includes(id))await AsyncStorage.setItem(PREFIX+"deletedMethodIds",JSON.stringify([...ids,id]));},
    addSource:async name=>{const s=stateRef.current,id="src-"+(name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||uid());if(s.sources.some(x=>x.id===id))return;await persist({sources:[...s.sources,{id,name}]});},
    removeSource:async id=>{if(id==="src-savings"||["src-salary","src-business","src-freelance","src-family","src-friends","src-girlfriend","src-gift","src-other"].includes(id))return;const s=stateRef.current;await persist({sources:s.sources.filter(x=>x.id!==id)});},
    addTag:async(name,categoryId)=>{const s=stateRef.current;const ex=s.tags.find(t=>t.name.toLowerCase()===name.toLowerCase()&&(t.categoryId??null)===(categoryId??null));if(ex){if(ex.deletedAt)await persist({tags:s.tags.map(t=>t.id===ex.id?{...t,deletedAt:undefined}:t)});return ex.id;}const id=uid();await persist({tags:[...s.tags,{id,name,categoryId,createdAt:new Date().toISOString()}]});return id;},
    removeTag:async id=>{const s=stateRef.current;const t=s.tags.find(x=>x.id===id);if(!t||t.isDefault)return;await persist({tags:s.tags.map(x=>x.id===id?{...x,deletedAt:new Date().toISOString()}:x)});},
    setAppLockEnabled:async v=>persist({settings:{...stateRef.current.settings,appLockEnabled:v,lastUnlockedAt:v?Date.now():stateRef.current.settings.lastUnlockedAt}}),
    setUserName:async name=>persist({settings:{...stateRef.current.settings,userName:name}}),
    markUnlocked:async()=>persist({settings:{...stateRef.current.settings,lastUnlockedAt:Date.now()}}),
    lockNow:async()=>persist({settings:{...stateRef.current.settings,lastUnlockedAt:undefined}}),
    resetAll:async()=>{const keys=await AsyncStorage.getAllKeys();await AsyncStorage.multiRemove(keys.filter(k=>k.startsWith(PREFIX)));const next=await loadAll();stateRef.current=next;setState(next);},
    replaceSnapshot:async b=>{const {replaceData}=await import("./src/store");await replaceData(b);const next=await loadAll();stateRef.current=next;setState(next);},
    mergeSnapshot:async b=>{const {mergeData}=await import("./src/store");await mergeData(b);const next=await loadAll();stateRef.current=next;setState(next);}
  }),[]);

  useEffect(()=>{void actions.hydrate();const t=setTimeout(()=>setShowSplash(false),900);return()=>clearTimeout(t);},[]);
  const locked=state.hydrated && state.settings.appLockEnabled && !state.settings.lastUnlockedAt;

  const authenticate=async()=>{
    if(authBusy)return;
    setAuthBusy(true);
    try{
      const result=await LocalAuthentication.authenticateAsync({
        promptMessage:"Unlock Sushil Money Log",
        cancelLabel:"Cancel",
        disableDeviceFallback:false,
      });
      if(result.success)await actions.markUnlocked();
    }finally{setAuthBusy(false);}
  };

  useEffect(()=>{
    if(locked){const t=setTimeout(()=>void authenticate(),300);return()=>clearTimeout(t);}
  },[locked]);

  useEffect(()=>{
    let backgroundedAt:number|null=null;
    const sub=RNAppState.addEventListener("change",next=>{
      if(next==="background"||next==="inactive")backgroundedAt=Date.now();
      if(next==="active"&&backgroundedAt!==null){
        if(stateRef.current.settings.appLockEnabled&&Date.now()-backgroundedAt>=15000)void actions.lockNow();
        backgroundedAt=null;
      }
    });
    return()=>sub.remove();
  },[actions]);

  useEffect(()=>{
    const sub=BackHandler.addEventListener("hardwareBackPress",()=>{
      if(route.name==="home")return false;
      if(route.from){setRoute({name:route.from});return true;}
      setRoute({name:"home"});return true;
    });
    return()=>sub.remove();
  },[route]);

  const nav:Nav={
    route,
    go:(next)=>setRoute(next),
    back:()=>{
      if(route.from)setRoute({name:route.from});else if(["history","loans","reports","settings"].includes(route.name))setRoute({name:"home"});else setRoute({name:"home"});
    }
  };

  return <StoreContext.Provider value={{...state,...actions}}>
    <Background>
      <StatusBar barStyle="light-content" backgroundColor={p.bg}/>
      {showSplash||!state.hydrated?<Splash/>:locked?<LockScreen busy={authBusy} onUnlock={()=>void authenticate()}/>:<RouteScreen nav={nav}/>}
    </Background>
  </StoreContext.Provider>
}

function Splash(){
  const p=theme.dark;
  return <View style={ui.center}><View style={[ui.splashOrb,{backgroundColor:p.primary+"26",borderColor:p.primary+"70"}]}><Glyph name="money" size={42} color={p.primary}/></View><Text style={{color:p.text,fontSize:28,fontWeight:"900",marginTop:22,letterSpacing:-0.7}}>Sushil Money Log</Text><Text style={{color:p.muted,fontSize:12,marginTop:6}}>Track smart. Save better.</Text></View>
}
function LockScreen({busy,onUnlock}:{busy:boolean;onUnlock:()=>void}){
  const p=theme.dark;
  return <View style={ui.center}><GlassCard large style={{width:"100%",maxWidth:390}}><View style={{alignItems:"center"}}><View style={[ui.splashOrb,{width:82,height:82,backgroundColor:p.primary+"20",borderColor:p.primary+"55"}]}><Glyph name="lock" size={34} color={p.primary}/></View><Text style={{color:p.text,fontSize:28,fontWeight:"900",marginTop:18}}>App Locked</Text><Text style={{color:p.muted,fontSize:12,textAlign:"center",marginTop:6,lineHeight:18}}>Authenticate with fingerprint, face, or your device credential to continue.</Text><View style={{width:"100%",marginTop:22}}><PrimaryButton onPress={onUnlock} disabled={busy}>{busy?"Authenticating...":"Unlock Money Log"}</PrimaryButton></View></View></GlassCard></View>
}
