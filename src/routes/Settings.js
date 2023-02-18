import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Settings() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [okmessage, setOk] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const fetchChangePassword = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/changepassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setOk(data.message);
        return;
      }
      setOk(data.message);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={fetchChangePassword}>
        <h1 className="login-title">Cambiar contraseña</h1>
        <div className="form-control">
          <label htmlFor="oldPassword">Contraseña antigua:</label>
          <input
            type="password"
            id="oldPassword"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
          />
        </div>
        <div className="form-control">
          <label htmlFor="newPassword">Contraseña nueva:</label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        {okmessage && <div className="ok-message">{okmessage}</div>}
        <button type="submit">Cambiar contraseña</button>
      </form>
    </div>
  );
}

export default Settings;
