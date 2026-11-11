import AsyncStorage from "@react-native-async-storage/async-storage";
import { sanitizeDisplayName, sanitizeAge, isDisplayNameAllowed } from "./sanitize";
const PROFILE_KEY="snatch.profile.v1";
export async function getProfile(){
  try {
    const raw=JSON.parse(await AsyncStorage.getItem(PROFILE_KEY));
    return {name:sanitizeDisplayName(raw?.name),age:sanitizeAge(raw?.age)};
  } catch { return {name:"",age:""}; }
}
export async function saveProfile(name,age){
  const profile={name:sanitizeDisplayName(name),age:sanitizeAge(age)};
  if (profile.name && !isDisplayNameAllowed(profile.name)) throw new Error("Choose a different player name.");
  await AsyncStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
  return profile;
}
export async function clearProfile(){await AsyncStorage.removeItem(PROFILE_KEY)}
