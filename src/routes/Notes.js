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
  const [audioUrl, setAudioUrl] = useState([]);
  const [search, setSearch] = useState("");
  const [noteType, setNoteType] = useState("all");
  const [orderBy, setOrderBy] = useState("all");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const startRecording = () => {
    console.log("starting audio recording on note" + selectedNote.id);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();

      let chunks = [];
      mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
        chunks.push(event.data);
      });
      mediaRecorderRef.current.addEventListener("stop", () => {
        console.log("starting audio recording");
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        uploadAudio(audioBlob, selectedNote.id).then((audioName) => {
          setUris([...uris, audioName.uri]);
        });
        chunks = [];
      });

      setIsRecording(true);
    });
  };

  const uploadAudio = async (audioBlob, noteId) => {
    console.log("uploading audio");
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
      const promises = uris.map(async (uri) => {
        const res = await fetch(`http://localhost:8080${uri}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            Accept: "application/octet-stream",
          },
        });
        const body = await res.blob();
        return { contentType: res.headers.get("Content-Type"), body };
      });

      try {
        const urls = await Promise.all(promises);
        setAudioUrl(
          urls
            .filter((url) => url.contentType.startsWith("audio/"))
            .map((url) => URL.createObjectURL(url.body))
        );
        setImageUrl(
          urls
            .filter((url) => url.contentType.startsWith("image/"))
            .map((url) => URL.createObjectURL(url.body))
        );
      } catch (error) {
        console.error(error);
      }
    };

    fetchImages();
  }, [uris]);

  /*Useeffect tu update searched notes */

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  return (
    <div className="note-app">
      <div className="note-list">
        <button onClick={handleCreateNote} className="create-note-button">
          Create Note
        </button>
        {/* Buscar nota por nombre */}

        <form>
          <input type="text" placeholder={search} onChange={handleSearch} />
          Note type: <br />
          <select
            name="noteType"
            id="noteType"
            onChange={(e) => setNoteType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="text">Text</option>
            <option value="voice">Voice</option>
          </select>
          Order by: <br />
          <select
            name="orderBy"
            id="orderBy"
            onChange={(e) => setOrderBy(e.target.value)}
          >
            <option value="all">All</option>
            <option value="title">Title</option>
            <option value="created">Created</option>
            <option value="modified">Modified</option>
          </select>
        </form>
        {/*-------------------------*/}
        {notes
          .filter(
            (note) =>
              (note.title.toLowerCase().includes(search.toLowerCase()) ||
                note.body.toLowerCase().includes(search.toLowerCase())) &&
              (noteType === "all" ||
                (note.isVoiceNote === true && noteType === "voice") ||
                (note.isVoiceNote === false && noteType === "text"))
          )
          .sort((a, b) => {
            if (orderBy === "title") {
              return a.title.localeCompare(b.title);
            } else if (orderBy === "created") {
              return a.createdAt.localeCompare(b.createdAt);
            } else if (orderBy === "modified") {
              return a.modifiedAt.localeCompare(b.modifiedAt);
            } else {
              return 0;
            }
          })
          .map((note) => (
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
            </div>
            <h2 style={{ textAlign: "center" }}>Audios of the note</h2>
            <div style={{ display: "flex" }}>
              {audioUrl &&
                audioUrl.length > 0 &&
                audioUrl.map((audioUrl) => (
                  <audio
                    src={audioUrl}
                    controls
                    key={audioUrl}
                    className="audio"
                  />
                ))}
            </div>
            <br />

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
