import { Link } from "react-router-dom";
import "../homepage.css";

export default function Homepage() {
  return (
    <div id="body">
      <header>
        <h1>Bienvenido a Mi Aplicación</h1>
      </header>
      <main>
        <section id="landing-page">
          <p>
            En esta aplicación puedes llevar un control de tus tareas y notas.
          </p>
          <Link to="/login" id="login-button">
            Login
          </Link>
        </section>
      </main>
    </div>
  );
}
