import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { AppState, BackupPayload } from "./types";
import { PREFIX, normalizeBackup } from "./store";

export const SCHEMA_VERSION = 4;
export const APP_VERSION = "1.0.0";

export async function buildBackup(state: AppState): Promise<BackupPayload> {
  const extras: Record<string, unknown> = {};
  const keys = await AsyncStorage.getAllKeys();
  const known = new Set(["categories","methods","sources","tags","transactions","parties","loans","repayments","settings"]);
  for (const fullKey of keys) {
    if (!fullKey.startsWith(PREFIX)) continue;
    const key = fullKey.slice(PREFIX.length);
    if (known.has(key) || key === "lastBackupAt" || key === "autoBackup" || key === "autoBackupAt") continue;
    try {
      const raw = await AsyncStorage.getItem(fullKey);
      if (raw != null) extras[key] = JSON.parse(raw);
    } catch {}
  }
  return {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    data: {
      categories: state.categories, methods: state.methods, sources: state.sources,
      tags: state.tags, transactions: state.transactions, parties: state.parties,
      loans: state.loans, repayments: state.repayments, settings: state.settings,
    },
    extras: Object.keys(extras).length ? extras : undefined,
  };
}

export function validateBackup(value: unknown): asserts value is BackupPayload {
  if (!value || typeof value !== "object") throw new Error("Invalid backup file.");
  const b = value as BackupPayload;
  if (typeof b.schemaVersion !== "number") throw new Error("Missing schemaVersion.");
  if (b.schemaVersion > SCHEMA_VERSION) throw new Error("This backup was created by a newer version of Money Log.");
  if (!b.data || typeof b.data !== "object") throw new Error("Missing data section.");
  const d = b.data;
  for (const key of ["categories","transactions","parties","loans","repayments"] as const) {
    if (!Array.isArray(d[key])) throw new Error("Backup field " + key + " must be an array.");
  }
  if (!Array.isArray(d.methods)) d.methods = [];
  if (!Array.isArray(d.sources)) d.sources = [];
  if (!Array.isArray(d.tags)) d.tags = [];
  if (!d.settings || typeof d.settings !== "object") d.settings = { appLockEnabled: false };
}

export async function exportBackup(state: AppState) {
  const payload = await buildBackup(state);
  const json = JSON.stringify(payload, null, 2);
  const filename = "mymoneylog_backup_" + new Date().toISOString().slice(0,10) + ".json";
  const base = FileSystem.cacheDirectory;
  if (!base) throw new Error("Device cache directory unavailable.");
  const uri = base + filename;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  await AsyncStorage.setItem(PREFIX + "lastBackupAt", new Date().toISOString());
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Export Money Log backup" });
  }
  return uri;
}

export async function importBackup(): Promise<BackupPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.[0]) return null;
  const text = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("The selected file is not valid JSON."); }
  validateBackup(parsed);
  return normalizeBackup(parsed);
}

export async function createSafetyBackup(state: AppState) {
  const payload = await buildBackup(state);
  await AsyncStorage.setItem(PREFIX + "autoBackup", JSON.stringify(payload));
  await AsyncStorage.setItem(PREFIX + "autoBackupAt", new Date().toISOString());
}
