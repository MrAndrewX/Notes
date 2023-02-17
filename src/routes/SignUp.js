import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../signup.css";

function SignUp() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/notes");
    }
  }, [navigate]);
  const handleSubmit = (event) => {
    event.preventDefault();

    if (password !== repeatPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (username.length === 0 || password.length === 0) {
      setErrorMessage("Username and password cannot be empty");
      return;
    }

    fetch("http://localhost:8080/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 409) {
            setErrorMessage("Username already exists");
            return;
          }
          throw new Error("Sign up failed");
        }
        setSuccessMessage("Sign up successful");
        navigate("/login");
      })
      .catch((error) => {
        setErrorMessage(error.message);
      });
  };

  return (
    <div className="signup-container">
      <form onSubmit={handleSubmit} className="signup-form">
        <div className="form-control">
          <label>
            Username:
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
        </div>
        <div className="form-control">
          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>
        <div className="form-control">
          <label>
            Repeat Password:
            <input
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
            />
          </label>
        </div>
        <div className="form-control">
          <button type="submit" className="submit-button">
            Sign Up
          </button>
        </div>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
      </form>
    </div>
  );
}

export default SignUp;
