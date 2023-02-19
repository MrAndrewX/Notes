import React, { useState, useEffect, useRef } from "react";
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

  const [isRecording, setIsRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const mediaRecorderRef = useRef(null);

  const startRecording = (noteId) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();

      let chunks = [];
      mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
        chunks.push(event.data);
      });
      mediaRecorderRef.current.addEventListener("stop", () => {
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        uploadAudio(audioBlob, noteId).then((audioName) => {
          setBlob(audioBlob);
          setUris([...uris, audioName]);
        });
        chunks = [];
      });

      setIsRecording(true);
    });
  };

  const uploadAudio = async (audioBlob, noteId) => {
    const audio = new File([audioBlob], "audio.wav", {
      type: "audio/wav",
    });
    const fromData = new FormData();
    fromData.append("file", audio);

    try {
      const response = await fetch(
        `http://localhost:8080/notes/${noteId}/files`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },

          body: fromData,
        }
      );

      if (!response.ok) {
        throw new Error(`Error al subir el audio: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(error);
    }
  };
  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    uploadAudio(blob, selectedNote.id)
      .then((audioName) => {
        console.log(`Audio uploaded successfully with name ${audioName}`);
      })
      .catch((error) => {
        console.error("Error uploading audio", error);
      });
    setUpdateNote({ ...selectedNote, isVoiceNote: true });
  };

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

  const handleDeleteNote = async (id) => {
    try {
      // Primero borra todos los archivos
      await Promise.all(
        uris.map(async (uri) => {
          const response = await fetch(`http://localhost:8080${uri}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          // Si el servidor devuelve un error, lanza una excepción para detener la ejecución
          if (!response.ok) {
            throw new Error(`Failed to delete file ${uri}`);
          }
        })
      );

      // Luego borra la nota
      const response = await fetch(`http://localhost:8080/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== id));
        setSelectedNote(null);
      } else {
        throw new Error(`Failed to delete note ${id}`);
      }
    } catch (error) {
      console.error(error);
    }
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

  /*Cada vez que se suba una foto actualizar la pagina para que la foto se vea */
  useEffect(() => {
    if (selectedNote) {
      getUrisOFFiles(selectedNote.id).then((uris) => {
        setUris(uris);
      });
    }
  }, [selectedNote]);

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
            <div class="fechas">
              <span class="titulo">Create at: </span>
              <span id="create">{selectedNote.createdAt}</span>
              <br />
              <span class="titulo">Modified at: </span>
              <span id="modified">{selectedNote.modifiedAt}</span>
            </div>

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
            <p>
              (Debug )Is voice note: {selectedNote.isVoiceNote ? "Yes" : "No"}
            </p>
            {/* Upload image */}
            <form onSubmit={handleFileSubmit}>
              <label htmlFor="fileInput">File: </label>
              <br />
              <input
                id="fileInput"
                required
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files[0])}
              />
              <br />
              <button type="submit">Upload Image</button>
            </form>
            <div>
              <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? "Stop recording" : "Start recording"}
              </button>
              {blob ? <audio controls src={URL.createObjectURL(blob)} /> : null}
            </div>

            <button
              onClick={() => handleDeleteNote(selectedNote.id)}
              className="delete-note-button"
            >
              Delete Note
            </button>
            <br />

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
