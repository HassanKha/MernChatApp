import axios from "axios";
import { createContext, useEffect, useState } from "react";


export const UserContext = createContext({});

export const UserContextProvider = ({children}) => {
const [username, setLoggedUsername] = useState(null)
const [id,setId]= useState(null);

useEffect(() =>{
axios.get('/profile').then((response) =>{
    console.log(response.data)

    setId(response.data.userId)
    setLoggedUsername(response.data.username)
})
},[])

return (
    <UserContext.Provider value={{username,setLoggedUsername,setId,id}}>
        {children}
    </UserContext.Provider>
)
}