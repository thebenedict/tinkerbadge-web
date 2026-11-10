// Keep an explicit choice within this tab and model snapshot.
// Restricted storage still leaves the default-off controls usable.
export function readAccessoryChoice(key,getStorage=()=>window.sessionStorage) {
  try{return getStorage().getItem(key)==='true';}catch{return false;}
}
export function saveAccessoryChoice(key,visible,getStorage=()=>window.sessionStorage) {
  try{getStorage().setItem(key,String(Boolean(visible)));}catch{}
}
