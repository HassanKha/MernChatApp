import React, { useContext } from 'react'
import { UserContext } from './UserContext'
import RegisterAndLogin from './RegisterAndLogin'
import Chat from './Chat'

export default function Routes() {

    const {username , id} = useContext(UserContext)
    console.log(username)

    if(username) {
        return <Chat/>
    }
  return (
   <RegisterAndLogin/>
  )
}
