import { ToastContainer } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import MermaidEditor from "./pages/MermaidEditor";

function App() {
  return (
    <div className="App" style={{ height: '100vh', overflow: 'hidden' }}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <MermaidEditor />
    </div>
  );
}

export default App;
