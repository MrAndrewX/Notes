import { Link, Outlet } from "react-router-dom";
import "../root.css";

export default function Root() {
  return (
    <>
      {/* Si token existe en localstorage solo mostrar Homepage y */}

      <nav>
        <ul>
          <li>
            <Link to="/">Homepage</Link>
          </li>
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/notes">Notes</Link>
          </li>
          <li>
            <Link to="/signup">Register</Link>
          </li>
          <li>
            <Link to="/login" onClick={() => localStorage.clear()}>
              Logout
            </Link>
          </li>
        </ul>
      </nav>
      <Outlet />
    </>
  );
}
