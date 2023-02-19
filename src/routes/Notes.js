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
  const [file, setFile] = useState(null);
  const [uris, setUris] = useState([]);
  const [imageUrl, setImageUrl] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (selectedNote) {
      getUrisOFFiles(selectedNote.id).then((uris) => setUris(uris));
    }
  }, [selectedNote]);

  function getUrisOFFiles(id) {
    return fetch(`http://localhost:8080/notes/${id}/files`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        Accept: "application/json",
      },
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        return data.map((file) => file.uri);
      });
  }
  const uploadFile = (file, selectedNote) => {
    const fromData = new FormData();
    fromData.append("file", file);
    const response = fetch(
      `http://localhost:8080/notes/${selectedNote.id}/files`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: fromData,
      }
    );
    return response.json();
  };

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

  const handleDeleteNote = (id, uris) => {
    /*/notes/{noteId}/files/{fileId} */
    uris.forEach((uri) => {
      fetch(`http://localhost:8080${uri}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    });

    fetch(`http://localhost:8080/notes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then(() => {
      setNotes(notes.filter((note) => note.id !== id));
      setSelectedNote(null);
    });
  };

  const handleFileSubmit = (e) => {
    e.preventDefault();
    if (file) {
      uploadFile(file, selectedNote);
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      const imagePromises = uris.map((uri) => {
        return fetch(`http://localhost:8080${uri}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            Accept: "application/octet-stream",
          },
        })
          .then((res) => res.blob())
          .then((blob) => URL.createObjectURL(blob))
          .catch((error) => console.error(error));
      });

      try {
        const urls = await Promise.all(imagePromises);
        setImageUrl(urls);
      } catch (error) {
        console.error(error);
      }
    };

    fetchImages();
  }, [uris]);

  useEffect(() => {
    if (selectedNote) {
      getUrisOFFiles(selectedNote.id).then((uris) => {
        setUris(uris);
      });
    }
  }, [selectedNote]);

  const filteredNotes = notes.filter((note) => {
    if (filter === "text") {
      return !note.isVoiceNote;
    } else if (filter === "voice") {
      return note.isVoiceNote;
    } else {
      return true;
    }
  });

  const handleSearch = (e) => {
    const search = e.target.value;
    const filteredNotes = notes.filter((note) => {
      return note.title.toLowerCase().includes(search.toLowerCase());
    });
    setNotes(filteredNotes);
  };

  return (
    <div className="note-app">
      <div className="note-list">
        <button onClick={handleCreateNote} className="create-note-button">
          Create Note
        </button>
        {/* Buscar nota por nombre */}
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todas las notas</option>
          <option value="text">Notas de texto</option>
          <option value="voice">Notas de voz</option>
        </select>
        {filter === "text" && (
          <input
            type="text"
            placeholder="Buscar nota"
            onChange={handleSearch}
          />
        )}

        {filteredNotes.map((note) => (
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
            {/* Upload image */}
            <form onSubmit={handleFileSubmit}>
              <label htmlFor="fileInput">File: </label>
              <br />
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files[0])}
              />
              <br />
              <button type="submit">Upload Image</button>
            </form>

            <button
              onClick={() => handleDeleteNote(selectedNote.id, uris)}
              className="delete-note-button"
            >
              Delete Note
            </button>

            <h1 style={{ textAlign: "center" }}>Images of the note</h1>

            <div style={{ display: "flex" }}>
              {imageUrl &&
                imageUrl.map((imageUrl) => (
                  <img
                    src={imageUrl}
                    key={imageUrl}
                    alt={imageUrl}
                    style={{
                      width: "200px",
                      height: "200px",
                      objectFit: "cover",
                      margin: "10px",
                      borderRadius: "10px",
                      border: "1px solid black",
                    }}
                  />
                ))}
            </div>
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
