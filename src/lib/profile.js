import AsyncStorage from "@react-native-async-storage/async-storage";
const PROFILE_KEY="snatch.profile.v1";
export async function getProfile(){try{return JSON.parse(await AsyncStorage.getItem(PROFILE_KEY))||{name:"",age:""}}catch{return{name:"",age:""}}}
export async function saveProfile(name,age){const profile={name:String(name).trim().slice(0,18),age:String(age).trim()};await AsyncStorage.setItem(PROFILE_KEY,JSON.stringify(profile));return profile}
export async function clearProfile(){await AsyncStorage.removeItem(PROFILE_KEY)}
