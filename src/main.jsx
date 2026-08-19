import React,{useEffect,useRef,useState}from"react";
import{createRoot}from"react-dom/client";
import{Bot,FileText,Paperclip,Plus,Send,Settings,Sparkles,Trash2,Sun,Moon,Monitor}from"lucide-react";
import"./styles.css";

const API="http://localhost:8080/api";
const id=()=>crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const welcome=()=>({id:id(),role:"assistant",text:"Hi! Upload a PDF and ask me anything about it."});

function App(){
 const[theme,setTheme]=useState(()=>localStorage.getItem("insightdocs-theme")||"light");
 const[chats,setChats]=useState(()=>{try{return JSON.parse(localStorage.getItem("insightdocs-chats"))||[]}catch{return[]}});
 const[activeChatId,setActiveChatId]=useState(()=>localStorage.getItem("insightdocs-active-chat")||null);
 const[doc,setDoc]=useState(null);
 const[messages,setMessages]=useState([welcome()]);
 const[q,setQ]=useState("");
 const[uploading,setUploading]=useState(false);
 const[thinking,setThinking]=useState(false);
 const[error,setError]=useState("");
 const[showSettings,setShowSettings]=useState(false);
 const[fileRef,useRefDummy]=[useRef(),null];
 const bottom=useRef();

 useEffect(()=>{document.documentElement.setAttribute("data-theme",theme);localStorage.setItem("insightdocs-theme",theme)},[theme]);
 useEffect(()=>{localStorage.setItem("insightdocs-chats",JSON.stringify(chats))},[chats]);
 useEffect(()=>{if(activeChatId)localStorage.setItem("insightdocs-active-chat",activeChatId)},[activeChatId]);

 useEffect(()=>{
   if(!activeChatId)return;
   setChats(old=>old.map(c=>c.id===activeChatId?{...c,title:c.title==="New conversation"?chatTitle(messages):c.title,messages,doc}:c));
   bottom.current?.scrollIntoView({behavior:"smooth"});
 },[messages,doc]);

 function chatTitle(ms){
   const m=ms.find(x=>x.role==="user");
   if(!m)return"New conversation";
   return m.text.length>32?m.text.slice(0,32)+"...":m.text;
 }

 function createChat(){
   const chat={id:id(),title:"New conversation",messages:[welcome()],doc:null};
   setChats(old=>[chat,...old]);
   setActiveChatId(chat.id);
   setMessages(chat.messages);
   setDoc(null);setQ("");setError("");
 }

 function openChat(chat){
   setActiveChatId(chat.id);
   setMessages(chat.messages?.length?chat.messages:[welcome()]);
   setDoc(chat.doc||null);setQ("");setError("");
 }

 function deleteChat(chatId){
   const remaining=chats.filter(c=>c.id!==chatId);
   setChats(remaining);
   if(chatId===activeChatId){
     if(remaining.length)openChat(remaining[0]);
     else createChat();
   }
 }

 async function upload(file){
   if(!file)return;
   if(!file.name.toLowerCase().endsWith(".pdf")){setError("Please select a PDF file.");return}
   setError("");setUploading(true);
   const fd=new FormData();fd.append("file",file);
   try{
     const r=await fetch(API+"/documents/upload",{method:"POST",body:fd});
     const d=await r.json();
     if(!r.ok)throw Error(d.error||"Upload failed");
     setDoc(d);
    // setMessages([{id:id(),role:"assistant",text:`Document "${d.fileName}" is ready. It was indexed into ${d.chunks} searchable chunks. Ask me a question.`}]);
    setMessages([{
  id: id(),
  role: "assistant",
  text: `Document "${d.fileName}" uploaded successfully. Ask me a question.`
}]);
   }catch(e){setError(e.message)}finally{setUploading(false)}
 }

 async function send(){
   const text=q.trim();
   if(!text||thinking)return;
   setMessages(x=>[...x,{id:id(),role:"user",text}]);
   setQ("");setThinking(true);setError("");
   try{
     const r=await fetch(API+"/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:doc?.documentId||null,question:text})});
     const d=await r.json();
     if(!r.ok)throw Error(d.error||"Chat failed");
     setMessages(x=>[...x,{id:id(),role:"assistant",text:d.answer,sources:d.sources||[]}]);
   }catch(e){setError(e.message)}finally{setThinking(false)}
 }

 function clearDocument(){
   setDoc(null);
   setMessages([{id:id(),role:"assistant",text:"The document was cleared. Upload another PDF when ready."}]);
 }

 return <div className="app">
  <aside className="sidebar">
   <div className="brand"><div className="brandIcon"><Sparkles size={18}/></div><span>InsightDocs</span></div>
   <button className="newChat" onClick={createChat}><Plus size={18}/>New chat</button>
   <div className="title">Chat history</div>
   <div className="chatHistory">
    {!chats.length&&<div className="emptyHistory">No previous chats</div>}
    {chats.map(chat=><div key={chat.id} className={`chatRow ${chat.id===activeChatId?"active":""}`}>
      <button className="chatItem" onClick={()=>openChat(chat)}><span className="dot"/><span className="chatTitle">{chat.title}</span></button>
      <button className="deleteChat" title="Delete chat" onClick={()=>deleteChat(chat.id)}><Trash2 size={14}/></button>
    </div>)}
   </div>
   <div className="bottom"><div className="docCard">
    <div className="docStatus"><span className="green"/>{doc?"Document ready":"No document"}</div>
    <div className="docName">{doc?.fileName||"Upload a PDF to begin"}</div>
    {doc&&<button className="remove" onClick={clearDocument}><Trash2 size={14}/>Remove</button>}
   </div></div>
  </aside>

  <main className="main">
   <header>
    <div><h1>InsightDocs</h1><p>{doc?`Ask questions about ${doc.fileName}`:"Upload a PDF and ask questions about it"}</p></div>
    <div className="settingsWrapper">
     <button className="settings" onClick={()=>setShowSettings(v=>!v)} title="Settings"><Settings size={18}/></button>
     {showSettings&&<div className="settingsMenu">
      <div className="settingsTitle">Theme</div>
      <button className={`themeOption ${theme==="light"?"selected":""}`} onClick={()=>setTheme("light")}><Sun size={16}/>Light</button>
      <button className={`themeOption ${theme==="dark"?"selected":""}`} onClick={()=>setTheme("dark")}><Moon size={16}/>Dark</button>
      <button className={`themeOption ${theme==="system"?"selected":""}`} onClick={()=>setTheme("system")}><Monitor size={16}/>System</button>
     </div>}
    </div>
   </header>

   <section className="messages"><div className="container">
    {messages.map(m=><Message key={m.id} m={m}/>)}
    {thinking&&<div className="message"><div className="avatar bot"><Bot size={18}/></div><div><div className="role">Assistant</div><div className="typing"><i/><i/><i/></div></div></div>}
    <div ref={bottom}/>
   </div></section>

   <div className="composerArea">
    {error&&<div className="error">{error}</div>}
    <div className="composer">
     <input ref={fileRef} hidden type="file" accept=".pdf,application/pdf" onChange={e=>upload(e.target.files?.[0])}/>
     <button className="attach" disabled={uploading} onClick={()=>fileRef.current?.click()} title="Upload PDF"><Paperclip size={19}/></button>
     <textarea value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder={doc?"Message InsightDocs...":"Upload a PDF or say hi..."} rows="1"/>
     <button className="send" disabled={!q.trim()||thinking} onClick={send}>{thinking?"...":<Send size={18}/>}</button>
    </div>
    <div className="hint">{uploading?"Uploading, extracting text, creating embeddings and indexing...":"Answers about documents are based on the uploaded PDF. Press Enter to send."}</div>
   </div>
  </main>
 </div>
}

function Message({m}){
 return <div className="message">
  <div className={`avatar ${m.role==="user"?"user":"bot"}`}>{m.role==="user"?"You":<Bot size={18}/>}</div>
  <div className="body"><div className="role">{m.role==="user"?"You":"Assistant"}</div><div className="text">{m.text}</div>
   {m.sources?.length>0&&<div className="sources">{m.sources.map((s,i)=><span key={i}><FileText size={13}/>{s.fileName} · page {s.page}</span>)}</div>}
  </div>
 </div>
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
