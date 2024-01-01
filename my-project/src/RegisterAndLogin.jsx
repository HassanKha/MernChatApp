import axios from "axios";
import React, { useContext, useState } from "react";
import { UserContext } from "./UserContext";

export default function RegisterAndLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const { setLoggedUsername, setId } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLoginOrRegister === "register" ? "/register" : "/login";
    const { data } = await axios.post(url, {
      username: username,
      password: password,
    });

    setLoggedUsername(username);
    setId(data.id);
  };
  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form onSubmit={handleSubmit} className="w-64 mx-auto mb-12">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          placeholder="username"
          className="rounded-sm border block w-full p-2 mb-2"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="password"
          className="block border mb-2 w-full rounded-sm p-2"
        />
        <button className="block rounded-sm bg-blue-500 text-white p-2  w-full">
          {isLoginOrRegister === "register" ? "Register" : "Login"}
        </button>
        {isLoginOrRegister === "register" && (
          <div className="text-center mt-2">
            Already a member?{" "}
            <button onClick={() => setIsLoginOrRegister("login")}>
              Login Here
            </button>
          </div>
        )}
        {isLoginOrRegister === "login" && (
          <div className="text-center mt-2">
            Don't have an Account?{" "}
            <button onClick={() => setIsLoginOrRegister("register")}>
              Register Here
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
