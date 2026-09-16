const API_URL="https://priyanshu-secure-auth.onrender.com";
const TOKEN_KEY="priynashu_access_token";
const USER_KEY="priynashu_user";
const $=s=>document.querySelector(s);
function setMsg(el,msg,ok=false){if(!el)return;el.textContent=msg;el.className=ok?"form-message success":"form-message error";}
async function api(path,options={}){const headers={"Content-Type":"application/json",...(options.headers||{})};const token=sessionStorage.getItem(TOKEN_KEY);if(token)headers.Authorization=`Bearer ${token}`;const r=await fetch(API_URL+path,{...options,headers});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.message||"Request failed");return d;}
function saveAuth(d){if(d.token)sessionStorage.setItem(TOKEN_KEY,d.token);if(d.user)sessionStorage.setItem(USER_KEY,JSON.stringify(d.user));}
function goDashboard(){location.href="dashboard.html";}
document.addEventListener("DOMContentLoaded",()=>{
 const loginForm=$("#loginForm"), registerForm=$("#registerForm"), forgot=$("#forgotPassword"), registerLink=$("#registerLink"), modal=$("#registerModal"), close=$("#registerClose");
 registerLink?.addEventListener("click",e=>{e.preventDefault();if(modal)modal.style.display="flex"});close?.addEventListener("click",()=>{if(modal)modal.style.display="none"});
 loginForm?.addEventListener("submit",async e=>{e.preventDefault();const email=$("#loginEmail")?.value,password=$("#loginPassword")?.value;try{const d=await api("/api/login",{method:"POST",body:JSON.stringify({email,password})});saveAuth(d);goDashboard()}catch(err){setMsg($("#loginMessage"),err.message)}});
 registerForm?.addEventListener("submit",async e=>{e.preventDefault();const name=$("#registerName")?.value,email=$("#registerEmail")?.value,password=$("#registerPassword")?.value;try{const d=await api("/api/register",{method:"POST",body:JSON.stringify({name,email,password})});if(modal)modal.style.display="none";alert(d.message||"Account created successfully. You can now log in.");}catch(err){setMsg($("#registerMessage"),err.message)}});
 forgot?.addEventListener("click",async e=>{e.preventDefault();const email=prompt("Enter your registered email:");if(!email)return;try{const d=await api("/api/forgot-password",{method:"POST",body:JSON.stringify({email})});alert(d.message||"If the account exists, recovery instructions have been sent.");}catch(err){alert(err.message)}});
});
