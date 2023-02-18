import React, { useState, useEffect } from "react";
import "../login.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.status === 401) {
        throw new Error("Password or username is incorrect");
      }
      if (!response.ok) {
        throw new Error(data.message);
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("expiration", data.expiration);
      navigate("/notes");
    } catch (error) {
      if (
        error.message ===
        "JSON.parse: unexpected end of data at line 1 column 1 of the JSON data"
      ) {
        setError("Username or password is incorrect");
        return;
      }
      setError(error.message);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/notes");
    }
  }, [navigate]);

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">Login</h1>
        <div className="form-control">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="form-control">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="submit-button">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
