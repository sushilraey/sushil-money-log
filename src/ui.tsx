import React, { createContext, useContext, useRef } from "react";
import {
  Pressable, StyleSheet, Text, TextInput, View, ViewStyle, TextStyle, Modal,
  FlatList, ActivityIndicator, ScrollView,
} from "react-native";
import { BlurView, BlurTargetView } from "expo-blur";
import { Palette, theme } from "./theme";

const PaletteContext = createContext<Palette>(theme.dark);
const BlurContext = createContext<React.RefObject<any> | null>(null);

export const usePalette = () => useContext(PaletteContext);
export const useBlurTarget = () => useContext(BlurContext);

export function VisualProvider({children, targetRef}:{children:React.ReactNode;targetRef:React.RefObject<any>}){
  const p=theme.dark;
  return (
    <PaletteContext.Provider value={p}>
      <BlurContext.Provider value={targetRef}>{children}</BlurContext.Provider>
    </PaletteContext.Provider>
  );
}

export function Background({children}:{children:React.ReactNode}){
  const targetRef=useRef<any>(null);
  return (
    <View style={[ui.root,{backgroundColor:theme.dark.bg}]}>
      <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
        <View style={[ui.blob,{width:290,height:290,left:-110,top:-90,backgroundColor:"#6E59FF"}]}/>
        <View style={[ui.blob,{width:250,height:250,right:-100,top:150,backgroundColor:"#19C6B2"}]}/>
        <View style={[ui.blob,{width:260,height:260,left:70,bottom:-170,backgroundColor:"#3F6CFF"}]}/>
        <View style={[StyleSheet.absoluteFill,{backgroundColor:"rgba(7,10,24,0.56)"}]}/>
      </BlurTargetView>
      <VisualProvider targetRef={targetRef}>{children}</VisualProvider>
    </View>
  );
}

export function GlassCard({children,style,large=false}:{children:React.ReactNode;style?:ViewStyle|ViewStyle[];large?:boolean}){
  const p=usePalette(),target=useBlurTarget();
  return (
    <BlurView
      intensity={70}
      tint="dark"
      blurMethod="dimezisBlurViewSdk31Plus"
      blurTarget={target ?? undefined}
      style={[ui.glass,{borderColor:p.border,borderRadius:large?28:20},style]}
    >
      <View style={ui.glassInner}>{children}</View>
    </BlurView>
  );
}

export function SectionTitle({children,right}:{children:React.ReactNode;right?:React.ReactNode}){
  const p=usePalette();
  return <View style={ui.rowBetween}><Text style={[ui.sectionTitle,{color:p.text}]}>{children}</Text>{right}</View>;
}

export function Glyph({name,size=21,color}:{name:string;size?:number;color?:string}){
  const p=usePalette();
  const map:Record<string,string>={
    home:"⌂",history:"◷",loans:"↔",reports:"▥",settings:"⚙",lock:"⌑",back:"‹",plus:"＋",
    income:"↗",expense:"↘",money:"₨",save:"◈",search:"⌕",filter:"≡",edit:"✎",delete:"⌫",
    add:"＋",user:"◉",phone:"◌",calendar:"□",chevron:"›",check:"✓",close:"×",wallet:"◫",
    tag:"#",shield:"◇",contact:"◎",info:"ⓘ",refresh:"↻",arrow:"→",
  };
  return <Text style={{fontSize:size,color:color??p.text,fontWeight:"600",lineHeight:size+3}}>{map[name]??"•"}</Text>;
}

export function IconButton({name,onPress,active=false,danger=false}:{name:string;onPress:()=>void;active?:boolean;danger?:boolean}){
  const p=usePalette();
  return <Pressable onPress={onPress} style={({pressed})=>[ui.iconButton,{backgroundColor:active?p.primary+"25":"rgba(255,255,255,0.06)",borderColor:p.border,opacity:pressed?0.7:1},danger&&{backgroundColor:p.danger+"18"}]}><Glyph name={name} color={danger?p.danger:active?p.primary:p.text}/></Pressable>
}

