import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import _ from "lodash";
import "../notes.css";
import "../audiorecorder.css";

const handleUpdateNote = (updatedNote) => {
  fetch(`http://localhost:8080/notes/${updatedNote.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(updatedNote),
  }).then((res) => res.json());
};

const handleUpdateNoteDebounced = _.debounce(handleUpdateNote, 500);

/*GENERAR NOTAS FALSAS*/

/*------------------------------------------------------------------ */

function Notes() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (localStorage.getItem("expiration") < Date.now()) {
      alert("Su sesión ha expirado");
      localStorage.removeItem("token");
      localStorage.removeItem("expiration");
      navigate("/login");
      return;
    }

    // Verificar el token en el servidor
    fetch("http://localhost:8080/notes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          //Eliminar el token y la fecha de expiración
          localStorage.removeItem("token");
          localStorage.removeItem("expiration");
          throw new Error("Token invalido");
        }
      })
      .catch((error) => {
        console.error(error);
        navigate("/login");
      });
  }, [navigate]);
  // Cargar todas las notas
  useEffect(() => {
    fetch("http://localhost:8080/notes", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setNotes(data));
  }, []);
  //Updating on editing a note

  const handleCreateNote = () => {
    fetch("http://localhost:8080/notes", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        title: "Nueva nota",
        body: "",
        isVoiceNote: false,
        isPublic: false,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setNotes([...notes, data]);
        setSelectedNote(data);
      });
  };

  const handleSelectNote = (id) => {
    setSelectedNote(notes.find((note) => note.id === id));
  };

  const setUpdateNote = (updatedNote) => {
    setSelectedNote(updatedNote);
    setNotes(
      notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    );
  };

  useEffect(() => {
    handleUpdateNoteDebounced(selectedNote);
  }, [selectedNote]);

  const handleDeleteNote = (id) => {
    fetch(`http://localhost:8080/notes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then(() => {
      setNotes(notes.filter((note) => note.id !== id));
      setSelectedNote(null);
    });

    /*Buscador de notas por titulo */
  };

  return (
    <div className="note-app">
      <div className="note-list">
        <button onClick={handleCreateNote} className="create-note-button">
          Create Note
        </button>
        {/* Buscar nota por nombre */}

        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => handleSelectNote(note.id)}
            className={`note-item ${
              selectedNote && selectedNote.id === note.id ? "selected" : ""
            }`}
          >
            {note.title}
          </div>
        ))}
      </div>
      <div className="note-editor">
        {selectedNote ? (
          <>
            <input
              type="text"
              onChange={(e) =>
                setUpdateNote({
                  ...selectedNote,
                  title: e.target.value,
                  content: selectedNote.content,
                })
              }
              value={selectedNote.title}
            />

            <textarea
              value={selectedNote.body}
              placeholder={selectedNote.body}
              onChange={(e) =>
                setUpdateNote({
                  ...selectedNote,
                  title: selectedNote.title,
                  body: e.target.value,
                })
              }
            />
            <div className="note-editor-buttons">
              {selectedNote.isPublic ? (
                <button
                  className="public-button"
                  onClick={() =>
                    setUpdateNote({ ...selectedNote, isPublic: false })
                  }
                >
                  Hacer privada
                </button>
              ) : (
                <button
                  className="private-button"
                  onClick={() =>
                    setUpdateNote({ ...selectedNote, isPublic: true })
                  }
                >
                  Hacer pública
                </button>
              )}
            </div>

            <button
              onClick={() => handleDeleteNote(selectedNote.id)}
              className="delete-note-button"
            >
              Delete Note
            </button>
          </>
        ) : (
          <p>Please select a note to edit</p>
        )}
      </div>
      <script
        src="https://kit.fontawesome.com/ab247f2890.js"
        crossorigin="anonymous"
      ></script>
    </div>
  );
}

export default Notes;
