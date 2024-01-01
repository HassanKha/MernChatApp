import React, { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import uniqBy from "lodash/uniqBy";
import axios from "axios";
import Contact from "./Contact";
export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessagText, setNewMessagText] = useState("");
  const { username, id ,setId,setLoggedUsername} = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [offlinePeople, setOfflinePeople] = useState([])
  const messagesBoxRef = useRef();
  useEffect(() => {
    connectToWs()
  }, []);

  function connectToWs() {
    const ws = new WebSocket("ws://localhost:3000");

    setWs(ws);

    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", ()=> {
        setTimeout(()=>{
console.log("disConnection")
connectToWs()
        },1000);
    });

  }

  const ShowOnline = (PeopleArr) => {
    const People = {};
    PeopleArr.forEach((p) => {
      People[p.userId] = p.username;
    });

    setOnlinePeople(People);
  };

  function handleMessage(e) {
    const messageData = JSON.parse(e.data);
    // console.log(messageData);
    if ("online" in messageData) {
      ShowOnline(messageData.online);
    } else if ("text" in messageData) {
      console.log({ messageData });
      setMessages((prev) => [...prev, { ...messageData, isOur: false }]);
    }
  }

  const SendMessage = (e, file=null) => {
   if(e) e.preventDefault();

    ws.send(
      JSON.stringify({
        message: {
          recipient: selectedUserId,
          text: newMessagText,
          file,
        },
      })
    );

    // setNewMessagText("");
    // setMessages((prev) => [
    //   ...prev,
    //   {
    //     text: newMessagText,
    //     sender: id,
    //     recipient: selectedUserId,
    //     isOur: true,
    //   },
    // ]);
    if (file) {
        axios.get('/messages/'+selectedUserId).then(res => {
          setMessages(res.data);
        });
      } else {
        setNewMessagText('');
        setMessages(prev => ([...prev,{
          text: newMessagText,
          sender: id,
          recipient: selectedUserId,
         // _id: Date.now(),
        }]));
      }

  };
  useEffect(() => {
    const div = messagesBoxRef.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);


useEffect(() =>{
if(selectedUserId) {

   axios.get('/messages/'+selectedUserId).then(res=> {
    setMessages(res.data)
  });
  
}
},[selectedUserId])


useEffect(()=> {
axios.get('/people').then(res=> {
    const OfflinePeople = res.data.filter(p=> p._id!==id).filter(p=>!Object.keys(onlinePeople).includes(p._id))
    const offlinePeople = {};
    OfflinePeople.forEach(p => {
        offlinePeople[p._id] = p;
      });
      console.log(offlinePeople)
    setOfflinePeople(offlinePeople)
})

},[onlinePeople])


const logout = () => {
    axios.post('/logout').then(()=> {
        setWs(null);
        setId(null);
        setLoggedUsername(null);
    })
}

function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
        SendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  const OnlinePeopleExclOurUser = { ...onlinePeople };
  delete OnlinePeopleExclOurUser[id];

  const messagesWithoutDupes = [];
  const idSet = new Set();

  messages.forEach((message) => {
    if (message.id !== undefined && !idSet.has(message.id)) {
      // If the message has an id and it's not in the set, add it to the uniqueMessages array
      messagesWithoutDupes.push(message);
      idSet.add(message.id);
    } else if (message.id === undefined) {
      // If the message doesn't have an id, add it to the uniqueMessages array
      messagesWithoutDupes.push(message);
    }
  });

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 pl-4 pt-4 flex flex-col">
      <div className="flex-grow">
        <Logo />
        {Object.keys(OnlinePeopleExclOurUser).map(userId => (
            <Contact
              key={userId}
              id={userId}
              online={true}
              username={OnlinePeopleExclOurUser[userId]}
              onClick={() => {setSelectedUserId(userId);console.log({userId})}}
              selected={userId === selectedUserId} />
          ))}
          {Object.keys(offlinePeople).map(userId => (
            <Contact
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId].username}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId} />
          ))}
          </div>
          <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-2 text-sm text-gray-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm">logout</button>
        </div>
      </div>
      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex flex-grow h-full items-center justify-center">
              <div className="text-gray-300">
                {" "}
                &larr; Select a Person from the sidebar
              </div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full ">
              <div className="overflow-y-scroll absolute inset-0 top-0 left-0 right-0 bottom-2 ">
                {messagesWithoutDupes.map((message, i) => (
                  <div
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      className={
                        " text-left inline-block p-2 my-2 rounded-sm " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                      key={i}
                    >
                      {message.sender === id ? "ME:" : ""} {message.text}
                      {message.file &&
                     <div className="">
                     <a target="_blank" className="flex items-center gap-1 border-b" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                         <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
                       </svg>
                       {message.file}
                     </a>
                   </div>}
                    </div>
                  </div>
                ))}
                <div ref={messagesBoxRef}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form className="flex gap-2 mx-2" onSubmit={SendMessage}>
            <input
              onChange={(e) => setNewMessagText(e.target.value)}
              value={newMessagText}
              type="text"
              placeholder="Type your message here"
              className="bg-white border rounded-sm p-2 flex-grow"
            />
  <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200">
              <input type="file" className="hidden" onChange={sendFile} />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
              </svg>
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 rounded-sm text-white"
            >


              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