export function Chip({label,selected=false,onPress,subtle=false}:{label:string;selected?:boolean;onPress?:()=>void;subtle?:boolean}){
  const p=usePalette();
  const inner=<View style={[ui.chip,{backgroundColor:selected?p.primary+"24":subtle?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.07)",borderColor:selected?p.primary+"75":p.border}]}><Text style={[ui.chipText,{color:selected?p.primary:p.text}]}>{label}</Text></View>;
  return onPress?<Pressable onPress={onPress}>{inner}</Pressable>:inner;
}

export function PrimaryButton({children,onPress,disabled=false,secondary=false,danger=false}:{children:React.ReactNode;onPress:()=>void;disabled?:boolean;secondary?:boolean;danger?:boolean}){
  const p=usePalette();
  const background=danger?p.danger:secondary?"rgba(255,255,255,0.08)":p.primary;
  return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[ui.button,{backgroundColor:background,borderColor:danger?p.danger:p.border,opacity:disabled?0.42:pressed?0.76:1}]}><Text style={[ui.buttonText,{color:secondary?p.text:"#FFFFFF"}]}>{children}</Text></Pressable>
}

export function Field({label,value,onChangeText,placeholder="",keyboardType="default",secureTextEntry=false,multiline=false,editable=true}:{label:string;value:string;onChangeText?:(v:string)=>void;placeholder?:string;keyboardType?:"default"|"numeric"|"phone-pad";secureTextEntry?:boolean;multiline?:boolean;editable?:boolean}){
  const p=usePalette();
  return <View style={{gap:7}}><Text style={[ui.fieldLabel,{color:p.muted}]}>{label}</Text><TextInput
    value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={p.muted+"B0"}
    keyboardType={keyboardType} secureTextEntry={secureTextEntry} multiline={multiline} editable={editable}
    style={[ui.input,{color:p.text,backgroundColor:p.input,borderColor:p.border},multiline&&{minHeight:92,textAlignVertical:"top"}]}
  /></View>
}

export function ScreenScroll({children,contentStyle}:{children:React.ReactNode;contentStyle?:ViewStyle}){
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[{padding:18,paddingBottom:120,gap:16},contentStyle]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
}

export function Header({title,onBack,onSettings,onLock}:{title:string;onBack?:()=>void;onSettings?:()=>void;onLock?:()=>void}){
  const p=usePalette();
  return <View style={[ui.header,{borderBottomColor:p.border}]}>
    <View style={ui.headerLeft}>{onBack&&<IconButton name="back" onPress={onBack}/>}<View><Text style={[ui.eyebrow,{color:p.muted}]}>SUSHIL MONEY LOG</Text><Text style={[ui.headerTitle,{color:p.text}]}>{title}</Text></View></View>
    <View style={{flexDirection:"row",gap:8}}>{onLock&&<IconButton name="lock" onPress={onLock}/>} {onSettings&&<IconButton name="settings" onPress={onSettings}/>}</View>
  </View>
}

export function BottomTabs({active,onPress}:{active:"home"|"history"|"loans"|"reports";onPress:(name:"home"|"history"|"loans"|"reports")=>void}){
  const p=usePalette();
  const tabs=[["home","Home"],["history","History"],["loans","Loans"],["reports","Reports"]] as const;
  return <BlurView intensity={76} tint="dark" style={[ui.bottomBar,{borderColor:p.border}]}>
    {tabs.map(([key,label])=><Pressable key={key} onPress={()=>onPress(key)} style={ui.tab}>
      <View style={[ui.tabIcon,{backgroundColor:active===key?p.primary+"25":"transparent"}]}><Glyph name={key} size={20} color={active===key?p.primary:p.muted}/></View>
      <Text style={[ui.tabText,{color:active===key?p.text:p.muted}]}>{label}</Text>
    </Pressable>)}
  </BlurView>
}

export function Loading(){const p=usePalette();return <View style={ui.center}><ActivityIndicator color={p.primary} size="large"/></View>}

export function SelectorModal({visible,title,options,value,onSelect,onClose,searchable=false}:{visible:boolean;title:string;options:{id:string;label:string}[];value?:string;onSelect:(id:string)=>void;onClose:()=>void;searchable?:boolean}){
  const p=usePalette(); const [q,setQ]=React.useState("");
  const list=options.filter(o=>o.label.toLowerCase().includes(q.toLowerCase()));
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={ui.modalBackdrop}><GlassCard large style={ui.modalCard}>
      <View style={ui.rowBetween}><Text style={[ui.modalTitle,{color:p.text}]}>{title}</Text><IconButton name="close" onPress={onClose}/></View>
      {searchable&&<TextInput value={q} onChangeText={setQ} placeholder="Search..." placeholderTextColor={p.muted} style={[ui.input,{color:p.text,backgroundColor:p.input,borderColor:p.border,marginTop:12}]}/>}
      <FlatList data={list} keyExtractor={x=>x.id} style={{maxHeight:420,marginTop:10}} renderItem={({item})=><Pressable onPress={()=>{onSelect(item.id);onClose();}} style={[ui.option,{borderBottomColor:p.border}]}>
        <Text style={[ui.optionText,{color:p.text}]}>{item.label}</Text><Text style={{color:item.id===value?p.primary:p.muted,fontSize:18}}>{item.id===value?"✓":"›"}</Text>
      </Pressable>}/>
    </GlassCard></View>
  </Modal>
}

export function EmptyState({title,subtitle}:{title:string;subtitle?:string}){const p=usePalette();return <GlassCard style={{padding:24,alignItems:"center"}}><Glyph name="money" size={30} color={p.muted}/><Text style={[ui.emptyTitle,{color:p.text}]}>{title}</Text>{subtitle&&<Text style={[ui.emptySubtitle,{color:p.muted}]}>{subtitle}</Text>}</GlassCard>}

export const ui=StyleSheet.create({
  root:{flex:1,overflow:"hidden"},
  blob:{position:"absolute",borderRadius:999,opacity:0.72},
  center:{flex:1,alignItems:"center",justifyContent:"center"},
  glass:{overflow:"hidden",borderWidth:1,shadowColor:"#000",shadowOpacity:0.28,shadowRadius:16,shadowOffset:{width:0,height:8},elevation:8},
  glassInner:{padding:16},
  header:{paddingHorizontal:16,paddingTop:10,paddingBottom:12,borderBottomWidth:1,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  headerLeft:{flexDirection:"row",alignItems:"center",gap:10},
  headerTitle:{fontSize:22,fontWeight:"800",letterSpacing:-0.5},
  eyebrow:{fontSize:9,fontWeight:"700",letterSpacing:1.5},
  sectionTitle:{fontSize:17,fontWeight:"800",letterSpacing:-0.2},
  rowBetween:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  iconButton:{width:42,height:42,borderWidth:1,borderRadius:21,alignItems:"center",justifyContent:"center"},
  moneyHero:{fontSize:31,fontWeight:"900",letterSpacing:-1,marginTop:6},
  moneySmall:{fontSize:20,fontWeight:"900",letterSpacing:-0.5,marginTop:7},
  mini:{fontSize:10,lineHeight:15},
  statMini:{flex:1,minHeight:50,padding:10,borderWidth:1,borderRadius:15},
  orb:{width:50,height:50,borderRadius:25,borderWidth:1,alignItems:"center",justifyContent:"center"},
  quick:{flex:1,minHeight:70,borderWidth:1,borderRadius:18,alignItems:"center",justifyContent:"center",gap:6},
  txRow:{flexDirection:"row",alignItems:"center",gap:11},
  txIcon:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center"},
  txTitle:{fontSize:13,fontWeight:"800"},
  txMeta:{fontSize:10,marginTop:3},
  txAmount:{fontSize:12,fontWeight:"900"},
  searchInput:{flex:1,minHeight:42,paddingVertical:0,fontSize:13},
  picker:{minHeight:60,borderWidth:1,borderRadius:16,paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  segmented:{flexDirection:"row",padding:4,borderWidth:1,borderColor:"rgba(255,255,255,0.12)",backgroundColor:"rgba(255,255,255,0.05)",borderRadius:18},
  segment:{flex:1,minHeight:42,borderRadius:14,alignItems:"center",justifyContent:"center"},
  switch:{width:52,height:31,borderRadius:20,padding:3,justifyContent:"center"},
  switchKnob:{width:25,height:25,borderRadius:13,backgroundColor:"#fff"},
  nameTitle:{fontSize:22,fontWeight:"900",letterSpacing:-0.4,marginTop:4},
  loanStat:{flex:1,minHeight:58,padding:10,borderWidth:1,borderRadius:15},
  barTrack:{height:7,borderRadius:5,overflow:"hidden",marginTop:5},
  barFill:{height:"100%",borderRadius:5},
  splashOrb:{width:96,height:96,borderRadius:48,borderWidth:1,alignItems:"center",justifyContent:"center"},
  chip:{minHeight:36,paddingHorizontal:13,borderWidth:1,borderRadius:999,alignItems:"center",justifyContent:"center"},
  chipText:{fontSize:12,fontWeight:"700"},
  button:{minHeight:50,paddingHorizontal:18,borderRadius:18,borderWidth:1,alignItems:"center",justifyContent:"center"},
  buttonText:{fontSize:14,fontWeight:"800",letterSpacing:0.15},
  fieldLabel:{fontSize:11,fontWeight:"700",letterSpacing:0.4},
  input:{minHeight:48,borderWidth:1,borderRadius:16,paddingHorizontal:14,fontSize:15},
  modalBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.62)",justifyContent:"center",padding:18},
  modalCard:{maxHeight:"82%"},
  modalTitle:{fontSize:18,fontWeight:"800"},
  option:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1},
  optionText:{fontSize:14,fontWeight:"600"},
  emptyTitle:{marginTop:10,fontSize:16,fontWeight:"800",textAlign:"center"},
  emptySubtitle:{marginTop:5,fontSize:12,textAlign:"center",lineHeight:18},
  bottomBar:{position:"absolute",left:14,right:14,bottom:14,borderWidth:1,borderRadius:28,overflow:"hidden",height:72,flexDirection:"row",alignItems:"center",justifyContent:"space-around"},
  tab:{flex:1,alignItems:"center",gap:2},
  tabIcon:{width:44,height:32,borderRadius:16,alignItems:"center",justifyContent:"center"},
  tabText:{fontSize:10,fontWeight:"700"},
});
